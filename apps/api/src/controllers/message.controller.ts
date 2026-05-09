import { Request, Response } from "express";
import { MessageService } from "@/services/message.service";
import { logger } from "@/utils/logger";

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  // Get conversation messages with pagination
  async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = "20", before } = req.query;
      const conversationId = id;

      logger.info("Get conversation messages", { conversationId, limit, before });

      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: "Invalid conversation ID",
        });
        return;
      }

      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          message: "Limit must be a number between 1 and 100",
        });
        return;
      }

      const beforeStr = before ? (before as string) : undefined;
      if (beforeStr && beforeStr.length !== 24) {
        res.status(400).json({
          success: false,
          message: "Before must be a valid MongoDB ObjectId",
        });
        return;
      }

      const messages = await this.messageService.getConversationMessages(conversationId, limitNum, beforeStr);

      res.status(200).json({
        success: true,
        data: messages,
        pagination: {
          limit: limitNum,
          before: beforeStr,
          hasMore: messages.length === limitNum,
        },
      });
    } catch (error) {
      logger.error("Get conversation messages error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Create a new message
  async createMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { conversationId, receiverId, text, url, fileName } = req.body;

      logger.info("Create message", { userId, conversationId, receiverId, text, url, fileName });

      // Validate input
      if (!conversationId && !receiverId) {
        res.status(400).json({
          success: false,
          message: "Either conversationId or receiverId must be provided",
        });
        return;
      }

      if (conversationId && receiverId) {
        res.status(400).json({
          success: false,
          message: "Cannot specify both conversationId and receiverId",
        });
        return;
      }

      if (!text && !url && !fileName) {
        res.status(400).json({
          success: false,
          message: "At least one content field (text, url, fileName) must be provided",
        });
        return;
      }

      const message = await this.messageService.createMessage(userId, {
        conversationId,
        receiverId,
        text,
        url,
        fileName,
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error("Create message error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get friend messages (direct messages)
  async getFriendMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { friendId } = req.params;

      if (!friendId) {
        res.status(400).json({
          success: false,
          message: "Friend ID is required",
        });
        return;
      }

      logger.info("Get friend messages", { userId, friendId });

      const messages = await this.messageService.getFriendMessages(userId, friendId);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error("Get friend messages error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get message by ID
  async getMessageById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const messageId = id;

      logger.info("Get message by ID", { messageId });

      if (!messageId) {
        res.status(400).json({
          success: false,
          message: "Invalid message ID",
        });
        return;
      }

      const message = await this.messageService.getMessageById(messageId);

      if (!message) {
        res.status(404).json({
          success: false,
          message: "Message not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error("Get message by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete message
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const { id } = req.params;
      const messageId = id;

      logger.info("Delete message", { messageId });

      if (!messageId) {
        res.status(400).json({
          success: false,
          message: "Invalid message ID",
        });
        return;
      }

      await this.messageService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      logger.error("Delete message error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
