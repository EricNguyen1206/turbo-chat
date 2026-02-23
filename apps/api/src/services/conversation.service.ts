import { ConversationDetailDto, ConversationDto, ConversationType } from "@raven/types";
import { logger } from "@/utils/logger";
import { UpdateConversationRequestDto } from "@raven/validators";
import { prisma } from "@/lib/prisma";
import { Conversation } from "@prisma/client";

export class ConversationService {

  // Get conversation by ID
  async getConversationById(conversationId: string, reqUserId?: string): Promise<ConversationDetailDto | null> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          deletedAt: null,
        },
      });

      if (!conversation || (reqUserId && conversation.ownerId !== reqUserId)) {
        return null;
      }

      // Populate AI Profile info if available (to be implemented more fully in next tasks)
      // For now we map basic structure
      return {
        id: conversation.id,
        name: conversation.name,
        ...(conversation.avatar && { avatar: conversation.avatar }),
        type: conversation.type as ConversationType,
        ownerId: conversation.ownerId,
        createdAt: conversation.createdAt,
        members: [] // Pure AI chat has no human members other than owner, so we usually drop this
      };
    } catch (error) {
      logger.error("Get conversation by ID error:", error);
      throw error;
    }
  }

  // Alias for WebSocket service compatibility - returns Prisma document
  async findById(conversationId: string): Promise<Conversation | null> {
    try {
      return await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          deletedAt: null,
        },
      });
    } catch (error) {
      logger.error("Find conversation document error:", error);
      throw error;
    }
  }

  // Get all conversations for a user
  async getAllConversation(userId: string): Promise<{ direct: ConversationDto[]; group: ConversationDto[] }> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          ownerId: userId,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      });

      const direct: ConversationDto[] = [];
      const group: ConversationDto[] = [];

      for (const conversation of conversations) {
        const dto: ConversationDto = {
          id: conversation.id,
          name: conversation.name,
          ...(conversation.avatar && { avatar: conversation.avatar }),
          ownerId: conversation.ownerId,
          type: conversation.type as ConversationType,
          createdAt: conversation.createdAt,
          unreadCount: 0,
        };

        if (conversation.type === ConversationType.DIRECT) {
          direct.push(dto);
        } else {
          group.push(dto);
        }
      }

      return { direct, group };
    } catch (error) {
      logger.error("Get all conversations error:", error);
      throw error;
    }
  }

  // Create a new AI conversation
  async createConversation(
    name: string,
    ownerId: string,
    conversationType: ConversationType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userIds: string[] // Ignored for AI chatbot
  ): Promise<Conversation> {
    try {
      // Validate owner exists
      const owner = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) {
        throw new Error("Owner not found");
      }

      // Create conversation
      const savedConversation = await prisma.conversation.create({
        data: {
          name: name || "New AI Chat",
          ownerId,
          type: conversationType,
        },
      });

      logger.info("Conversation created successfully", {
        conversationId: savedConversation.id,
        ownerId,
        type: conversationType,
      });

      return savedConversation;
    } catch (error) {
      logger.error("Create conversation error:", error);
      throw error;
    }
  }

  // Update conversation name
  async updateConversation(
    conversationId: string,
    updateData: UpdateConversationRequestDto
  ): Promise<void> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          deletedAt: null,
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const dataToUpdate: Partial<Conversation> = {
        name: updateData.name,
      };

      if (updateData.avatar) {
        dataToUpdate.avatar = updateData.avatar;
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: dataToUpdate,
      });

      logger.info("Conversation updated successfully", { conversationId });
    } catch (error) {
      logger.error("Update conversation error:", error);
      throw error;
    }
  }

  // Delete conversation (only owner can delete)
  async deleteConversation(ownerId: string, conversationId: string): Promise<void> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          deletedAt: null,
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if the user is the owner of the conversation
      if (conversation.ownerId !== ownerId) {
        throw new Error("Only conversation owner can delete conversation");
      }

      // Soft delete
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { deletedAt: new Date() },
      });

      logger.info("Conversation deleted successfully", { conversationId, ownerId });
    } catch (error) {
      logger.error("Delete conversation error:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async markConversationAsRead(_userId: string, _conversationId: string): Promise<void> {
    // No-op for AI chatbot since read receipts don't really apply in the same way,
    // but kept for interface compatibility if needed later
  }
}
