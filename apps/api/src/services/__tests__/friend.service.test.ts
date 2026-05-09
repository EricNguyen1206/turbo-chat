/**
 * Unit tests for FriendService
 * @module services/__tests__/friend.service.test
 */

import { FriendService } from "../friend.service";
import { FriendRequest, FriendRequestStatus } from "@/models/FriendRequest";
import { Friends } from "@/models/Friends";
import { User } from "@/models/User";
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("@/config/config", () => ({
  config: {
    app: { env: "test", port: 10000, host: "localhost" },
    database: { uri: "mongodb://localhost:27017/test" },
    jwt: {
      secret: "test-secret-do-not-use",
      accessExpire: "1h",
      refreshExpire: "30d",
      sessionRenewalThresholdDays: 7,
    },
    logging: { level: "error" },
    session: {
      fingerprintEnabled: true,
      slidingEnabled: true,
      cleanupIntervalMs: 21600000,
    },
  },
}));

jest.mock("@/models/FriendRequest");
jest.mock("@/models/Friends");
jest.mock("@/models/User");
jest.mock("@/services/conversation.service", () => {
  return {
    ConversationService: jest.fn().mockImplementation(() => ({
      createConversation: jest.fn().mockResolvedValue({ id: "conv-id-123" }),
    })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockUserDoc(overrides: Record<string, any> = {}) {
  return {
    _id: "user-id-123",
    id: "user-id-123",
    username: "testuser",
    email: "test@example.com",
    avatar: undefined,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function mockFriendRequest(overrides: Record<string, any> = {}) {
  return {
    _id: "request-id-123",
    id: "request-id-123",
    fromUserId: mockUserDoc({ id: "sender-id" }),
    toUserId: mockUserDoc({ id: "recipient-id" }),
    status: FriendRequestStatus.PENDING,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    save: jest.fn().mockImplementation(function(this: any) { return Promise.resolve(this); }),
    ...overrides,
  };
}

function mockFriendship(overrides: Record<string, any> = {}) {
  return {
    _id: "friendship-id-123",
    id: "friendship-id-123",
    userId: mockUserDoc({ id: "user-1" }),
    friendId: mockUserDoc({ id: "user-2" }),
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FriendService", () => {
  let service: FriendService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FriendService();
  });

  // -----------------------------------------------------------------------
  // sendFriendRequest
  // -----------------------------------------------------------------------
  describe("sendFriendRequest", () => {
    beforeEach(() => {
      (FriendRequest.countDocuments as jest.Mock).mockResolvedValue(0);
    });

    it("should throw if sending request to self", async () => {
      await expect(
        service.sendFriendRequest("user-1", "user-1")
      ).rejects.toThrow("You cannot send a friend request to yourself");
    });

    it("should throw if target user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendFriendRequest("user-1", "nonexistent")
      ).rejects.toThrow("User not found");
    });

    it("should throw if already friends", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "user-2" }));
      (Friends.findOne as jest.Mock).mockResolvedValue({ id: "existing-friendship" });

      await expect(
        service.sendFriendRequest("user-1", "user-2")
      ).rejects.toThrow("You are already friends with this user");
    });

    it("should throw if sender already sent a pending request", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "user-2" }));
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.findOne as jest.Mock).mockResolvedValue({
        fromUserId: { toString: () => "user-1" },
        toUserId: { toString: () => "user-2" },
        status: FriendRequestStatus.PENDING,
      });

      await expect(
        service.sendFriendRequest("user-1", "user-2")
      ).rejects.toThrow("You have already sent a friend request to this user");
    });

    it("should throw if recipient already sent a pending request", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "user-2" }));
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.findOne as jest.Mock).mockResolvedValue({
        fromUserId: { toString: () => "user-2" },
        toUserId: { toString: () => "user-1" },
        status: FriendRequestStatus.PENDING,
      });

      await expect(
        service.sendFriendRequest("user-1", "user-2")
      ).rejects.toThrow("This user has already sent you a friend request");
    });

    it("should throw if user has too many pending requests (spam prevention)", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "user-2" }));
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.countDocuments as jest.Mock).mockResolvedValue(50); // Max limit

      await expect(
        service.sendFriendRequest("user-1", "user-2")
      ).rejects.toThrow("You have too many pending friend requests. Please wait before sending more.");
    });

    it("should create and return friend request on success", async () => {
      const toUser = mockUserDoc({ id: "user-2", email: "user2@test.com" });
      const fromUser = mockUserDoc({ id: "user-1", email: "user1@test.com" });

      (User.findById as jest.Mock).mockResolvedValue(toUser);
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.findOne as jest.Mock).mockResolvedValue(null);

      const savedRequest = {
        _id: "new-request-id",
        save: jest.fn().mockResolvedValue({ _id: "new-request-id" }),
      };
      (FriendRequest as unknown as jest.Mock).mockImplementation(() => savedRequest);

      const populatedRequest = mockFriendRequest({
        _id: "new-request-id",
        id: "new-request-id",
        fromUserId: fromUser,
        toUserId: toUser,
      });
      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedRequest),
      });

      const result = await service.sendFriendRequest("user-1", "user-2");

      expect(result.id).toBe("new-request-id");
      expect(result.fromUserId).toBe("user-1");
      expect(result.toUserId).toBe("user-2");
      expect(result.fromUser).toBeDefined();
      expect(result.toUser).toBeDefined();
    });

    it("should throw if saved request not found after creation", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "user-2" }));
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      (FriendRequest.findOne as jest.Mock).mockResolvedValue(null);

      const savedRequest = {
        _id: "new-request-id",
        save: jest.fn().mockResolvedValue({ _id: "new-request-id" }),
      };
      (FriendRequest as unknown as jest.Mock).mockImplementation(() => savedRequest);

      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.sendFriendRequest("user-1", "user-2")
      ).rejects.toThrow("Failed to create friend request");
    });
  });

  // -----------------------------------------------------------------------
  // acceptFriendRequest
  // -----------------------------------------------------------------------
  describe("acceptFriendRequest", () => {
    it("should throw if friend request not found", async () => {
      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.acceptFriendRequest("nonexistent-id", "user-id")
      ).rejects.toThrow("Friend request not found");
    });

    it("should throw if user is not the recipient", async () => {
      const request = mockFriendRequest({
        toUserId: mockUserDoc({ id: "other-recipient" }),
      });
      request.toUserId.toString = () => "other-recipient";
      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(request),
      });

      await expect(
        service.acceptFriendRequest("request-id-123", "not-recipient")
      ).rejects.toThrow("You are not authorized to accept this friend request");
    });

    it("should throw if request is not pending", async () => {
      const request = mockFriendRequest({
        toUserId: mockUserDoc({ id: "recipient-id" }),
        status: FriendRequestStatus.ACCEPTED,
      });
      request.toUserId.toString = () => "recipient-id";
      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(request),
      });

      await expect(
        service.acceptFriendRequest("request-id-123", "recipient-id")
      ).rejects.toThrow("Friend request is already accepted");
    });

    it("should accept request, create friendship, and return friend dto", async () => {
      const fromUser = mockUserDoc({ id: "sender-id", _id: "sender-id" });
      const toUser = mockUserDoc({ id: "recipient-id", _id: "recipient-id" });

      const request = mockFriendRequest({
        fromUserId: fromUser,
        toUserId: toUser,
        status: FriendRequestStatus.PENDING,
      });
      request.toUserId.toString = () => "recipient-id";
      request.save = jest.fn().mockResolvedValue(request);

      const findByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (FriendRequest.findById as jest.Mock).mockReturnValue(findByIdChain);
      findByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(request),
      });

      const savedFriendship = {
        _id: "friendship-id",
        save: jest.fn().mockResolvedValue({ _id: "friendship-id" }),
      };
      (Friends as unknown as jest.Mock).mockImplementation(() => savedFriendship);

      const populatedFriendship = mockFriendship({
        _id: "friendship-id",
        id: "friendship-id",
        userId: fromUser,
        friendId: toUser,
      });
      const friendsFindByIdChain = {
        populate: jest.fn().mockReturnThis(),
      };
      (Friends.findById as jest.Mock).mockReturnValue(friendsFindByIdChain);
      friendsFindByIdChain.populate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedFriendship),
      });

      const result = await service.acceptFriendRequest("request-id-123", "recipient-id");

      expect((result as any).id).toBe("friendship-id");
      expect(result.conversationId).toBe("conv-id-123");
      expect(request.status).toBe(FriendRequestStatus.ACCEPTED);
      expect(request.save).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // declineFriendRequest
  // -----------------------------------------------------------------------
  describe("declineFriendRequest", () => {
    it("should throw if friend request not found", async () => {
      (FriendRequest.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.declineFriendRequest("nonexistent-id", "user-id")
      ).rejects.toThrow("Friend request not found");
    });

    it("should throw if user is not the recipient", async () => {
      const request = mockFriendRequest({
        toUserId: { toString: () => "other-recipient" },
      });
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);

      await expect(
        service.declineFriendRequest("request-id-123", "not-recipient")
      ).rejects.toThrow("You are not authorized to decline this friend request");
    });

    it("should throw if request is not pending", async () => {
      const request = mockFriendRequest({
        toUserId: { toString: () => "recipient-id" },
        status: FriendRequestStatus.DECLINED,
      });
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);

      await expect(
        service.declineFriendRequest("request-id-123", "recipient-id")
      ).rejects.toThrow("Friend request is already declined");
    });

    it("should set status to DECLINED and save", async () => {
      const request = mockFriendRequest({
        toUserId: { toString: () => "recipient-id" },
        status: FriendRequestStatus.PENDING,
      });
      request.save = jest.fn().mockResolvedValue(request);
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);

      await service.declineFriendRequest("request-id-123", "recipient-id");

      expect(request.status).toBe(FriendRequestStatus.DECLINED);
      expect(request.save).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // cancelFriendRequest
  // -----------------------------------------------------------------------
  describe("cancelFriendRequest", () => {
    it("should throw if friend request not found", async () => {
      (FriendRequest.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        service.cancelFriendRequest("nonexistent-id", "user-id")
      ).rejects.toThrow("Friend request not found");
    });

    it("should throw if user is not the sender", async () => {
      const request = mockFriendRequest({
        fromUserId: { toString: () => "other-sender" },
      });
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);
      await expect(
        service.cancelFriendRequest("request-id-123", "not-sender")
      ).rejects.toThrow("You are not authorized to cancel this friend request");
    });

    it("should throw if request is not pending", async () => {
      const request = mockFriendRequest({
        fromUserId: { toString: () => "sender-id" },
        status: FriendRequestStatus.ACCEPTED,
      });
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);
      await expect(
        service.cancelFriendRequest("request-id-123", "sender-id")
      ).rejects.toThrow("Friend request is already accepted");
    });

    it("should delete the friend request", async () => {
      const request = mockFriendRequest({
        fromUserId: { toString: () => "sender-id" },
        status: FriendRequestStatus.PENDING,
      });
      (FriendRequest.findById as jest.Mock).mockResolvedValue(request);
      (FriendRequest.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await service.cancelFriendRequest("request-id-123", "sender-id");
      expect(FriendRequest.deleteOne).toHaveBeenCalledWith({ _id: "request-id-123" });
    });
  });

  // -----------------------------------------------------------------------
  // getFriendRequests
  // -----------------------------------------------------------------------
  describe("getFriendRequests", () => {
    it("should return sent and received requests", async () => {
      const sentRequest = mockFriendRequest({
        fromUserId: mockUserDoc({ id: "user-1" }),
        toUserId: mockUserDoc({ id: "user-2" }),
      });
      const receivedRequest = mockFriendRequest({
        fromUserId: mockUserDoc({ id: "user-3" }),
        toUserId: mockUserDoc({ id: "user-1" }),
      });

      const sentChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([sentRequest]),
      };
      const receivedChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([receivedRequest]),
      };

      (FriendRequest.find as jest.Mock)
        .mockReturnValueOnce(sentChain)
        .mockReturnValueOnce(receivedChain);

      const result = await service.getFriendRequests("user-1");

      expect(result.sent).toHaveLength(1);
      expect(result.received).toHaveLength(1);
      expect(result.sent[0]!.fromUserId).toBe("user-1");
      expect(result.received[0]!.fromUserId).toBe("user-3");
    });

    it("should return empty arrays when no requests", async () => {
      const emptyChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };

      (FriendRequest.find as jest.Mock).mockReturnValue(emptyChain);

      const result = await service.getFriendRequests("user-1");

      expect(result.sent).toEqual([]);
      expect(result.received).toEqual([]);
    });

    it("should throw on database error", async () => {
      (FriendRequest.find as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      await expect(
        service.getFriendRequests("user-1")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // getFriends
  // -----------------------------------------------------------------------
  describe("getFriends", () => {
    it("should return friends with friend details", async () => {
      const user1 = mockUserDoc({ id: "user-1" });
      const user2 = mockUserDoc({ id: "user-2", username: "friend2", email: "friend2@test.com" });

      const friendship = {
        id: "friendship-1",
        userId: user1,
        friendId: user2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([friendship]),
      };
      (Friends.find as jest.Mock).mockReturnValue(chain);

      const result = await service.getFriends("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.friend).toBeDefined();
      expect(result[0]!.friend!.id).toBe("user-2");
    });

    it("should pick the other user as friend when user is friendId", async () => {
      const user1 = mockUserDoc({ id: "user-1", username: "friend1" });
      const user2 = mockUserDoc({ id: "user-2" });

      const friendship = {
        id: "friendship-1",
        userId: user1,
        friendId: user2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([friendship]),
      };
      (Friends.find as jest.Mock).mockReturnValue(chain);

      // Querying as user-2, so user-1 should be the friend
      const result = await service.getFriends("user-2");

      expect(result[0]!.friend!.id).toBe("user-1");
    });

    it("should include avatar in friend details when present", async () => {
      const user1 = mockUserDoc({ id: "user-1" });
      const user2 = mockUserDoc({ id: "user-2", avatar: "avatar.png" });

      const friendship = {
        id: "friendship-1",
        userId: user1,
        friendId: user2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([friendship]),
      };
      (Friends.find as jest.Mock).mockReturnValue(chain);

      const result = await service.getFriends("user-1");

      expect(result[0]!.friend!.avatar).toBe("avatar.png");
    });

    it("should return empty array when user has no friends", async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      (Friends.find as jest.Mock).mockReturnValue(chain);

      const result = await service.getFriends("user-1");

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      (Friends.find as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      await expect(
        service.getFriends("user-1")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // areFriends
  // -----------------------------------------------------------------------
  describe("areFriends", () => {
    it("should return true when users are friends", async () => {
      (Friends.findOne as jest.Mock).mockResolvedValue({ id: "friendship-1" });

      const result = await service.areFriends("user-1", "user-2");

      expect(result).toBe(true);
    });

    it("should return false when users are not friends", async () => {
      (Friends.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.areFriends("user-1", "user-2");

      expect(result).toBe(false);
    });

    it("should return false on database error instead of throwing", async () => {
      (Friends.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      const result = await service.areFriends("user-1", "user-2");

      expect(result).toBe(false);
    });

    it("should query for friendship in both directions", async () => {
      (Friends.findOne as jest.Mock).mockResolvedValue(null);

      await service.areFriends("user-1", "user-2");

      expect(Friends.findOne).toHaveBeenCalledWith({
        $or: [
          { userId: "user-1", friendId: "user-2" },
          { userId: "user-2", friendId: "user-1" },
        ],
      });
    });
  });

  // -----------------------------------------------------------------------
  // unfriend
  // -----------------------------------------------------------------------
  describe("unfriend", () => {
    it("should throw if friendship not found", async () => {
      (Friends.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.unfriend("user-1", "user-2")
      ).rejects.toThrow("You are not friends with this user");
    });

    it("should delete friendship", async () => {
      const friendship = mockFriendship();
      (Friends.findOne as jest.Mock).mockResolvedValue(friendship);
      (Friends.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await service.unfriend("user-1", "user-2");
      expect(Friends.deleteOne).toHaveBeenCalledWith({ _id: "friendship-id-123" });
    });
  });
});
