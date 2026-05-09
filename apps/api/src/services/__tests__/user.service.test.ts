/**
 * Unit tests for UserService
 * @module services/__tests__/user.service.test
 */

import { UserService } from "../user.service";
import { User, IUser } from "@/models/User";
import bcrypt from "bcryptjs";

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

jest.mock("@/models/User");
jest.mock("bcryptjs");

// Participant is dynamically imported, so we mock the module
jest.mock("@/models/Participant", () => ({
  Participant: {
    find: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockUser(overrides: Record<string, any> = {}): IUser {
  return {
    _id: "507f1f77bcf86cd799439011",
    id: "user-id-123",
    username: "testuser",
    email: "test@example.com",
    password: "hashed-password",
    providers: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    save: jest.fn(),
    ...overrides,
  } as unknown as IUser;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
  });

  // -----------------------------------------------------------------------
  // getProfile
  // -----------------------------------------------------------------------
  describe("getProfile", () => {
    it("should return UserDto when user is found", async () => {
      // Arrange
      const user = mockUser();
      (User.findOne as jest.Mock).mockResolvedValue(user);

      // Act
      const result = await userService.getProfile("user-id-123");

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        _id: "user-id-123",
        deletedAt: null,
      });
      expect(result).toEqual({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      });
    });

    it("should include avatar in UserDto when present", async () => {
      // Arrange
      const user = mockUser({ avatar: "https://example.com/avatar.png" });
      (User.findOne as jest.Mock).mockResolvedValue(user);

      // Act
      const result = await userService.getProfile("user-id-123");

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ avatar: "https://example.com/avatar.png" })
      );
    });

    it("should throw if user is not found", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.getProfile("nonexistent-id")
      ).rejects.toThrow("User not found");
    });

    it("should throw on database error", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockRejectedValue(
        new Error("DB connection failed")
      );

      // Act & Assert
      await expect(
        userService.getProfile("user-id-123")
      ).rejects.toThrow("DB connection failed");
    });
  });

  // -----------------------------------------------------------------------
  // updateProfile
  // -----------------------------------------------------------------------
  describe("updateProfile", () => {
    const updateData = {
      currentPassword: "OldPassword123",
      username: "newusername",
      password: "NewPassword456",
      avatar: "https://example.com/new-avatar.png",
    };

    it("should update profile fields and return updated UserDto", async () => {
      // Arrange
      const user = mockUser();
      const updatedUser = mockUser({
        username: "newusername",
        avatar: "https://example.com/new-avatar.png",
      });
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hashed-password");
      user.save = jest.fn().mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateProfile("user-id-123", updateData);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(
        updateData.currentPassword,
        "hashed-password"
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(updateData.password, 12);
      expect(user.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
      });
    });

    it("should throw if user is not found", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateProfile("nonexistent-id", updateData)
      ).rejects.toThrow("User not found");
    });

    it("should throw if user has no password set", async () => {
      // Arrange
      const user = mockUser({ password: undefined as any });
      (User.findOne as jest.Mock).mockResolvedValue(user);

      // Act & Assert
      await expect(
        userService.updateProfile("user-id-123", updateData)
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw if current password is incorrect", async () => {
      // Arrange
      const user = mockUser();
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        userService.updateProfile("user-id-123", updateData)
      ).rejects.toThrow("Current password is incorrect");
    });

    it("should update only username when only username is provided", async () => {
      // Arrange
      const user = mockUser();
      const updatedUser = mockUser({ username: "justusername" });
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      user.save = jest.fn().mockResolvedValue(updatedUser);

      const partialData = {
        currentPassword: "OldPassword123",
        username: "justusername",
      };

      // Act
      const result = await userService.updateProfile(
        "user-id-123",
        partialData
      );

      // Assert
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.username).toBe("justusername");
      expect(result.username).toBe("justusername");
    });
  });

  // -----------------------------------------------------------------------
  // searchUsers
  // -----------------------------------------------------------------------
  describe("searchUsers", () => {
    it("should return matching users as UserDto array", async () => {
      // Arrange
      const users = [
        mockUser({ id: "u1", username: "alice", email: "alice@test.com" }),
        mockUser({ id: "u2", username: "alice2", email: "alice2@test.com" }),
      ];
      const findChain = {
        limit: jest.fn().mockResolvedValue(users),
      };
      (User.find as jest.Mock).mockReturnValue(findChain);

      // Act
      const result = await userService.searchUsers("alice");

      // Assert
      expect(User.find).toHaveBeenCalledWith({
        username: { $regex: "alice", $options: "i" },
        deletedAt: null,
      });
      expect(findChain.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "u1",
        username: "alice",
        email: "alice@test.com",
        createdAt: users[0]!.createdAt,
      });
    });

    it("should return empty array when no matches", async () => {
      // Arrange
      const findChain = {
        limit: jest.fn().mockResolvedValue([]),
      };
      (User.find as jest.Mock).mockReturnValue(findChain);

      // Act
      const result = await userService.searchUsers("nonexistent");

      // Assert
      expect(result).toEqual([]);
    });

    it("should include avatar in results when present", async () => {
      // Arrange
      const user = mockUser({
        id: "u1",
        username: "alice",
        avatar: "https://example.com/avatar.png",
      });
      const findChain = {
        limit: jest.fn().mockResolvedValue([user]),
      };
      (User.find as jest.Mock).mockReturnValue(findChain);

      // Act
      const result = await userService.searchUsers("alice");

      // Assert
      expect(result[0]).toEqual(
        expect.objectContaining({ avatar: "https://example.com/avatar.png" })
      );
    });

    it("should throw on database error", async () => {
      // Arrange
      const findChain = {
        limit: jest.fn().mockRejectedValue(new Error("DB error")),
      };
      (User.find as jest.Mock).mockReturnValue(findChain);

      // Act & Assert
      await expect(userService.searchUsers("alice")).rejects.toThrow(
        "DB error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getFriendsByConversationId
  // -----------------------------------------------------------------------
  describe("getFriendsByConversationId", () => {
    // Need to import the mocked Participant
    let Participant: typeof import("@/models/Participant").Participant;

    beforeEach(async () => {
      Participant = (await import("@/models/Participant")).Participant;
    });

    it("should return friends from a conversation excluding current user", async () => {
      // Arrange
      const friend1 = mockUser({
        id: "friend-1",
        username: "friend1",
        deletedAt: null,
      });
      const friend2 = mockUser({
        id: "friend-2",
        username: "friend2",
        deletedAt: null,
      });

      const participants = [
        { userId: friend1 },
        { userId: friend2 },
      ];
      const populateChain = { populate: jest.fn().mockResolvedValue(participants) };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      // Act
      const result = await userService.getFriendsByConversationId(
        "conv-id",
        "user-id-123"
      );

      // Assert
      expect(Participant.find).toHaveBeenCalledWith({
        conversationId: "conv-id",
        userId: { $ne: "user-id-123" },
        deletedAt: null,
      });
      expect(result).toHaveLength(2);
    });

    it("should filter out deleted users", async () => {
      // Arrange
      const activeUser = mockUser({
        id: "friend-1",
        username: "active",
        deletedAt: null,
      });
      const deletedUser = mockUser({
        id: "friend-2",
        username: "deleted",
        deletedAt: new Date(),
      });

      const participants = [
        { userId: activeUser },
        { userId: deletedUser },
      ];
      const populateChain = { populate: jest.fn().mockResolvedValue(participants) };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      // Act
      const result = await userService.getFriendsByConversationId(
        "conv-id",
        "user-id-123"
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("friend-1");
    });

    it("should filter out null userId entries", async () => {
      // Arrange
      const participants = [
        { userId: null },
        { userId: undefined },
      ];
      const populateChain = { populate: jest.fn().mockResolvedValue(participants) };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      // Act
      const result = await userService.getFriendsByConversationId(
        "conv-id",
        "user-id-123"
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should throw on database error", async () => {
      // Arrange
      const populateChain = {
        populate: jest.fn().mockRejectedValue(new Error("DB error")),
      };
      (Participant.find as jest.Mock).mockReturnValue(populateChain);

      // Act & Assert
      await expect(
        userService.getFriendsByConversationId("conv-id", "user-id-123")
      ).rejects.toThrow("DB error");
    });
  });
});
