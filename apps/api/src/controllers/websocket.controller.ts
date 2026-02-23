import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketService } from '@/services/websocket.service';
import { ConversationService } from '@/services/conversation.service';
import { MessageService } from '@/services/message.service';
import { RedisService } from '@/services/redis.service';
import { PresenceService } from '@/services/presence.service';

import { logger } from '@/utils/logger';
import {
  SocketEvent,
  JoinConversationPayload,
  LeaveConversationPayload,
  SendMessagePayload,
  HeartbeatPayload,
  createErrorPayload,
} from '@raven/types';
import { AuthenticatedSocket } from '@/middleware/socketAuth.middleware';

/**
 * WebSocketController
 * 
 * Handles Socket.IO connections and HTTP endpoints for WebSocket management.
 * Acts as a thin layer between Socket.IO and WebSocketService.
 */
export class WebSocketController {
  private wsService: WebSocketService;
  private presenceService: PresenceService;

  constructor(_io: SocketIOServer) {
    // Initialize services
    const conversationService = new ConversationService();
    const messageService = new MessageService();
    const redisService = new RedisService();

    // Initialize WebSocket service
    this.wsService = new WebSocketService(
      redisService,
      messageService,
      conversationService
    );

    // Initialize Presence service
    this.presenceService = new PresenceService(
      redisService
    );

    logger.info('WebSocketController initialized');
  }

  // ============================================================================
  // SOCKET.IO CONNECTION HANDLER
  // ============================================================================

  /**
   * Handle new Socket.IO connection
   * User is already authenticated by socketAuth middleware
   */
  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;
    const username = socket.username || 'Unknown';

    logger.info('New WebSocket connection', {
      socketId: socket.id,
      userId,
      username,
    });

    try {
      // Register connection
      await this.wsService.registerClient(userId, socket);

      // Handle presence (broadcast online status to friends)
      await this.presenceService.handleUserConnect(userId);

      // Setup event listeners
      this.setupEventListeners(socket);

      // Handle disconnect
      socket.on(SocketEvent.DISCONNECT, async (reason: string) => {
        await this.handleDisconnect(userId, reason);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', { userId, socketId: socket.id, error });
      });

    } catch (error) {
      logger.error('Connection setup failed', error);
      const errorPayload = createErrorPayload(
        'CONNECTION_FAILED',
        'Failed to establish connection',
        error instanceof Error ? error.message : String(error)
      );
      socket.emit(SocketEvent.ERROR, errorPayload);
      socket.disconnect();
    }
  }

  // ============================================================================
  // EVENT LISTENERS SETUP
  // ============================================================================

  /**
   * Setup all Socket.IO event listeners
   */
  private setupEventListeners(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const username = socket.username || 'Unknown';

    // Join conversation
    socket.on(SocketEvent.JOIN_CONVERSATION, async (payload: JoinConversationPayload) => {
      try {
        await this.wsService.handleJoinConversation(
          userId,
          username,
          payload.conversation_id
        );
      } catch (error) {
        this.emitError(socket, 'JOIN_FAILED', 'Failed to join conversation', error);
      }
    });

    // Leave conversation
    socket.on(SocketEvent.LEAVE_CONVERSATION, async (payload: LeaveConversationPayload) => {
      try {
        await this.wsService.handleLeaveConversation(
          userId,
          username,
          payload.conversation_id
        );
      } catch (error) {
        this.emitError(socket, 'LEAVE_FAILED', 'Failed to leave conversation', error);
      }
    });

    socket.on(SocketEvent.SEND_MESSAGE, async (payload: SendMessagePayload) => {
      try {
        await this.wsService.handleSendMessage(
          userId,
          username,
          payload.conversation_id,
          payload.text,
          payload.url,
          payload.fileName
        );
      } catch (error) {
        this.emitError(socket, 'SEND_MESSAGE_FAILED', 'Failed to send message', error);
      }
    });

    // Heartbeat event for presence
    socket.on(SocketEvent.HEARTBEAT, async (payload: HeartbeatPayload) => {
      try {
        await this.presenceService.handleHeartbeat(userId);
        logger.debug('Heartbeat received', { userId, clientTimestamp: payload.timestamp });
      } catch (error) {
        logger.error('Heartbeat error', { userId, error });
      }
    });
  }

  /**
   * Handle user disconnect
   */
  private async handleDisconnect(userId: string, reason: string): Promise<void> {
    try {
      // Handle presence (broadcast offline status to friends)
      await this.presenceService.handleUserDisconnect(userId);
      await this.wsService.unregisterClient(userId);
      logger.info('User disconnected', { userId, reason });
    } catch (error) {
      logger.error('Disconnect handling error', error);
    }
  }

  // ============================================================================
  // HTTP ENDPOINTS (Admin/Stats)
  // ============================================================================

  /**
   * GET /websocket/stats - Get WebSocket statistics
   */
  async getWebSocketStats(_req: Request, res: Response): Promise<void> {
    try {
      const onlineUsers = this.wsService.getOnlineUsers();

      res.status(200).json({
        success: true,
        data: {
          connectedUsers: onlineUsers.length,
          users: onlineUsers,
        },
      });
    } catch (error) {
      logger.error('Get WebSocket stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /websocket/conversations/:conversationId/participants - Get conversation participants
   */
  async getParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const participants = this.wsService.getRoomMembers(conversationId);
      const participantCount = this.wsService.getRoomMemberCount(conversationId);

      res.status(200).json({
        success: true,
        data: {
          conversationId,
          participants,
          participantCount,
        },
      });
    } catch (error) {
      logger.error('Get participants error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /websocket/conversations/:conversationId/broadcast - Broadcast message (admin only)
   */
  async broadcastToConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { message } = req.body;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      if (!message) {
        res.status(400).json({
          success: false,
          message: 'Message is required',
        });
        return;
      }

      // Broadcast admin message
      const adminMessagePayload = {
        id: Date.now().toString(),
        conversationId: conversationId,
        senderId: '0',
        senderName: 'System',
        text: message,
        createdAt: new Date().toISOString(),
      };

      this.wsService.broadcastToRoom(
        conversationId,
        SocketEvent.NEW_MESSAGE,
        adminMessagePayload
      );

      res.status(200).json({
        success: true,
        message: 'Message broadcasted successfully',
      });
    } catch (error) {
      logger.error('Broadcast to conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /websocket/users/online - Get list of online users
   */
  async getConnectedUsers(_req: Request, res: Response): Promise<void> {
    try {
      const connectedUsers = this.wsService.getOnlineUsers();

      res.status(200).json({
        success: true,
        data: {
          users: connectedUsers,
          count: connectedUsers.length,
        },
      });
    } catch (error) {
      logger.error('Get connected users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /websocket/users/:userId/disconnect - Disconnect user (admin only)
   */
  async disconnectUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      const connectedUsers = this.wsService.getOnlineUsers();

      if (!connectedUsers.includes(userId)) {
        res.status(404).json({
          success: false,
          message: 'User not connected',
        });
        return;
      }

      // Get socket and disconnect
      const socket = this.wsService.getSocket(userId);
      if (socket) {
        socket.disconnect(true);
        res.status(200).json({
          success: true,
          message: 'User disconnected successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User socket not found',
        });
      }
    } catch (error) {
      logger.error('Disconnect user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Emit error to socket
   */
  private emitError(
    socket: AuthenticatedSocket,
    code: string,
    message: string,
    error: any
  ): void {
    logger.error(`${code}:`, error);
    const errorPayload = createErrorPayload(
      code,
      message,
      error instanceof Error ? error.message : String(error)
    );
    socket.emit(SocketEvent.ERROR, errorPayload);
  }

  /**
   * Get WebSocketService instance (for external access if needed)
   */
  public getService(): WebSocketService {
    return this.wsService;
  }
}
