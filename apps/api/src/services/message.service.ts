import { Message } from "@/models/Message";
import { IUser } from "@/models/User";
import { MessageDto } from "@raven/types";
import { logger } from "@/utils/logger";

export class MessageService {
  // Private repository methods
  private async getConversationMessagesPrivate(
    conversationId: string,
    limit: number = 50,
    before?: string
  ): Promise<MessageDto[]> {
    try {
      const query: any = {
        conversationId,
        deletedAt: null,
      };

      if (before) {
        query._id = { $lt: before };
      }

      const messages = await Message.find(query)
        .populate<{ senderId: IUser }>("senderId")
        .sort({ createdAt: -1 })
        .limit(limit);

      return messages.map((message) => {
        const sender = message.senderId as unknown as IUser;
        return {
          id: message.id,
          conversationId: message.conversationId?.toString() ?? "",
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
      logger.error("Error getting conversation messages:", error);
      throw error;
    }
  }

  private async getDirectMessagesPrivate(
    userId: string,
    friendId: string,
    limit: number = 50,
    before?: string
  ): Promise<MessageDto[]> {
    try {
      const query: any = {
        $or: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        deletedAt: null,
      };

      if (before) {
        query._id = { $lt: before };
      }

      const messages = await Message.find(query)
        .populate<{ senderId: IUser }>("senderId")
        .sort({ createdAt: -1 })
        .limit(limit);

      return messages.map((message) => {
        const sender = message.senderId as unknown as IUser;
        return {
          id: message.id,
          conversationId: message.conversationId?.toString() ?? "",
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
      logger.error("Error getting direct messages:", error);
      throw error;
    }
  }

  private async createMessagePrivate(data: {
    senderId: string;
    conversationId?: string;
    text?: string;
    url?: string;
    fileName?: string;
  }): Promise<MessageDto> {
    try {
      const message = new Message(data);
      const savedMessage = await message.save();

      // Reload with relations
      const messageWithRelations = await Message.findById(savedMessage._id).populate<{
        senderId: IUser;
      }>("senderId");

      if (!messageWithRelations) {
        throw new Error("Message not found after creation");
      }

      const sender = messageWithRelations.senderId as unknown as IUser;
      return {
        id: messageWithRelations.id,
        conversationId: messageWithRelations.conversationId?.toString() ?? "",
        senderId: sender.id,
        senderName: sender.username,
        senderAvatar: sender.avatar ?? "",
        text: messageWithRelations.text,
        url: messageWithRelations.url,
        fileName: messageWithRelations.fileName,
        createdAt: messageWithRelations.createdAt.toISOString(),
        updatedAt: messageWithRelations.updatedAt.toISOString(),
      } as MessageDto;
    } catch (error) {
      logger.error("Error creating message:", error);
      throw error;
    }
  }

  private async deleteMessagePrivate(messageId: string): Promise<void> {
    try {
      await Message.updateOne({ _id: messageId }, { deletedAt: new Date() });
    } catch (error) {
      logger.error("Error deleting message:", error);
      throw error;
    }
  }

  private async getMessageByIdPrivate(messageId: string): Promise<MessageDto | null> {
    try {
      const message = await Message.findOne({
        _id: messageId,
        deletedAt: null,
      }).populate<{ senderId: IUser }>("senderId");

      if (!message) {
        return null;
      }

      const sender = message.senderId as unknown as IUser;
      return {
        id: message.id,
        conversationId: message.conversationId?.toString() ?? "",
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
      logger.error("Error getting message by id:", error);
      throw error;
    }
  }

  // Public methods
  // Get conversation messages with pagination
  async getConversationMessages(
    conversationId: string,
    limit: number = 20,
    before?: string
  ): Promise<MessageDto[]> {
    try {
      return await this.getConversationMessagesPrivate(conversationId, limit, before);
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

      const messageData: {
        senderId: string;
        conversationId?: string;
        text?: string;
        url?: string;
        fileName?: string;
      } = {
        senderId,
      };

      if (data.conversationId !== undefined) {
        messageData.conversationId = data.conversationId;
      }
      if (data.text !== undefined) {
        messageData.text = data.text;
      }
      if (data.url !== undefined) {
        messageData.url = data.url;
      }
      if (data.fileName !== undefined) {
        messageData.fileName = data.fileName;
      }

      const messageResponse = await this.createMessagePrivate(messageData);

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

  // Get friend messages (direct messages between two users)
  async getFriendMessages(
    userId: string,
    friendId: string,
    limit: number = 50,
    before?: string
  ): Promise<MessageDto[]> {
    try {
      return await this.getDirectMessagesPrivate(userId, friendId, limit, before);
    } catch (error) {
      logger.error("Get friend messages error:", error);
      throw error;
    }
  }

  // Get message by ID
  async getMessageById(messageId: string): Promise<MessageDto | null> {
    try {
      return await this.getMessageByIdPrivate(messageId);
    } catch (error) {
      logger.error("Get message by ID error:", error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await this.deleteMessagePrivate(messageId);
      logger.info("Message deleted successfully", { messageId });
    } catch (error) {
      logger.error("Delete message error:", error);
      throw error;
    }
  }
}
