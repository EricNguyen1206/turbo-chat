import { RedisService } from './redis.service';

import { logger } from '@/utils/logger';

/**
 * PresenceService
 * 
 * Manages user online/offline status with heartbeat-based TTL.
 */
export class PresenceService {

  constructor(
    private redisService: RedisService
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
   * Handle user connection - set online
   */
  async handleUserConnect(userId: string): Promise<void> {
    try {
      // Set user online in Redis
      await this.redisService.setUserOnline(userId);
      logger.info('User came online', { userId });
    } catch (error) {
      logger.error('User connect error:', error);
      throw error;
    }
  }

  /**
   * Handle user disconnection - set offline
   */
  async handleUserDisconnect(userId: string): Promise<void> {
    try {
      // Set user offline in Redis
      await this.redisService.setUserOffline(userId);

      logger.info('User went offline', { userId });
    } catch (error) {
      logger.error('User disconnect error:', error);
      throw error;
    }
  }
}
