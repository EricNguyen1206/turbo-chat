import { Socket } from 'socket.io';
import { RedisService } from './redis.service';
import { MessageService } from './message.service';
import { ConversationService } from './conversation.service';
import { Participant } from '@/models/Participant';
import {
  SocketEvent,
  MessageDto,
  createJoinedConversationPayload,
  createLeftConversationPayload,
  createMessageDto,
  createUserJoinedPayload,
  createUserLeftPayload,
} from '@raven/types';
import { logger } from '@/utils/logger';

/**
 * WebSocketService
 * 
 * Centralized service for managing WebSocket connections, rooms, and real-time messaging.
 * Organized into clear sections: Connection Management, Room Management, Broadcasting, and Business Logic.
 */
export class WebSocketService {
  // ============================================================================
  // Properties
  // ============================================================================

  private clients = new Map<string, Socket>(); // userId -> Socket
  private rooms = new Map<string, Set<string>>(); // conversationId -> Set<userId>

  // ============================================================================
  // Constructor
  // ============================================================================

  constructor(
    private redisService: RedisService,
    private messageService: MessageService,
    private conversationService: ConversationService
  ) {
    logger.info('WebSocketService initialized');
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Register a new client connection
   * Handles reconnection by disconnecting old socket if exists
   */
  async registerClient(userId: string, socket: Socket): Promise<void> {
    try {
      // Handle reconnection - disconnect old socket if user reconnects with new socket
      const existingSocket = this.clients.get(userId);
      if (existingSocket && existingSocket.id !== socket.id) {
        logger.warn('User reconnecting, disconnecting old socket', {
          userId,
          oldSocketId: existingSocket.id,
          newSocketId: socket.id,
        });
        existingSocket.disconnect(true);
      }

      // Store new connection
      this.clients.set(userId, socket);

      // Set user online in Redis
      await this.redisService.setUserOnline(userId);

      logger.info('Client registered', { userId, socketId: socket.id });
    } catch (error) {
      logger.error('Register client error:', error);
      throw error;
    }
  }

  /**
   * Unregister a client connection
   * Auto-leaves all rooms before removing
   */
  async unregisterClient(userId: string): Promise<void> {
    try {
      // Auto-leave all rooms
      const userRooms = this.getUserRooms(userId);
      await Promise.all(
        userRooms.map(roomId => this.leaveRoom(userId, roomId))
      );

      // Remove from clients map
      this.clients.delete(userId);

      // Set user offline in Redis
      await this.redisService.setUserOffline(userId);

      logger.info('Client unregistered', { userId });
    } catch (error) {
      logger.error('Unregister client error:', error);
      throw error;
    }
  }

  /**
   * Get socket instance for a user
   */
  getSocket(userId: string): Socket | null {
    return this.clients.get(userId) || null;
  }

  /**
   * Check if user is currently online
   */
  isOnline(userId: string): boolean {
    return this.clients.has(userId);
  }

  /**
   * Get list of all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  /**
   * Join a conversation room
   * Validates conversation exists before joining
   */
  async joinRoom(userId: string, conversationId: string): Promise<void> {
    try {
      // Validate conversation exists
      const conversation = await this.conversationService.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get or create room
      if (!this.rooms.has(conversationId)) {
        this.rooms.set(conversationId, new Set());
      }

      const room = this.rooms.get(conversationId)!;

      // Check if already in room
      if (room.has(userId)) {
        return;
      }

      // Add user to room
      room.add(userId);

      // Join Socket.IO room for efficient broadcasting
      const socket = this.getSocket(userId);
      if (socket) {
        socket.join(conversationId);
      }

      // Persist to Redis
      await this.redisService.joinConversation(userId, conversationId);

      logger.info('User joined room', { userId, conversationId, memberCount: room.size });
    } catch (error) {
      logger.error('Join room error:', error);
      throw error;
    }
  }

  /**
   * Leave a conversation room
   * Cleans up empty rooms automatically
   */
  async leaveRoom(userId: string, conversationId: string): Promise<void> {
    try {
      const room = this.rooms.get(conversationId);
      if (!room) {
        return;
      }

      // Remove user from room
      room.delete(userId);

      // Cleanup empty rooms
      if (room.size === 0) {
        this.rooms.delete(conversationId);
      }

      // Leave Socket.IO room
      const socket = this.getSocket(userId);
      if (socket) {
        socket.leave(conversationId);
      }

      // Persist to Redis
      await this.redisService.leaveConversation(userId, conversationId);
    } catch (error) {
      logger.error('Leave room error:', error);
      throw error;
    }
  }

  /**
   * Get list of users in a conversation room
   */
  getRoomMembers(conversationId: string): string[] {
    const room = this.rooms.get(conversationId);
    return room ? Array.from(room) : [];
  }

  /**
   * Get list of rooms a user has joined
   */
  getUserRooms(userId: string): string[] {
    const rooms: string[] = [];
    for (const [roomId, members] of this.rooms.entries()) {
      if (members.has(userId)) {
        rooms.push(roomId);
      }
    }
    return rooms;
  }

  /**
   * Get count of members in a room
   */
  getRoomMemberCount(conversationId: string): number {
    const room = this.rooms.get(conversationId);
    return room ? room.size : 0;
  }

  /**
   * Check if user is in a specific room
   */
  isUserInRoom(userId: string, conversationId: string): boolean {
    const room = this.rooms.get(conversationId);
    return room ? room.has(userId) : false;
  }

  // ============================================================================
  // BROADCASTING
  // ============================================================================

  /**
   * Broadcast event to all members in a conversation room
   * Optionally exclude sender
   */
  broadcastToRoom<T>(
    conversationId: string,
    event: SocketEvent,
    payload: T,
    excludeUserId?: string
  ): void {
    try {
      const room = this.rooms.get(conversationId);
      if (!room || room.size === 0) {
        logger.warn('No members in room', { conversationId, event });
        return;
      }

      let sentCount = 0;

      for (const userId of room) {
        // Skip excluded user
        if (excludeUserId && userId === excludeUserId) {
          continue;
        }

        const socket = this.getSocket(userId);
        if (socket) {
          socket.emit(event as any, payload);
          sentCount++;
        }
      }

      logger.debug('Broadcasted to room', {
        conversationId,
        event,
        totalMembers: room.size,
        sentCount,
      });
    } catch (error) {
      logger.error('Broadcast to room error:', error);
      throw error;
    }
  }

  /**
   * Emit event to a specific user
   */
  emitToUser<T>(userId: string, event: SocketEvent, payload: T): void {
    const socket = this.getSocket(userId);
    if (socket) {
      socket.emit(event as any, payload);
    } else {
      logger.warn('Cannot emit to user - not connected', { userId, event });
    }
  }

  // ============================================================================
  // BUSINESS LOGIC
  // ============================================================================

  /**
   * Handle sending a message in a conversation
   * Validates content, saves to DB, and broadcasts to room
   */
  async handleSendMessage(
    senderId: string,
    senderName: string,
    conversationId: string,
    text?: string | null,
    url?: string | null,
    fileName?: string | null
  ): Promise<void> {
    try {
      // Validate message content
      if (!text && !url && !fileName) {
        throw new Error('Message must have text, url, or fileName');
      }

      // Prepare message data
      const messageData: {
        conversationId: string;
        text?: string;
        url?: string;
        fileName?: string;
      } = {
        conversationId,
      };

      if (text) messageData.text = text;
      if (url) messageData.url = url;
      if (fileName) messageData.fileName = fileName;

      // Save message to database
      const savedMessage = await this.messageService.createMessage(senderId, messageData);

      // Create message DTO for broadcasting (using centralized types)
      const messageDto: MessageDto = createMessageDto(
        savedMessage.id,
        conversationId,
        senderId,
        senderName,
        savedMessage.senderAvatar,
        text,
        url,
        fileName,
        savedMessage.createdAt
      );

      // Increment unread count for all participants except sender
      await Participant.updateMany(
        {
          conversationId,
          userId: { $ne: senderId },
          deletedAt: null
        },
        {
          $inc: { unreadCount: 1 }
        }
      );

      // Get all participants to notify (even if not currently in the room)
      const participants = await Participant.find({
        conversationId,
        deletedAt: null
      }).select('userId');

      // Broadcast to all online participants
      for (const participant of participants) {
        const userId = participant.userId.toString();

        // Skip emitting back to sender in this loop if handled elsewhere, 
        // OR emit to everyone including sender for consistency (sender usually handles optimistic UI).
        // Let's emit to everyone online so they get the event.

        if (this.isOnline(userId)) {
          this.emitToUser(userId, SocketEvent.NEW_MESSAGE, messageDto);
        }
      }

      logger.info('Message sent and broadcasted', {
        conversationId,
        senderId,
        messageId: savedMessage.id,
        recipientCount: participants.length
      });
    } catch (error) {
      logger.error('Handle message error:', error);
      throw error;
    }
  }

  /**
   * Handle user joining a conversation
   * Validates, joins room, and notifies others
   */
  async handleJoinConversation(
    userId: string,
    username: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Join the room
      await this.joinRoom(userId, conversationId);

      // Emit success to user (using centralized payload creator)
      const joinedPayload = createJoinedConversationPayload(conversationId, userId, username);
      this.emitToUser(userId, SocketEvent.JOINED_CONVERSATION, joinedPayload);

      // Notify other participants
      const userJoinedPayload = createUserJoinedPayload(conversationId, userId, username);
      this.broadcastToRoom(conversationId, SocketEvent.USER_JOINED, userJoinedPayload, userId);

      logger.info('User joined conversation', { userId, conversationId });
    } catch (error) {
      logger.error('Handle join conversation error:', error);
      throw error;
    }
  }

  /**
   * Handle user leaving a conversation
   * Leaves room and notifies others
   */
  async handleLeaveConversation(
    userId: string,
    username: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Leave the room
      await this.leaveRoom(userId, conversationId);

      // Emit success to user
      const leftPayload = createLeftConversationPayload(conversationId, userId, username);
      this.emitToUser(userId, SocketEvent.LEFT_CONVERSATION, leftPayload);

      // Notify other participants
      const userLeftPayload = createUserLeftPayload(conversationId, userId, username);
      this.broadcastToRoom(conversationId, SocketEvent.USER_LEFT, userLeftPayload, userId);

      logger.info('User left conversation', { userId, conversationId });
    } catch (error) {
      logger.error('Handle leave conversation error:', error);
      throw error;
    }
  }
}
