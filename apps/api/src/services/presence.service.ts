import { RedisService } from './redis.service';
import { FriendService } from './friend.service';
import { WebSocketService } from './websocket.service';
import { SocketEvent, FriendStatusChangedPayload } from '@turbo-chat/types';
import { logger } from '@/utils/logger';

/**
 * PresenceService
 * 
 * Manages user online/offline status with heartbeat-based TTL.
 * Handles status broadcasts to online friends only.
 */
export class PresenceService {
  private static readonly BATCH_SIZE = 100;

  constructor(
    private redisService: RedisService,
    private friendService: FriendService,
    private webSocketService: WebSocketService
  ) {
    logger.info('PresenceService initialized');
  }

  /**
   * Handle heartbeat from client - refresh TTL
   */
  async handleHeartbeat(userId: string): Promise<void> {
    try {
      await this.redisService.refreshUserOnline(userId);
    } catch (error) {
      logger.error('Heartbeat error:', error);
      throw error;
    }
  }

  /**
   * Handle user connection - set online and broadcast to friends
   */
  async handleUserConnect(userId: string): Promise<void> {
    try {
      // Check if user was already online (reconnection)
      // Check if user was already online (reconnection)
      // const wasOnline = await this.redisService.isUserOnline(userId); // Skipped optimization to force sync

      // Set user online in Redis
      await this.redisService.setUserOnline(userId);

      // ALWAYS broadcast status change on connect to ensure clients are in sync
      // This fixes the issue where a client might miss the "online" event or think the user is offline
      await this.broadcastStatusChange(userId, 'online');
      logger.info('User came online (broadcast forced)', { userId });
    } catch (error) {
      logger.error('User connect error:', error);
      throw error;
    }
  }

  /**
   * Handle user disconnection - set offline and broadcast to friends
   */
  async handleUserDisconnect(userId: string): Promise<void> {
    try {
      // Set user offline in Redis
      await this.redisService.setUserOffline(userId);

      // Broadcast status change to online friends
      await this.broadcastStatusChange(userId, 'offline');

      logger.info('User went offline', { userId });
    } catch (error) {
      logger.error('User disconnect error:', error);
      throw error;
    }
  }

  /**
   * Helper to get all relevant user IDs (friends + conversation participants)
   * This ensures users in DMs see each other's status even if not friends.
   */
  private async getRelevantUserIds(userId: string): Promise<string[]> {
    try {
      // 1. Get Friends
      const friends = await this.friendService.getFriends(userId);
      const friendIds = friends
        .filter(f => f.friend?.id)
        .map(f => f.friend!.id);

      // 2. Get Conversation Participants (Lazy import to avoid circular dep if any)
      const { Participant } = await import("@/models/Participant");

      // Find conversations this user is in
      const userParticipations = await Participant.find({ userId, deletedAt: null });
      const conversationIds = userParticipations.map(p => p.conversationId);

      if (conversationIds.length === 0) {
        return friendIds;
      }

      // Find all participants of these conversations
      // Optimization: We could filter for only DIRECT conversations if we only care about DM status, 
      // but typically you want to know status of group members too. 
      // Let's include all for now, or maybe just Direct if performance is concern.
      // Given the requirement "Sidebar DM List", this implies Direct.
      // But typically group chats also show online indicators vs offline.

      const otherParticipants = await Participant.find({
        conversationId: { $in: conversationIds },
        userId: { $ne: userId },
        deletedAt: null
      });

      const participantIds = otherParticipants.map(p => p.userId.toString());

      // Combine and dedup
      const allIds = new Set([...friendIds, ...participantIds]);
      return Array.from(allIds);

    } catch (error) {
      logger.error('Get relevant user ids error:', error);
      // Fallback to empty if error, to prevent breaking flow
      return [];
    }
  }

  /**
   * Broadcast status change to online friends AND conversation partners
   * Uses batching to handle large lists efficiently
   */
  private async broadcastStatusChange(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      // Get all relevant users (Friends + DM partners)
      const targetUserIds = await this.getRelevantUserIds(userId);

      if (targetUserIds.length === 0) {
        return;
      }

      // Check which targets are currently online
      const onlineStatuses = await this.redisService.getMultipleUsersOnlineStatus(targetUserIds);
      const onlineTargetIds = targetUserIds.filter(id => onlineStatuses[id]);

      if (onlineTargetIds.length === 0) {
        return;
      }

      // Create the payload
      const payload: FriendStatusChangedPayload = {
        user_id: userId,
        status,
        timestamp: Date.now(),
      };

      // Batch broadcasts
      for (let i = 0; i < onlineTargetIds.length; i += PresenceService.BATCH_SIZE) {
        const batch = onlineTargetIds.slice(i, i + PresenceService.BATCH_SIZE);

        await Promise.all(
          batch.map(targetId =>
            this.webSocketService.emitToUser(targetId, SocketEvent.FRIEND_STATUS_CHANGED, payload)
          )
        );

        if (i + PresenceService.BATCH_SIZE < onlineTargetIds.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      logger.info('Status change broadcasted', {
        userId,
        status,
        onlineTargetCount: onlineTargetIds.length,
        totalRelevantCount: targetUserIds.length,
      });
    } catch (error) {
      logger.error('Broadcast status change error:', error);
      throw error;
    }
  }

  /**
   * Get online status for all friends AND conversation partners of a user
   * Renaming logic but keeping method name compatible with controller
   */
  async getFriendsOnlineStatus(userId: string): Promise<Record<string, boolean>> {
    try {
      const targetUserIds = await this.getRelevantUserIds(userId);

      if (targetUserIds.length === 0) {
        return {};
      }

      // Get online status for all targets
      const statuses = await this.redisService.getMultipleUsersOnlineStatus(targetUserIds);
      return statuses;
    } catch (error) {
      logger.error('Get relevant users online status error:', error);
      throw error;
    }
  }
}
