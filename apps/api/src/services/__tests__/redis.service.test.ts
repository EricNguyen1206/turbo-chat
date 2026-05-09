/**
 * Unit tests for RedisService
 * @module services/__tests__/redis.service.test
 */

import { RedisService } from "../redis.service";

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
    session: {
      fingerprintEnabled: true,
      slidingEnabled: true,
      cleanupIntervalMs: 21600000,
    },
  },
}));

const mockPipeline = {
  sAdd: jest.fn().mockReturnThis(),
  sRem: jest.fn().mockReturnThis(),
  hSet: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  sCard: jest.fn().mockReturnThis(),
  zRemRangeByScore: jest.fn().mockReturnThis(),
  zCard: jest.fn().mockReturnThis(),
  zAdd: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockClient = {
  multi: jest.fn().mockReturnValue(mockPipeline),
  sIsMember: jest.fn(),
  sMembers: jest.fn(),
  publish: jest.fn(),
  hSet: jest.fn(),
  hGetAll: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

jest.mock("@/config/redis", () => ({
  getRedisConnection: () => ({
    getClient: () => mockClient,
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset pipeline mock defaults
    mockPipeline.exec.mockResolvedValue([]);
    mockClient.multi.mockReturnValue(mockPipeline);
    service = new RedisService();
  });

  // -----------------------------------------------------------------------
  // setUserOnline
  // -----------------------------------------------------------------------
  describe("setUserOnline", () => {
    it("should add user to online set, set status hash, and expire", async () => {
      mockPipeline.exec.mockResolvedValue([1, 1, 1]);

      await service.setUserOnline("user-1");

      expect(mockPipeline.sAdd).toHaveBeenCalledWith("online_users", "user-1");
      expect(mockPipeline.hSet).toHaveBeenCalledWith(
        `user:user-1:status`,
        expect.objectContaining({ status: "online" })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(`user:user-1:status`, 60);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // setUserOffline
  // -----------------------------------------------------------------------
  describe("setUserOffline", () => {
    it("should remove user from online set, set offline status, and set long expiry", async () => {
      mockPipeline.exec.mockResolvedValue([1, 1, 1]);

      await service.setUserOffline("user-1");

      expect(mockPipeline.sRem).toHaveBeenCalledWith("online_users", "user-1");
      expect(mockPipeline.hSet).toHaveBeenCalledWith(
        `user:user-1:status`,
        expect.objectContaining({ status: "offline" })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(`user:user-1:status`, 86400);
    });
  });

  // -----------------------------------------------------------------------
  // isUserOnline
  // -----------------------------------------------------------------------
  describe("isUserOnline", () => {
    it("should return true when user is in online set", async () => {
      (mockClient.sIsMember as jest.Mock).mockResolvedValue(true);

      const result = await service.isUserOnline("user-1");

      expect(mockClient.sIsMember).toHaveBeenCalledWith("online_users", "user-1");
      expect(result).toBe(true);
    });

    it("should return false when user is not in online set", async () => {
      (mockClient.sIsMember as jest.Mock).mockResolvedValue(false);

      const result = await service.isUserOnline("user-1");

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getOnlineUsers
  // -----------------------------------------------------------------------
  describe("getOnlineUsers", () => {
    it("should return list of online user IDs", async () => {
      (mockClient.sMembers as jest.Mock).mockResolvedValue(["user-1", "user-2"]);

      const result = await service.getOnlineUsers();

      expect(mockClient.sMembers).toHaveBeenCalledWith("online_users");
      expect(result).toEqual(["user-1", "user-2"]);
    });

    it("should return empty array when no users online", async () => {
      (mockClient.sMembers as jest.Mock).mockResolvedValue([]);

      const result = await service.getOnlineUsers();

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // refreshUserOnline
  // -----------------------------------------------------------------------
  describe("refreshUserOnline", () => {
    it("should call same pipeline operations as setUserOnline", async () => {
      mockPipeline.exec.mockResolvedValue([1, 1, 1]);

      await service.refreshUserOnline("user-1");

      expect(mockPipeline.sAdd).toHaveBeenCalledWith("online_users", "user-1");
      expect(mockPipeline.hSet).toHaveBeenCalledWith(
        `user:user-1:status`,
        expect.objectContaining({ status: "online" })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(`user:user-1:status`, 60);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // getMultipleUsersOnlineStatus
  // -----------------------------------------------------------------------
  describe("getMultipleUsersOnlineStatus", () => {
    it("should return empty object for empty array", async () => {
      const result = await service.getMultipleUsersOnlineStatus([]);

      expect(result).toEqual({});
      expect(mockClient.sIsMember).not.toHaveBeenCalled();
    });

    it("should return online status map for multiple users", async () => {
      (mockClient.sIsMember as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.getMultipleUsersOnlineStatus(["u1", "u2", "u3"]);

      expect(result).toEqual({ u1: true, u2: false, u3: true });
    });
  });

  // -----------------------------------------------------------------------
  // joinConversation
  // -----------------------------------------------------------------------
  describe("joinConversation", () => {
    it("should add user to conversation members and publish join event", async () => {
      mockPipeline.exec.mockResolvedValue([1, 1, 1]);
      (mockClient.publish as jest.Mock).mockResolvedValue(1);

      await service.joinConversation("user-1", "conv-1");

      expect(mockPipeline.sAdd).toHaveBeenCalledWith("conversation:conv-1:members", "user-1");
      expect(mockPipeline.sAdd).toHaveBeenCalledWith("user:user-1:conversations", "conv-1");
      expect(mockPipeline.sCard).toHaveBeenCalledWith("conversation:conv-1:participants");

      // Verify the join event was published
      const publishCall = (mockClient.publish as jest.Mock).mock.calls[0];
      expect(publishCall[0]).toBe("conversation:conv-1:events");
      const eventData = JSON.parse(publishCall[1]);
      expect(eventData.type).toBe("conversation.participants.join");
      expect(eventData.user_id).toBe("user-1");
      expect(eventData.conversation_id).toBe("conv-1");
    });
  });

  // -----------------------------------------------------------------------
  // leaveConversation
  // -----------------------------------------------------------------------
  describe("leaveConversation", () => {
    it("should remove user from conversation and publish leave event", async () => {
      mockPipeline.exec.mockResolvedValue([1, 1]);
      (mockClient.publish as jest.Mock).mockResolvedValue(1);

      await service.leaveConversation("user-1", "conv-1");

      expect(mockPipeline.sRem).toHaveBeenCalledWith("conversation:conv-1:members", "user-1");
      expect(mockPipeline.sRem).toHaveBeenCalledWith("user:user-1:conversations", "conv-1");

      const publishCall = (mockClient.publish as jest.Mock).mock.calls[0];
      expect(publishCall[0]).toBe("conversation:conv-1:events");
      const eventData = JSON.parse(publishCall[1]);
      expect(eventData.type).toBe("conversation.participants.leave");
      expect(eventData.user_id).toBe("user-1");
    });
  });

  // -----------------------------------------------------------------------
  // getParticipants
  // -----------------------------------------------------------------------
  describe("getParticipants", () => {
    it("should return participants from conversation set", async () => {
      (mockClient.sMembers as jest.Mock).mockResolvedValue(["user-1", "user-2"]);

      const result = await service.getParticipants("conv-1");

      expect(mockClient.sMembers).toHaveBeenCalledWith("conversation:conv-1:participants");
      expect(result).toEqual(["user-1", "user-2"]);
    });
  });

  // -----------------------------------------------------------------------
  // publishConversationMessage
  // -----------------------------------------------------------------------
  describe("publishConversationMessage", () => {
    it("should stringify message and publish to conversation channel", async () => {
      (mockClient.publish as jest.Mock).mockResolvedValue(1);
      const message = { id: "msg-1", content: "hello" };

      await service.publishConversationMessage("conv-1", message);

      expect(mockClient.publish).toHaveBeenCalledWith(
        "chat:conversation:conv-1",
        JSON.stringify(message)
      );
    });
  });

  // -----------------------------------------------------------------------
  // publishConversationEvent
  // -----------------------------------------------------------------------
  describe("publishConversationEvent", () => {
    it("should stringify event and publish to events channel", async () => {
      (mockClient.publish as jest.Mock).mockResolvedValue(1);
      const event = { type: "user_joined", userId: "user-1" };

      await service.publishConversationEvent("conv-1", event);

      expect(mockClient.publish).toHaveBeenCalledWith(
        "conversation:conv-1:events",
        JSON.stringify(event)
      );
    });
  });

  // -----------------------------------------------------------------------
  // publishUserNotification
  // -----------------------------------------------------------------------
  describe("publishUserNotification", () => {
    it("should stringify notification and publish to user notifications channel", async () => {
      (mockClient.publish as jest.Mock).mockResolvedValue(1);
      const notification = { type: "friend_request", from: "user-2" };

      await service.publishUserNotification("user-1", notification);

      expect(mockClient.publish).toHaveBeenCalledWith(
        "user:user-1:notifications",
        JSON.stringify(notification)
      );
    });
  });

  // -----------------------------------------------------------------------
  // checkRateLimit
  // -----------------------------------------------------------------------
  describe("checkRateLimit", () => {
    it("should return true when under rate limit", async () => {
      // zRemRangeByScore result, zCard result (count=5), zAdd result, expire result
      mockPipeline.exec.mockResolvedValue([0, 5, 1, 1]);

      const result = await service.checkRateLimit("rate:api:ip-1", 10, 60000);

      expect(result).toBe(true);
      expect(mockPipeline.zRemRangeByScore).toHaveBeenCalled();
      expect(mockPipeline.zCard).toHaveBeenCalledWith("rate:api:ip-1");
      expect(mockPipeline.zAdd).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
    });

    it("should return false when rate limit exceeded", async () => {
      mockPipeline.exec.mockResolvedValue([0, 10, 1, 1]);

      const result = await service.checkRateLimit("rate:api:ip-1", 10, 60000);

      expect(result).toBe(false);
    });

    it("should return false when results are null", async () => {
      mockPipeline.exec.mockResolvedValue(null);

      const result = await service.checkRateLimit("rate:api:ip-1", 10, 60000);

      expect(result).toBe(false);
    });

    it("should return false when results array is too short", async () => {
      mockPipeline.exec.mockResolvedValue([0]);

      const result = await service.checkRateLimit("rate:api:ip-1", 10, 60000);

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // setMigrationState
  // -----------------------------------------------------------------------
  describe("setMigrationState", () => {
    it("should set migration state hash", async () => {
      (mockClient.hSet as jest.Mock).mockResolvedValue(1);

      await service.setMigrationState("1.0.0", "completed");

      expect(mockClient.hSet).toHaveBeenCalledWith("db:migration:status", {
        version: "1.0.0",
        status: "completed",
        updated_at: expect.any(Number),
      });
    });
  });

  // -----------------------------------------------------------------------
  // getMigrationState
  // -----------------------------------------------------------------------
  describe("getMigrationState", () => {
    it("should return migration state hash", async () => {
      const state = { version: "1.0.0", status: "completed", updated_at: "1234567890" };
      (mockClient.hGetAll as jest.Mock).mockResolvedValue(state);

      const result = await service.getMigrationState();

      expect(mockClient.hGetAll).toHaveBeenCalledWith("db:migration:status");
      expect(result).toEqual(state);
    });
  });

  // -----------------------------------------------------------------------
  // set (cache)
  // -----------------------------------------------------------------------
  describe("set (cache)", () => {
    it("should set value without expiration", async () => {
      (mockClient.set as jest.Mock).mockResolvedValue("OK");

      await service.set("cache:key", { foo: "bar" });

      expect(mockClient.set).toHaveBeenCalledWith("cache:key", JSON.stringify({ foo: "bar" }));
      expect(mockClient.setEx).not.toHaveBeenCalled();
    });

    it("should set value with expiration using setEx", async () => {
      (mockClient.setEx as jest.Mock).mockResolvedValue("OK");

      await service.set("cache:key", { foo: "bar" }, 3600);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        "cache:key",
        3600,
        JSON.stringify({ foo: "bar" })
      );
      expect(mockClient.set).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // get (cache)
  // -----------------------------------------------------------------------
  describe("get (cache)", () => {
    it("should return parsed value when key exists", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(JSON.stringify({ foo: "bar" }));

      const result = await service.get("cache:key");

      expect(result).toEqual({ foo: "bar" });
    });

    it("should return null when key does not exist", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get("cache:nonexistent");

      expect(result).toBeNull();
    });

    it("should return null for empty string value", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get("cache:empty");

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // delete (cache)
  // -----------------------------------------------------------------------
  describe("delete (cache)", () => {
    it("should delete keys and return count", async () => {
      (mockClient.del as jest.Mock).mockResolvedValue(2);

      const result = await service.delete(["key-1", "key-2"]);

      expect(mockClient.del).toHaveBeenCalledWith(["key-1", "key-2"]);
      expect(result).toBe(2);
    });

    it("should return 0 when no keys deleted", async () => {
      (mockClient.del as jest.Mock).mockResolvedValue(0);

      const result = await service.delete(["nonexistent"]);

      expect(result).toBe(0);
    });
  });
});
