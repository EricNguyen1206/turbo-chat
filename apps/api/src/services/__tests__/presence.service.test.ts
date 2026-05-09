/**
 * Unit tests for PresenceService
 * @module services/__tests__/presence.service.test
 */

import { PresenceService } from "../presence.service";
import { RedisService } from "../redis.service";
import { FriendService } from "../friend.service";
import { WebSocketService } from "../websocket.service";
import { SocketEvent } from "@turbo-chat/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("@/config/config", () => ({
  config: {
    app: { env: "test", port: 10000, host: "localhost" },
    database: { uri: "mongodb://localhost:27017/test" },
    redis: { url: undefined, host: "localhost", port: 6379, password: undefined, db: 0 },
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

// Mock Participant for dynamic import in PresenceService
jest.mock("@/models/Participant", () => ({
  Participant: {
    find: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRedisService(): jest.Mocked<RedisService> {
  return {
    refreshUserOnline: jest.fn().mockResolvedValue(undefined),
    setUserOnline: jest.fn().mockResolvedValue(undefined),
    setUserOffline: jest.fn().mockResolvedValue(undefined),
    isUserOnline: jest.fn().mockResolvedValue(false),
    getOnlineUsers: jest.fn().mockResolvedValue([]),
    getMultipleUsersOnlineStatus: jest.fn().mockResolvedValue({}),
    joinConversation: jest.fn().mockResolvedValue(undefined),
    leaveConversation: jest.fn().mockResolvedValue(undefined),
    getParticipants: jest.fn().mockResolvedValue([]),
    publishConversationMessage: jest.fn().mockResolvedValue(undefined),
    publishConversationEvent: jest.fn().mockResolvedValue(undefined),
    publishUserNotification: jest.fn().mockResolvedValue(undefined),
    checkRateLimit: jest.fn().mockResolvedValue(true),
    setMigrationState: jest.fn().mockResolvedValue(undefined),
    getMigrationState: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(0),
  } as unknown as jest.Mocked<RedisService>;
}

function createMockFriendService(): jest.Mocked<FriendService> {
  return {
    getFriends: jest.fn().mockResolvedValue([]),
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    declineFriendRequest: jest.fn(),
    getFriendRequests: jest.fn(),
    areFriends: jest.fn(),
  } as unknown as jest.Mocked<FriendService>;
}

function createMockWebSocketService(): jest.Mocked<WebSocketService> {
  return {
    emitToUser: jest.fn(),
  } as unknown as jest.Mocked<WebSocketService>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PresenceService", () => {
  let service: PresenceService;
  let redisService: jest.Mocked<RedisService>;
  let friendService: jest.Mocked<FriendService>;
  let webSocketService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisService = createMockRedisService();
    friendService = createMockFriendService();
    webSocketService = createMockWebSocketService();
    service = new PresenceService(redisService, friendService, webSocketService);
  });

  // -----------------------------------------------------------------------
  // constructor
  // -----------------------------------------------------------------------
  describe("constructor", () => {
    it("should log initialization", () => {
      // PresenceService logs 'PresenceService initialized' in constructor
      // We just verify it doesn't throw
      expect(service).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // handleHeartbeat
  // -----------------------------------------------------------------------
  describe("handleHeartbeat", () => {
    it("should call redisService.refreshUserOnline", async () => {
      await service.handleHeartbeat("user-1");

      expect(redisService.refreshUserOnline).toHaveBeenCalledWith("user-1");
    });

    it("should throw if redisService.refreshUserOnline fails", async () => {
      (redisService.refreshUserOnline as jest.Mock).mockRejectedValue(
        new Error("Redis error")
      );

      await expect(
        service.handleHeartbeat("user-1")
      ).rejects.toThrow("Redis error");
    });
  });

  // -----------------------------------------------------------------------
  // handleUserConnect
  // -----------------------------------------------------------------------
  describe("handleUserConnect", () => {
    it("should set user online and broadcast status change", async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      // Mock Participant dynamic import
      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      await service.handleUserConnect("user-1");

      expect(redisService.setUserOnline).toHaveBeenCalledWith("user-1");
    });

    it("should broadcast online status to online friends", async () => {
      const friend1 = { friend: { id: "friend-1" } };
      const friend2 = { friend: { id: "friend-2" } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([friend1, friend2]);

      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "friend-1": true,
        "friend-2": false,
      });

      await service.handleUserConnect("user-1");

      expect(webSocketService.emitToUser).toHaveBeenCalledWith(
        "friend-1",
        SocketEvent.FRIEND_STATUS_CHANGED,
        expect.objectContaining({
          user_id: "user-1",
          status: "online",
        })
      );
      // friend-2 is offline, so should NOT receive event
      expect(webSocketService.emitToUser).not.toHaveBeenCalledWith(
        "friend-2",
        expect.anything(),
        expect.anything()
      );
    });

    it("should not broadcast when no online friends exist", async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      await service.handleUserConnect("user-1");

      expect(webSocketService.emitToUser).not.toHaveBeenCalled();
    });

    it("should include conversation participants as broadcast targets", async () => {
      const friend1 = { friend: { id: "friend-1" } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([friend1]);

      const { Participant } = require("@/models/Participant");
      Participant.find
        .mockResolvedValueOnce([{ conversationId: "conv-1" }]) // user's conversations
        .mockResolvedValueOnce([{ userId: { toString: () => "participant-1" } }]); // other participants

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "friend-1": false,
        "participant-1": true,
      });

      await service.handleUserConnect("user-1");

      expect(webSocketService.emitToUser).toHaveBeenCalledWith(
        "participant-1",
        SocketEvent.FRIEND_STATUS_CHANGED,
        expect.objectContaining({ status: "online", user_id: "user-1" })
      );
    });

    it("should deduplicate friend IDs and participant IDs", async () => {
      const friend1 = { friend: { id: "user-2" } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([friend1]);

      const { Participant } = require("@/models/Participant");
      Participant.find
        .mockResolvedValueOnce([{ conversationId: "conv-1" }])
        .mockResolvedValueOnce([{ userId: { toString: () => "user-2" } }]); // same as friend

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "user-2": true,
      });

      await service.handleUserConnect("user-1");

      // Should only emit once to user-2 (deduped)
      expect(webSocketService.emitToUser).toHaveBeenCalledTimes(1);
      expect(webSocketService.emitToUser).toHaveBeenCalledWith(
        "user-2",
        SocketEvent.FRIEND_STATUS_CHANGED,
        expect.anything()
      );
    });

    it("should throw if setUserOnline fails", async () => {
      (redisService.setUserOnline as jest.Mock).mockRejectedValue(
        new Error("Redis error")
      );

      await expect(
        service.handleUserConnect("user-1")
      ).rejects.toThrow("Redis error");
    });
  });

  // -----------------------------------------------------------------------
  // handleUserDisconnect
  // -----------------------------------------------------------------------
  describe("handleUserDisconnect", () => {
    it("should set user offline and broadcast status change", async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      await service.handleUserDisconnect("user-1");

      expect(redisService.setUserOffline).toHaveBeenCalledWith("user-1");
    });

    it("should broadcast offline status to online friends", async () => {
      const friend1 = { friend: { id: "friend-1" } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([friend1]);

      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "friend-1": true,
      });

      await service.handleUserDisconnect("user-1");

      expect(webSocketService.emitToUser).toHaveBeenCalledWith(
        "friend-1",
        SocketEvent.FRIEND_STATUS_CHANGED,
        expect.objectContaining({
          user_id: "user-1",
          status: "offline",
        })
      );
    });

    it("should not broadcast when no online friends", async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      await service.handleUserDisconnect("user-1");

      expect(webSocketService.emitToUser).not.toHaveBeenCalled();
    });

    it("should throw if setUserOffline fails", async () => {
      (redisService.setUserOffline as jest.Mock).mockRejectedValue(
        new Error("Redis error")
      );

      await expect(
        service.handleUserDisconnect("user-1")
      ).rejects.toThrow("Redis error");
    });
  });

  // -----------------------------------------------------------------------
  // getFriendsOnlineStatus
  // -----------------------------------------------------------------------
  describe("getFriendsOnlineStatus", () => {
    it("should return empty object when user has no friends or conversations", async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      const result = await service.getFriendsOnlineStatus("user-1");

      expect(result).toEqual({});
    });

    it("should return online status for friends and conversation participants", async () => {
      const friend1 = { friend: { id: "friend-1" } };
      const friend2 = { friend: { id: "friend-2" } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([friend1, friend2]);

      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "friend-1": true,
        "friend-2": false,
      });

      const result = await service.getFriendsOnlineStatus("user-1");

      expect(result).toEqual({
        "friend-1": true,
        "friend-2": false,
      });
    });

    it("should filter out friends without an id", async () => {
      const validFriend = { friend: { id: "friend-1" } };
      const invalidFriend = { friend: { id: undefined } };
      (friendService.getFriends as jest.Mock).mockResolvedValue([validFriend, invalidFriend]);

      const { Participant } = require("@/models/Participant");
      Participant.find.mockResolvedValue([]);

      (redisService.getMultipleUsersOnlineStatus as jest.Mock).mockResolvedValue({
        "friend-1": true,
      });

      const result = await service.getFriendsOnlineStatus("user-1");

      expect(result).toEqual({ "friend-1": true });
      // Only valid friend ID should be queried
      expect(redisService.getMultipleUsersOnlineStatus).toHaveBeenCalledWith(["friend-1"]);
    });

    it("should return empty object on error (graceful degradation)", async () => {
      (friendService.getFriends as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const result = await service.getFriendsOnlineStatus("user-1");

      // getRelevantUserIds catches the error and returns [], so result is {}
      expect(result).toEqual({});
    });
  });
});
