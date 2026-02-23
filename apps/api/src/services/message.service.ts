import { MessageDto } from "@raven/types";
import { logger } from "@/utils/logger";
import { encode } from "gpt-tokenizer";
import { prisma } from "@/lib/prisma";

export class MessageService {
  // Public methods

  // Get conversation messages with pagination
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
    before?: string
  ): Promise<MessageDto[]> {
    try {
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          deletedAt: null,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}), // Adjusted for Prisma Date cursor
        },
        include: {
          sender: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return messages.map((message) => {
        const sender = message.sender;
        return {
          id: message.id,
          conversationId: message.conversationId ?? "",
          senderId: sender.id,
          senderName: sender.username,
          senderAvatar: sender.avatar ?? "",
          text: message.text,
          url: message.url,
          fileName: message.fileName,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
        } as MessageDto;
      });
    } catch (error) {
      logger.error("Get conversation messages error:", error);
      throw error;
    }
  }

  // Create a new message
  async createMessage(
    senderId: string,
    data: {
      conversationId?: string;
      receiverId?: string;
      text?: string;
      url?: string;
      fileName?: string;
    }
  ): Promise<MessageDto> {
    try {
      // Validate that conversationId is provided (receiverId is deprecated/not used in Message model)
      if (!data.conversationId) {
        throw new Error("conversationId must be set");
      }

      // Validate that at least one content field is provided
      if (!data.text && !data.url && !data.fileName) {
        throw new Error("At least one content field (text, url, fileName) must be provided");
      }

      let tokenCount = 0;
      if (data.text) {
        tokenCount = encode(data.text).length;
      }

      const savedMessage = await prisma.message.create({
        data: {
          senderId,
          conversationId: data.conversationId,
          text: data.text ?? null,
          url: data.url ?? null,
          fileName: data.fileName ?? null,
          tokenCount,
        },
        include: {
          sender: true,
        },
      });

      if (data.conversationId && tokenCount > 0) {
        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { totalTokensUsed: { increment: tokenCount } },
        });
      }

      const sender = savedMessage.sender;
      const messageResponse: MessageDto = {
        id: savedMessage.id,
        conversationId: savedMessage.conversationId ?? "",
        senderId: sender.id,
        senderName: sender.username,
        senderAvatar: sender.avatar ?? "",
        text: savedMessage.text,
        url: savedMessage.url,
        fileName: savedMessage.fileName,
        createdAt: savedMessage.createdAt.toISOString(),
        updatedAt: savedMessage.updatedAt.toISOString(),
      };

      logger.info("Message created successfully", {
        messageId: messageResponse.id,
        senderId,
        conversationId: data.conversationId,
      });

      return messageResponse;
    } catch (error) {
      logger.error("Create message error:", error);
      throw error;
    }
  }

  // Get message by ID
  async getMessageById(messageId: string): Promise<MessageDto | null> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          deletedAt: null,
        },
        include: { sender: true },
      });

      if (!message) {
        return null;
      }

      const sender = message.sender;
      return {
        id: message.id,
        conversationId: message.conversationId ?? "",
        senderId: sender.id,
        senderName: sender.username,
        senderAvatar: sender.avatar ?? "",
        text: message.text,
        url: message.url,
        fileName: message.fileName,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
      } as MessageDto;
    } catch (error) {
      logger.error("Get message by ID error:", error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
      });
      logger.info("Message deleted successfully", { messageId });
    } catch (error) {
      logger.error("Delete message error:", error);
      throw error;
    }
  }
}
