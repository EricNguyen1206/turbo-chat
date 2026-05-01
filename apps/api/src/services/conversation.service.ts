import { Conversation, IConversation } from "@/models/Conversation";
import { User, IUser } from "@/models/User";
import { Participant, IParticipant } from "@/models/Participant";
import { UserService } from "@/services/user.service";
import { ConversationDetailDto, ConversationDto, ConversationType, UserDto } from "@turbo-chat/types";
import { logger } from "@/utils/logger";
import { UpdateConversationRequestDto } from "@turbo-chat/validators";

export class ConversationService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Helper to build direct conversation response
  private async buildConversationDto(
    conversation: IConversation,
    userId: string,
    participant?: IParticipant
  ): Promise<ConversationDto> {
    try {
      const friends = await this.userService.getFriendsByConversationId(conversation.id, userId);

      let usrEmail = "Unknown";
      let avatar = "";
      let otherUserId: string | undefined = undefined;

      // Filter out the current user to find the "other" participant
      const otherParticipants = friends.filter(f => f.id !== userId);
      const otherUser = otherParticipants[0];

      if (otherUser) {
        usrEmail = otherUser.email;
        avatar = otherUser.avatar || "";
        otherUserId = otherUser.id;
      }

      // Log if otherUserId is still missing for a Direct conversation
      if (!otherUserId && conversation.type === ConversationType.DIRECT) {
        logger.warn('buildConversationDto: otherUserId missing for DIRECT conversation', {
          conversationId: conversation.id,
          userId,
          friendsCount: friends.length,
          friendIds: friends.map(f => f.id)
        });
      }

      return {
        id: conversation.id,
        name: usrEmail,
        avatar,
        ownerId: conversation.ownerId.toString(),
        ...(otherUserId && { otherUserId }),
        type: conversation.type,
        createdAt: conversation.createdAt,
        unreadCount: participant?.unreadCount ?? 0,
        ...(participant?.lastReadAt && { lastReadAt: participant.lastReadAt }),
      };
    } catch (error) {
      logger.error("Build direct conversation response error:", error);
      throw error;
    }
  }

  // Private method to fetch the raw Mongoose document (for internal use with .save(), etc.)
  private async findConversationDocument(conversationId: string): Promise<IConversation | null> {
    try {
      return await Conversation.findOne({
        _id: conversationId,
        deletedAt: null,
      });
    } catch (error) {
      logger.error("Find conversation document error:", error);
      throw error;
    }
  }

  // Get conversation by ID with members (for API responses)
  async getConversationById(conversationId: string, reqUserId?: string): Promise<ConversationDetailDto | null> {
    try {
      const conversation = await this.findConversationDocument(conversationId);

      if (!conversation) {
        return null;
      }

      // Manually load participants with user data
      const participants = await Participant.find({
        conversationId: conversation._id,
        deletedAt: null,
      }).populate<{ userId: IUser }>("userId");

      // Convert to UserDto[] for the members field
      const members: UserDto[] = participants
        .filter((p) => p.userId)
        .map((p) => {
          const member: UserDto = {
            id: p.userId.id,
            username: p.userId.username,
            email: p.userId.email,
            createdAt: p.userId.createdAt,
          };
          if (p.userId.avatar) {
            member.avatar = p.userId.avatar;
          }
          return member;
        });

      let otherUserId: string | undefined;
      let conversationName = conversation.name;
      let conversationAvatar = conversation.avatar;

      // If reqUserId is provided, try to find the "other" user to set dynamic name/avatar/id
      if (reqUserId && conversation.type === ConversationType.DIRECT) {
        const otherMember = members.find(m => m.id !== reqUserId);
        if (otherMember) {
          otherUserId = otherMember.id;
          conversationName = otherMember.email;
          if (otherMember.avatar) {
            conversationAvatar = otherMember.avatar;
          }
        }
      }

      // Convert to plain object and attach members for proper JSON serialization
      return {
        id: conversation.id,
        name: conversationName,
        ...(conversationAvatar && { avatar: conversationAvatar }),
        type: conversation.type,
        ownerId: conversation.ownerId.toString(),
        ...(otherUserId && { otherUserId }),
        createdAt: conversation.createdAt,
        members,
      };
    } catch (error) {
      logger.error("Get conversation by ID error:", error);
      throw error;
    }
  }

  // Alias for WebSocket service compatibility - returns Mongoose document
  async findById(conversationId: string): Promise<IConversation | null> {
    return this.findConversationDocument(conversationId);
  }

  // Get all conversations for a user, separated by type (direct/group)
  async getAllConversation(userId: string): Promise<{
    direct: ConversationDto[];
    group: ConversationDto[];
  }> {
    try {
      const userParticipants = await Participant.find({
        userId,
        deletedAt: null,
      });
      const conversationIds = userParticipants.map((p) => p.conversationId);
      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        deletedAt: null,
      });

      const direct: ConversationDto[] = [];
      const group: ConversationDto[] = [];

      const participantMap = new Map(userParticipants.map(p => [p.conversationId.toString(), p]));

      for (const conversation of conversations) {
        const participant = participantMap.get(conversation.id);

        if (conversation.type === ConversationType.DIRECT) {
          const directResponse = await this.buildConversationDto(conversation, userId, participant);
          direct.push(directResponse);
        } else {
          group.push({
            id: conversation.id,
            name: conversation.name,
            ...(conversation.avatar && { avatar: conversation.avatar }),
            ownerId: conversation.ownerId.toString(),
            type: conversation.type,
            createdAt: conversation.createdAt,
            unreadCount: participant?.unreadCount ?? 0,
            ...(participant?.lastReadAt && { lastReadAt: participant.lastReadAt }),
          });
        }
      }

      return { direct, group };
    } catch (error) {
      logger.error("Get all conversations error:", error);
      throw error;
    }
  }

  // Create a new conversation with specified users
  async createConversation(
    name: string,
    ownerId: string,
    conversationType: ConversationType,
    userIds: string[]
  ): Promise<IConversation> {
    try {
      // Validate owner exists
      const owner = await User.findById(ownerId);
      if (!owner) {
        throw new Error("Owner not found");
      }

      // Validate all users exist
      const users: IUser[] = [];
      for (const userId of userIds) {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        users.push(user);
      }

      // Auto-generate name for direct messages if not provided
      let conversationName = name;
      if (
        conversationType === ConversationType.DIRECT &&
        (!name || name === "Direct Message with User")
      ) {
        // Find the other user (not the owner) to use their email as conversation name
        const otherUser = users.find((user) => user.id !== ownerId);
        if (otherUser) {
          conversationName = otherUser.email;
        }
      }

      // Create conversation
      const conversation = new Conversation({
        name: conversationName,
        ownerId,
        type: conversationType,
      });

      const savedConversation = await conversation.save();

      // Add all users to conversation
      for (const user of users) {
        await this.addUserToConversation(ownerId, savedConversation.id, user.id);
      }

      logger.info("Conversation created successfully", {
        conversationId: savedConversation.id,
        ownerId,
        type: conversationType,
        memberCount: users.length,
      });

      return savedConversation;
    } catch (error) {
      logger.error("Create conversation with users error:", error);
      throw error;
    }
  }

  // Update conversation name
  async updateConversation(
    conversationId: string,
    updateData: UpdateConversationRequestDto
  ): Promise<void> {
    try {
      const conversation = await this.findConversationDocument(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      conversation.name = updateData.name;
      if (updateData.avatar) {
        conversation.avatar = updateData.avatar;
      }
      await conversation.save();

      logger.info("Conversation updated successfully", { conversationId });
    } catch (error) {
      logger.error("Update conversation error:", error);
      throw error;
    }
  }

  // Delete conversation (only owner can delete)
  async deleteConversation(ownerId: string, conversationId: string): Promise<void> {
    try {
      const conversation = await this.findConversationDocument(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if the user is the owner of the conversation
      if (conversation.ownerId.toString() !== ownerId) {
        throw new Error("Only conversation owner can delete conversation");
      }

      // Soft delete
      await Conversation.updateOne({ _id: conversationId }, { deletedAt: new Date() });

      logger.info("Conversation deleted successfully", { conversationId, ownerId });
    } catch (error) {
      logger.error("Delete conversation error:", error);
      throw error;
    }
  }

  // Add user to conversation (only owner can add users)
  async addUserToConversation(
    ownerId: string,
    conversationId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      const conversation = await this.findConversationDocument(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if the user is the owner of the conversation
      if (conversation.ownerId.toString() !== ownerId) {
        throw new Error("Only conversation owner can add users");
      }

      // Check if target user exists
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new Error("Target user not found");
      }

      // Add user to conversation (upsert to handle duplicates gracefully)
      await Participant.findOneAndUpdate(
        { userId: targetUserId, conversationId },
        { userId: targetUserId, conversationId, joinedAt: new Date(), deletedAt: null },
        { upsert: true, new: true }
      );

      logger.info("User added to conversation", { conversationId, targetUserId, ownerId });
    } catch (error) {
      logger.error("Add user to conversation error:", error);
      throw error;
    }
  }

  // Remove user from conversation (only owner can remove users)
  async removeUserFromConversation(
    ownerId: string,
    conversationId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      const conversation = await this.findConversationDocument(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if the user is the owner of the conversation
      if (conversation.ownerId.toString() !== ownerId) {
        throw new Error("Only conversation owner can remove users");
      }

      // Check if target user exists
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new Error("Target user not found");
      }

      // Check if trying to remove the owner
      if (targetUserId === ownerId) {
        throw new Error("Cannot remove conversation owner");
      }

      // Soft delete participant
      await Participant.updateOne(
        { conversationId, userId: targetUserId },
        { deletedAt: new Date() }
      );

      logger.info("User removed from conversation", { conversationId, targetUserId, ownerId });
    } catch (error) {
      logger.error("Remove user from conversation error:", error);
      throw error;
    }
  }

  async leaveConversation(userId: string, conversationId: string) {
    const conversation = await this.findConversationDocument(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Soft delete participant
    await Participant.updateOne({ conversationId, userId }, { deletedAt: new Date() });
  }

  async markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      await Participant.updateOne(
        { conversationId, userId },
        {
          unreadCount: 0,
          lastReadAt: new Date(),
        }
      );
    } catch (error) {
      logger.error('Mark conversation as read error:', error);
      throw error;
    }
  }
}

