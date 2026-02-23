/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Request, Response } from 'express';
import { ConversationService } from '@/services/conversation.service';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { ApiResponse, ConversationDetailDto, ConversationType, ConversationListDto } from '@raven/types';

export class ConversationController {
  private conversationService: ConversationService;

  constructor() {
    this.conversationService = new ConversationService();
  }

  // Get all conversations for a user
  async getUserConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      logger.info('Get user conversations', { userId });
      const conversations = await this.conversationService.getAllConversation(userId);
      const resData: ApiResponse<ConversationListDto> = {
        success: false,
        message: 'Not Fould',
        data: { direct: [], group: [] },
      };

      if (!conversations) {
        res.status(403).json(resData);
      }

      resData.success = true;
      resData.message = 'Success';
      resData.data = conversations!;

      res.status(200).json(resData);
    } catch (error) {
      logger.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Create a new conversation
  async createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, type, userIds } = req.body;
      logger.info('Create conversation', { userId, name, type, userIds });

      // Validate input
      if (!name || !type || !userIds || !Array.isArray(userIds)) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type, userIds',
        });
        return;
      }

      // Validate conversation type
      if (!Object.values(ConversationType).includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid conversation type',
        });
        return;
      }

      // Validate user count for direct messages
      if (type === ConversationType.DIRECT && userIds.length !== 1) {
        res.status(400).json({
          success: false,
          message: 'Direct message conversation must have exactly 1 other user',
        });
        return;
      }

      // Validate user count for group conversations
      if (type === ConversationType.GROUP && (userIds.length < 1 || userIds.length > 3)) {
        res.status(400).json({
          success: false,
          message: 'Group conversation must have 1-3 other users',
        });
        return;
      }

      // Ensure owner is included in userIds
      const allUserIds = [...userIds, userId];
      const uniqueUserIds = [...new Set(allUserIds)];

      const conversation = await this.conversationService.createConversation(
        name,
        userId,
        type,
        uniqueUserIds
      );

      res.status(201).json({
        success: true,
        data: {
          id: conversation.id,
          name: conversation.name,
          type: conversation.type,
          ownerId: conversation.ownerId,
        },
      });
    } catch (error) {
      logger.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // Get conversation by ID
  async getConversationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id; // Safely access user id, assuming auth middleware ran
      const conversationId = id;
      logger.info('Get conversation by ID', { conversationId, userId });

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
        return;
      }

      // Pass userId to help identify "otherUserId" in DMs
      const conversation = await this.conversationService.getConversationById(conversationId, userId);

      const resData: ApiResponse<ConversationDetailDto | null> = {
        success: false,
        message: 'Not Found',
        data: null,
      };

      if (!conversation) {
        // If not found, return 404 (was 403 in original code, but 404 is better for not found)
        // Original code used 403 for not found?? Keeping 404 as it is standard.
        // Wait, original code flow: if (!conversation) res.status(403).json(resData); 
        // Then it continues to res.status(200). That's a bug in original code too (missing return).
        res.status(404).json(resData);
        return;
      }

      resData.success = true;
      resData.message = 'Success';
      resData.data = conversation as unknown as ConversationDetailDto;

      res.status(200).json(resData);
    } catch (error) {
      logger.error('Get conversation by ID error:', error);
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  // Update conversation
  async updateConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user!.id;
      const conversationId = id;
      logger.info('Update conversation', { conversationId, name, userId });

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Conversation name is required',
        });
        return;
      }

      await this.conversationService.updateConversation(conversationId, name);

      res.status(200).json({
        success: true,
        message: 'Conversation updated successfully',
      });
    } catch (error) {
      logger.error('Update conversation error:', error);
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  // Delete conversation
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const conversationId = id;
      logger.info('Delete conversation', { conversationId, userId });

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
        return;
      }

      await this.conversationService.deleteConversation(userId, conversationId);

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      logger.error('Delete conversation error:', error);
      if (error instanceof Error && error.message === 'Conversation not found') {
        res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      } else if (
        error instanceof Error &&
        error.message === 'Only conversation owner can delete conversation'
      ) {
        res.status(403).json({
          success: false,
          message: 'Only conversation owner can delete conversation',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  // Mark conversation as read
  markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const conversationId = id;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
        return;
      }

      await this.conversationService.markConversationAsRead(userId, conversationId);

      res.status(200).json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      logger.error('Mark conversation as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}
