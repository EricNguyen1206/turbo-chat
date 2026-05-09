/**
 * Unit tests for ConversationService
 * @module services/__tests__/conversation.service.test
 */

import { ConversationService } from "../conversation.service";
import { Conversation } from "@/models/Conversation";
import { Participant } from "@/models/Participant";
import { User } from "@/models/User";
import { UserService } from "@/services/user.service";
import { ConversationType } from "@turbo-chat/types";

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

jest.mock("@/models/Conversation");
jest.mock("@/models/Participant");
jest.mock("@/models/User");
jest.mock("@/services/user.service");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockConversation(overrides: Record<string, any> = {}) {
  const id = "conv-id-123";
  const conv = {
    _id: id,
    id,
    name: "Test Conversation",
    avatar: undefined,
    ownerId: { toString: () => "owner-id-123" },
    type: ConversationType.GROUP,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    save: jest.fn(),
    ...overrides,
  };
  conv.save = jest.fn().mockResolvedValue(conv);
  return conv;
}

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

function mockParticipant(overrides: Record<string, any> = {}) {
  return {
    _id: "part-id-123",
    id: "part-id-123",
    userId: mockUserDoc(),
    conversationId: "conv-id-123",
    joinedAt: new Date("2025-01-01"),
    unreadCount: 0,
    lastReadAt: new Date("2025-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConversationService", () => {
  let service: ConversationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationService();
  });

  // -----------------------------------------------------------------------
  // getConversationById
  // -----------------------------------------------------------------------
  describe("getConversationById", () => {
    it("should return null when conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getConversationById("nonexistent-id");

      expect(result).toBeNull();
    });

    it("should return conversation with members when found", async () => {
      const conversation = mockConversation();
      const member = mockUserDoc({ id: "member-1" });
      const participant = mockParticipant({ userId: member });

      (Conversation.findOne as jest.Mock).mockResolvedValue(conversation);

      const populateChain = {
        populate: jest.fn().mockResolvedValue([participant]),
      };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      const result = await service.getConversationById("conv-id-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("conv-id-123");
      expect(result!.members).toHaveLength(1);
      expect(result!.members[0]!.id).toBe("member-1");
    });

    it("should set otherUserId and dynamic name for DIRECT conversation when reqUserId provided", async () => {
      const conversation = mockConversation({
        type: ConversationType.DIRECT,
        ownerId: { toString: () => "owner-id" },
      });
      const currentUser = mockUserDoc({ id: "current-user" });
      const otherUser = mockUserDoc({
        id: "other-user",
        email: "other@example.com",
        avatar: "avatar.png",
      });
      const participants = [
        mockParticipant({ userId: currentUser }),
        mockParticipant({ userId: otherUser }),
      ];

      (Conversation.findOne as jest.Mock).mockResolvedValue(conversation);
      const populateChain = {
        populate: jest.fn().mockResolvedValue(participants),
      };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      const result = await service.getConversationById("conv-id-123", "current-user");

      expect(result!.otherUserId).toBe("other-user");
      expect(result!.name).toBe("other@example.com");
      expect(result!.avatar).toBe("avatar.png");
    });

    it("should filter out participants with null userId", async () => {
      const conversation = mockConversation();
      const participant = mockParticipant({ userId: null });

      (Conversation.findOne as jest.Mock).mockResolvedValue(conversation);
      const populateChain = {
        populate: jest.fn().mockResolvedValue([participant]),
      };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      const result = await service.getConversationById("conv-id-123");

      expect(result!.members).toHaveLength(0);
    });

    it("should include avatar on member when user has avatar", async () => {
      const conversation = mockConversation();
      const member = mockUserDoc({ id: "member-1", avatar: "pic.png" });
      const participant = mockParticipant({ userId: member });

      (Conversation.findOne as jest.Mock).mockResolvedValue(conversation);
      const populateChain = {
        populate: jest.fn().mockResolvedValue([participant]),
      };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      const result = await service.getConversationById("conv-id-123");

      expect(result!.members[0]!.avatar).toBe("pic.png");
    });

    it("should throw on database error", async () => {
      (Conversation.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.getConversationById("conv-id-123")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // getAllConversation
  // -----------------------------------------------------------------------
  describe("getAllConversation", () => {
    it("should return empty direct and group arrays when user has no conversations", async () => {
      (Participant.find as jest.Mock).mockResolvedValue([]);
      (Conversation.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllConversation("user-id");

      expect(result).toEqual({ direct: [], group: [] });
    });

    it("should separate conversations by type (direct vs group)", async () => {
      const directConv = mockConversation({
        id: "direct-1",
        type: ConversationType.DIRECT,
      });
      const groupConv = mockConversation({
        id: "group-1",
        type: ConversationType.GROUP,
        name: "My Group",
      });

      const directParticipant = mockParticipant({
        conversationId: "direct-1",
        unreadCount: 5,
      });
      const groupParticipant = mockParticipant({
        conversationId: "group-1",
        unreadCount: 2,
      });

      (Participant.find as jest.Mock)
        .mockResolvedValueOnce([directParticipant, groupParticipant]);

      (Conversation.find as jest.Mock).mockResolvedValue([directConv, groupConv]);

      // Mock UserService.getFriendsByConversationId for the direct conversation
      jest.spyOn(UserService.prototype, "getFriendsByConversationId").mockResolvedValue([
        mockUserDoc({ id: "other-user", email: "other@test.com" }),
      ]);

      const result = await service.getAllConversation("user-id");

      expect(result.direct).toHaveLength(1);
      expect(result.group).toHaveLength(1);
      expect(result.group[0]!.name).toBe("My Group");
    });

    it("should throw on database error", async () => {
      (Participant.find as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.getAllConversation("user-id")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // createConversation
  // -----------------------------------------------------------------------
  describe("createConversation", () => {
    it("should throw if owner does not exist", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createConversation("Test", "bad-owner", ConversationType.GROUP, [])
      ).rejects.toThrow("Owner not found");
    });

    it("should throw if any user in userIds does not exist", async () => {
      const owner = mockUserDoc({ id: "owner-1" });
      (User.findById as jest.Mock)
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce(null);

      // Make sure we bypass duplicate check for this test
      const participantChain = { distinct: jest.fn().mockResolvedValue([]) };
      (Participant.find as jest.Mock).mockReturnValue(participantChain);

      await expect(
        service.createConversation("Test", "owner-1", ConversationType.GROUP, ["missing-user"])
      ).rejects.toThrow("User with ID missing-user not found");
    });

    it("should return existing direct conversation if one already exists", async () => {
      const owner = mockUserDoc({ id: "owner-1" });
      const other = mockUserDoc({ id: "user-2" });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(owner)    // owner check
        .mockResolvedValueOnce(owner)    // loop: "owner-1"
        .mockResolvedValueOnce(other);   // loop: "user-2"

      const participantChain = { distinct: jest.fn().mockResolvedValue(["existing-conv-id"]) };
      (Participant.find as jest.Mock).mockReturnValue(participantChain);

      const existingConv = mockConversation({ id: "existing-conv-id", type: ConversationType.DIRECT });
      (Conversation.findOne as jest.Mock).mockResolvedValue(existingConv);

      const result = await service.createConversation(
        "",
        "owner-1",
        ConversationType.DIRECT,
        ["owner-1", "user-2"]
      );

      expect(result.id).toBe("existing-conv-id");
    });

    it("should create a group conversation and add all users", async () => {
      const owner = mockUserDoc({ id: "owner-1" });
      const user2 = mockUserDoc({ id: "user-2" });

      const participantChain = { distinct: jest.fn().mockResolvedValue([]) };
      (Participant.find as jest.Mock).mockReturnValue(participantChain);

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(owner)    // owner check
        .mockResolvedValueOnce(owner)    // loop: "owner-1"
        .mockResolvedValueOnce(user2)    // loop: "user-2"
        .mockResolvedValue(owner);       // addUserToConversation: target user checks

      const savedConv = mockConversation({ id: "new-conv", ownerId: { toString: () => "owner-1" } });
      savedConv.save = jest.fn().mockResolvedValue(savedConv);
      (Conversation as unknown as jest.Mock).mockImplementation(() => savedConv);

      // Mock addUserToConversation internals
      (Conversation.findOne as jest.Mock).mockResolvedValue(savedConv);
      (Participant.findOneAndUpdate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const result = await service.createConversation(
        "My Group",
        "owner-1",
        ConversationType.GROUP,
        ["owner-1", "user-2"]
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("new-conv");
    });

    it("should auto-generate name for direct conversation when name is empty", async () => {
      const owner = mockUserDoc({ id: "owner-1" });
      const other = mockUserDoc({ id: "user-2", email: "other@test.com" });

      const participantChain = { distinct: jest.fn().mockResolvedValue([]) };
      (Participant.find as jest.Mock).mockReturnValue(participantChain);

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(owner)    // owner check
        .mockResolvedValueOnce(owner)    // loop: "owner-1"
        .mockResolvedValueOnce(other)    // loop: "user-2"
        .mockResolvedValue(owner);       // addUserToConversation: target user checks

      const savedConv = mockConversation({ id: "new-direct", ownerId: { toString: () => "owner-1" } });
      savedConv.save = jest.fn().mockResolvedValue(savedConv);
      let constructorCall: any;
      (Conversation as unknown as jest.Mock).mockImplementation((data: any) => {
        constructorCall = data;
        return savedConv;
      });

      (Conversation.findOne as jest.Mock).mockResolvedValue(savedConv);
      (Participant.findOneAndUpdate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.createConversation(
        "",
        "owner-1",
        ConversationType.DIRECT,
        ["owner-1", "user-2"]
      );

      expect(constructorCall.name).toBe("other@test.com");
    });

    it("should throw on database error", async () => {
      (User.findById as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.createConversation("Test", "owner-1", ConversationType.GROUP, [])
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // updateConversation
  // -----------------------------------------------------------------------
  describe("updateConversation", () => {
    it("should throw if conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateConversation("bad-id", { name: "New Name" })
      ).rejects.toThrow("Conversation not found");
    });

    it("should update name and save", async () => {
      const conv = mockConversation();
      conv.save = jest.fn().mockResolvedValue(conv);
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await service.updateConversation("conv-id-123", { name: "New Name" });

      expect(conv.name).toBe("New Name");
      expect(conv.save).toHaveBeenCalled();
    });

    it("should update avatar when provided", async () => {
      const conv = mockConversation();
      conv.save = jest.fn().mockResolvedValue(conv);
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await service.updateConversation("conv-id-123", {
        name: "New Name",
        avatar: "new-avatar.png",
      });

      expect(conv.avatar).toBe("new-avatar.png");
    });

    it("should not update avatar when not provided", async () => {
      const conv = mockConversation();
      conv.save = jest.fn().mockResolvedValue(conv);
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await service.updateConversation("conv-id-123", { name: "New Name" });

      expect(conv.avatar).toBeUndefined();
    });

    it("should throw on database error", async () => {
      (Conversation.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.updateConversation("conv-id-123", { name: "New Name" })
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // deleteConversation
  // -----------------------------------------------------------------------
  describe("deleteConversation", () => {
    it("should throw if conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteConversation("owner-id", "bad-id")
      ).rejects.toThrow("Conversation not found");
    });

    it("should throw if user is not the owner", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "real-owner-id" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await expect(
        service.deleteConversation("not-owner-id", "conv-id-123")
      ).rejects.toThrow("Only conversation owner can delete conversation");
    });

    it("should soft delete when owner requests", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.deleteConversation("owner-id-123", "conv-id-123");

      expect(Conversation.updateOne).toHaveBeenCalledWith(
        { _id: "conv-id-123" },
        { deletedAt: expect.any(Date) }
      );
    });

    it("should throw on database error", async () => {
      (Conversation.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.deleteConversation("owner-id", "conv-id-123")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // addUserToConversation
  // -----------------------------------------------------------------------
  describe("addUserToConversation", () => {
    it("should throw if conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addUserToConversation("owner-id", "bad-id", "target-id")
      ).rejects.toThrow("Conversation not found");
    });

    it("should throw if user is not the owner", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "real-owner-id" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await expect(
        service.addUserToConversation("not-owner", "conv-id-123", "target-id")
      ).rejects.toThrow("Only conversation owner can add users");
    });

    it("should throw if target user does not exist", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addUserToConversation("owner-id-123", "conv-id-123", "bad-target")
      ).rejects.toThrow("Target user not found");
    });

    it("should throw if group member limit is exceeded", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
        type: ConversationType.GROUP
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "target-id" }));
      (Participant.countDocuments as jest.Mock).mockResolvedValue(50); // Assuming 50 is MAX

      await expect(
        service.addUserToConversation("owner-id-123", "conv-id-123", "target-id")
      ).rejects.toThrow("Conversation member limit reached");
    });

    it("should add user to conversation with upsert", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "target-id" }));
      (Participant.countDocuments as jest.Mock).mockResolvedValue(0); // Reset mock

      const upsertResult = { _id: "part-id" };
      (Participant.findOneAndUpdate as jest.Mock).mockResolvedValue(upsertResult);

      await service.addUserToConversation("owner-id-123", "conv-id-123", "target-id");

      expect(Participant.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "target-id", conversationId: "conv-id-123" },
        {
          userId: "target-id",
          conversationId: "conv-id-123",
          joinedAt: expect.any(Date),
          deletedAt: null,
        },
        { upsert: true, new: true }
      );
    });

    it("should throw on database error", async () => {
      (Conversation.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.addUserToConversation("owner-id", "conv-id-123", "target-id")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // removeUserFromConversation
  // -----------------------------------------------------------------------
  describe("removeUserFromConversation", () => {
    it("should throw if conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeUserFromConversation("owner-id", "bad-id", "target-id")
      ).rejects.toThrow("Conversation not found");
    });

    it("should throw if user is not the owner", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "real-owner-id" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      await expect(
        service.removeUserFromConversation("not-owner", "conv-id-123", "target-id")
      ).rejects.toThrow("Only conversation owner can remove users");
    });

    it("should throw if target user does not exist", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeUserFromConversation("owner-id-123", "conv-id-123", "bad-target")
      ).rejects.toThrow("Target user not found");
    });

    it("should throw if trying to remove the owner", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "owner-id-123" }));

      await expect(
        service.removeUserFromConversation("owner-id-123", "conv-id-123", "owner-id-123")
      ).rejects.toThrow("Cannot remove conversation owner");
    });

    it("should soft delete participant when valid", async () => {
      const conv = mockConversation({
        ownerId: { toString: () => "owner-id-123" },
      });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (User.findById as jest.Mock).mockResolvedValue(mockUserDoc({ id: "target-id" }));
      (Participant.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.removeUserFromConversation("owner-id-123", "conv-id-123", "target-id");

      expect(Participant.updateOne).toHaveBeenCalledWith(
        { conversationId: "conv-id-123", userId: "target-id" },
        { deletedAt: expect.any(Date) }
      );
    });

    it("should throw on database error", async () => {
      (Conversation.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.removeUserFromConversation("owner-id", "conv-id-123", "target-id")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // leaveConversation
  // -----------------------------------------------------------------------
  describe("leaveConversation", () => {
    it("should throw if conversation not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.leaveConversation("user-id", "bad-id")
      ).rejects.toThrow("Conversation not found");
    });

    it("should soft delete participant on leave", async () => {
      const conv = mockConversation({ ownerId: { toString: () => "other-owner-id" } });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      (Participant.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.leaveConversation("user-id", "conv-id-123");

      expect(Participant.updateOne).toHaveBeenCalledWith(
        { conversationId: "conv-id-123", userId: "user-id" },
        { deletedAt: expect.any(Date) }
      );
    });

    it("should transfer ownership if owner leaves and members > 1", async () => {
      const conv = mockConversation({ ownerId: { toString: () => "user-id" }, type: ConversationType.GROUP });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      
      const newOwner = mockParticipant({ userId: "new-owner" });
      const participantsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([newOwner])
      };
      (Participant.find as jest.Mock).mockReturnValue(participantsChain);

      (Participant.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.leaveConversation("user-id", "conv-id-123");

      expect(Conversation.updateOne).toHaveBeenCalledWith(
        { _id: "conv-id-123" },
        { ownerId: "new-owner", updatedAt: expect.any(Date) }
      );
    });

    it("should soft delete conversation if the last member leaves", async () => {
      const conv = mockConversation({ ownerId: { toString: () => "user-id" }, type: ConversationType.GROUP });
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);
      
      const participantsChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      (Participant.find as jest.Mock).mockReturnValue(participantsChain);

      (Participant.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.leaveConversation("user-id", "conv-id-123");

      expect(Conversation.updateOne).toHaveBeenCalledWith(
        { _id: "conv-id-123" },
        { deletedAt: expect.any(Date) }
      );
    });
  });

  // -----------------------------------------------------------------------
  // markConversationAsRead
  // -----------------------------------------------------------------------
  describe("markConversationAsRead", () => {
    it("should update unread count to 0 and set lastReadAt", async () => {
      (Participant.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      await service.markConversationAsRead("user-id", "conv-id-123");

      expect(Participant.updateOne).toHaveBeenCalledWith(
        { conversationId: "conv-id-123", userId: "user-id" },
        {
          unreadCount: 0,
          lastReadAt: expect.any(Date),
        }
      );
    });

    it("should throw on database error", async () => {
      (Participant.updateOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        service.markConversationAsRead("user-id", "conv-id-123")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // findById (alias)
  // -----------------------------------------------------------------------
  describe("findById", () => {
    it("should delegate to findConversationDocument", async () => {
      const conv = mockConversation();
      (Conversation.findOne as jest.Mock).mockResolvedValue(conv);

      const result = await service.findById("conv-id-123");

      expect(result).toBe(conv);
      expect(Conversation.findOne).toHaveBeenCalledWith({
        _id: "conv-id-123",
        deletedAt: null,
      });
    });

    it("should return null when not found", async () => {
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findById("nonexistent-id");

      expect(result).toBeNull();
    });
  });
});
