import { FriendRequest, FriendRequestStatus } from "@/models/FriendRequest";
import { Friends } from "@/models/Friends";
import { User, IUser } from "@/models/User";
import { FriendDto, FriendRequestDto, FriendRequestsResponse, ConversationType } from "@turbo-chat/types";
import { logger } from "@/utils/logger";
import { ConversationService } from "@/services/conversation.service";

export class FriendService {
  /**
   * Send a friend request
   */
  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequestDto> {
    try {
      // Check if user is trying to send request to themselves
      if (fromUserId === toUserId) {
        throw new Error("You cannot send a friend request to yourself");
      }

      // Check if target user exists
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        throw new Error("User not found");
      }

      // Check if users are already friends
      const existingFriendship = await Friends.findOne({
        $or: [
          { userId: fromUserId, friendId: toUserId },
          { userId: toUserId, friendId: fromUserId },
        ],
      });

      if (existingFriendship) {
        throw new Error("You are already friends with this user");
      }

      // Check if there's an existing pending request
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { fromUserId, toUserId, status: FriendRequestStatus.PENDING },
          { fromUserId: toUserId, toUserId: fromUserId, status: FriendRequestStatus.PENDING },
        ],
      });

      if (existingRequest) {
        if (existingRequest.fromUserId.toString() === fromUserId) {
          throw new Error("You have already sent a friend request to this user");
        } else {
          throw new Error("This user has already sent you a friend request");
        }
      }

      // Create new friend request
      const friendRequest = new FriendRequest({
        fromUserId,
        toUserId,
        status: FriendRequestStatus.PENDING,
      });

      const savedRequest = await friendRequest.save();

      // Load relations for response
      const requestWithRelations = await FriendRequest.findById(savedRequest._id)
        .populate<{ fromUserId: IUser }>("fromUserId")
        .populate<{ toUserId: IUser }>("toUserId");

      if (!requestWithRelations) {
        throw new Error("Failed to create friend request");
      }

      return this.mapFriendRequestToResponse(requestWithRelations);
    } catch (error: any) {
      logger.error("Error sending friend request:", error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string, userId: string): Promise<FriendDto> {
    try {
      // Find the friend request
      const friendRequest = await FriendRequest.findById(requestId)
        .populate<{ fromUserId: IUser }>("fromUserId")
        .populate<{ toUserId: IUser }>("toUserId");

      if (!friendRequest) {
        throw new Error("Friend request not found");
      }

      // Verify the user is the recipient of the request
      if (friendRequest.toUserId.toString() !== userId &&
        (friendRequest.toUserId as unknown as IUser).id !== userId) {
        throw new Error("You are not authorized to accept this friend request");
      }

      // Check if request is pending
      if (friendRequest.status !== FriendRequestStatus.PENDING) {
        throw new Error(`Friend request is already ${friendRequest.status}`);
      }

      // Update request status to accepted
      friendRequest.status = FriendRequestStatus.ACCEPTED;
      await friendRequest.save();

      // Get the original fromUserId and toUserId (before population)
      const fromUser = friendRequest.fromUserId as unknown as IUser;
      const toUser = friendRequest.toUserId as unknown as IUser;

      // Create friendship record (bidirectional)
      const friendship = new Friends({
        userId: fromUser._id || fromUser.id,
        friendId: toUser._id || toUser.id,
      });

      const savedFriendship = await friendship.save();

      // Create a direct conversation between the two users
      const conversationService = new ConversationService();
      const conversation = await conversationService.createConversation(
        "", // Name will be auto-generated
        fromUser.id || fromUser._id.toString(),
        ConversationType.DIRECT,
        [fromUser.id || fromUser._id.toString(), toUser.id || toUser._id.toString()]
      );

      // Reload with relations
      const friendshipWithRelations = await Friends.findById(savedFriendship._id)
        .populate<{ userId: IUser }>("userId")
        .populate<{ friendId: IUser }>("friendId");

      const response = this.mapFriendToResponse(friendshipWithRelations!);
      return { ...response, conversationId: conversation.id };
    } catch (error: any) {
      logger.error("Error accepting friend request:", error);
      throw error;
    }
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      // Find the friend request
      const friendRequest = await FriendRequest.findById(requestId);

      if (!friendRequest) {
        throw new Error("Friend request not found");
      }

      // Verify the user is the recipient of the request
      if (friendRequest.toUserId.toString() !== userId) {
        throw new Error("You are not authorized to decline this friend request");
      }

      // Check if request is pending
      if (friendRequest.status !== FriendRequestStatus.PENDING) {
        throw new Error(`Friend request is already ${friendRequest.status}`);
      }

      // Update request status to declined
      friendRequest.status = FriendRequestStatus.DECLINED;
      await friendRequest.save();
    } catch (error: any) {
      logger.error("Error declining friend request:", error);
      throw error;
    }
  }

  /**
   * Get all friend requests for a user (sent and received)
   */
  async getFriendRequests(userId: string): Promise<FriendRequestsResponse> {
    try {
      const [sentRequests, receivedRequests] = await Promise.all([
        FriendRequest.find({ fromUserId: userId })
          .populate<{ fromUserId: IUser }>("fromUserId")
          .populate<{ toUserId: IUser }>("toUserId")
          .sort({ createdAt: -1 }),
        FriendRequest.find({ toUserId: userId, status: FriendRequestStatus.PENDING })
          .populate<{ fromUserId: IUser }>("fromUserId")
          .populate<{ toUserId: IUser }>("toUserId")
          .sort({ createdAt: -1 }),
      ]);

      return {
        sent: sentRequests.map((req) => this.mapFriendRequestToResponse(req)),
        received: receivedRequests.map((req) => this.mapFriendRequestToResponse(req)),
      };
    } catch (error: any) {
      logger.error("Error getting friend requests:", error);
      throw error;
    }
  }

  /**
   * Get all friends of a user
   */
  async getFriends(userId: string): Promise<FriendDto[]> {
    try {
      const friendships = await Friends.find({
        $or: [{ userId }, { friendId: userId }],
      })
        .populate<{ userId: IUser }>("userId")
        .populate<{ friendId: IUser }>("friendId")
        .sort({ createdAt: -1 });

      return friendships.map((friendship) => {
        // Determine which user is the friend (not the requesting user)
        const userObj = friendship.userId as unknown as IUser;
        const friendObj = friendship.friendId as unknown as IUser;
        const friend = userObj.id === userId ? friendObj : userObj;

        const response: FriendDto = {
          id: friendship.id,
          userId: friendship.userId.toString(),
          friendId: friendship.friendId.toString(),
          createdAt: friendship.createdAt,
          updatedAt: friendship.updatedAt,
        } as any;

        if (friend) {
          response.friend = {
            id: friend.id,
            username: friend.username,
            email: friend.email,
            createdAt: friend.createdAt,
          };
          if (friend.avatar !== undefined) {
            response.friend.avatar = friend.avatar;
          }
        }

        return response;
      });
    } catch (error: any) {
      logger.error("Error getting friends:", error);
      throw error;
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    try {
      const friendship = await Friends.findOne({
        $or: [
          { userId: userId1, friendId: userId2 },
          { userId: userId2, friendId: userId1 },
        ],
      });

      return !!friendship;
    } catch (error: any) {
      logger.error("Error checking friendship:", error);
      return false;
    }
  }

  /**
   * Map FriendRequest entity to FriendRequestResponse
   */
  private mapFriendRequestToResponse(request: any): FriendRequestDto {
    const fromUser = request.fromUserId as IUser;
    const toUser = request.toUserId as IUser;

    const response: FriendRequestDto = {
      id: request.id,
      fromUserId: typeof fromUser === "string" ? fromUser : fromUser.id,
      toUserId: typeof toUser === "string" ? toUser : toUser.id,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };

    if (fromUser && typeof fromUser !== "string") {
      response.fromUser = {
        id: fromUser.id,
        username: fromUser.username,
        email: fromUser.email,
        createdAt: fromUser.createdAt,
      };
      if (fromUser.avatar !== undefined) {
        response.fromUser.avatar = fromUser.avatar;
      }
    }

    if (toUser && typeof toUser !== "string") {
      response.toUser = {
        id: toUser.id,
        username: toUser.username,
        email: toUser.email,
        createdAt: toUser.createdAt,
      };
      if (toUser.avatar !== undefined) {
        response.toUser.avatar = toUser.avatar;
      }
    }

    return response;
  }

  /**
   * Map Friends entity to FriendResponse
   */
  private mapFriendToResponse(friendship: any): FriendDto {
    const friendObj = friendship.friendId as IUser;

    const response: FriendDto = {
      id: friendship.id,
      userId: friendship.userId.toString(),
      friendId: friendship.friendId.toString(),
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt,
    } as any;

    if (friendObj && typeof friendObj !== "string") {
      response.friend = {
        id: friendObj.id,
        username: friendObj.username,
        email: friendObj.email,
        createdAt: friendObj.createdAt,
      };
      if (friendObj.avatar !== undefined) {
        response.friend.avatar = friendObj.avatar;
      }
    }

    return response;
  }
}
