// ---------------------------------------------------------------------------
// Mocks must be hoisted before the module import
// ---------------------------------------------------------------------------

jest.mock("@/models/Participant", () => {
  const selectMock = jest.fn().mockResolvedValue([]);
  return {
    Participant: {
      updateMany: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({ select: selectMock }),
    },
  };
});

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { WebSocketService } from "../websocket.service";
import { Participant } from "@/models/Participant";
import { SocketEvent } from "@turbo-chat/types";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockSocket(id: string = "socket-1") {
  return {
    id,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as import("socket.io").Socket;
}

function createMockRedisService() {
  return {
    setUserOnline: jest.fn().mockResolvedValue(undefined),
    setUserOffline: jest.fn().mockResolvedValue(undefined),
    joinConversation: jest.fn().mockResolvedValue(undefined),
    leaveConversation: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function createMockMessageService() {
  return {
    createMessage: jest.fn().mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderAvatar: "avatar.png",
      createdAt: "2024-01-01T00:00:00.000Z",
    }),
  } as any;
}

function createMockConversationService() {
  return {
    findById: jest.fn().mockResolvedValue({ id: "conv-1" }),
  } as any;
}

function createService() {
  const redisService = createMockRedisService();
  const messageService = createMockMessageService();
  const conversationService = createMockConversationService();
  const service = new WebSocketService(redisService, messageService, conversationService);
  return { service, redisService, messageService, conversationService };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WebSocketService", () => {
  // =========================================================================
  // Connection Management
  // =========================================================================

  describe("registerClient", () => {
    it("stores the socket and sets user online", async () => {
      const { service, redisService } = createService();
      const socket = createMockSocket();

      await service.registerClient("user-1", socket);

      expect(service.getSocket("user-1")).toBe(socket);
      expect(redisService.setUserOnline).toHaveBeenCalledWith("user-1");
    });

    it("disconnects old socket on reconnection", async () => {
      const { service } = createService();
      const oldSocket = createMockSocket("old-socket");
      const newSocket = createMockSocket("new-socket");

      await service.registerClient("user-1", oldSocket);
      await service.registerClient("user-1", newSocket);

      expect(oldSocket.disconnect).toHaveBeenCalledWith(true);
      expect(service.getSocket("user-1")).toBe(newSocket);
    });

    it("does not disconnect if the same socket reconnects", async () => {
      const { service } = createService();
      const socket = createMockSocket("same-socket");

      await service.registerClient("user-1", socket);
      await service.registerClient("user-1", socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("unregisterClient", () => {
    it("removes client and sets user offline", async () => {
      const { service, redisService } = createService();
      const socket = createMockSocket();

      await service.registerClient("user-1", socket);
      await service.unregisterClient("user-1");

      expect(service.getSocket("user-1")).toBeNull();
      expect(redisService.setUserOffline).toHaveBeenCalledWith("user-1");
    });

    it("auto-leaves all rooms before removing", async () => {
      const { service, redisService } = createService();
      const socket = createMockSocket();

      await service.registerClient("user-1", socket);
      await service.joinRoom("user-1", "conv-1");
      await service.unregisterClient("user-1");

      // leaveConversation is called for each room
      expect(redisService.leaveConversation).toHaveBeenCalledWith("user-1", "conv-1");
      expect(service.getUserRooms("user-1")).toEqual([]);
    });
  });

  describe("getSocket", () => {
    it("returns socket for online user", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);

      expect(service.getSocket("user-1")).toBe(socket);
    });

    it("returns null for unknown user", () => {
      const { service } = createService();
      expect(service.getSocket("unknown")).toBeNull();
    });
  });

  describe("isOnline", () => {
    it("returns true for registered user", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());
      expect(service.isOnline("user-1")).toBe(true);
    });

    it("returns false for unregistered user", () => {
      const { service } = createService();
      expect(service.isOnline("nobody")).toBe(false);
    });
  });

  describe("getOnlineUsers", () => {
    it("returns array of registered user ids", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket("s1"));
      await service.registerClient("user-2", createMockSocket("s2"));

      const online = service.getOnlineUsers();
      expect(online).toEqual(expect.arrayContaining(["user-1", "user-2"]));
      expect(online).toHaveLength(2);
    });

    it("returns empty array when no users online", () => {
      const { service } = createService();
      expect(service.getOnlineUsers()).toEqual([]);
    });
  });

  // =========================================================================
  // Room Management
  // =========================================================================

  describe("joinRoom", () => {
    it("adds user to room and joins socket.io room", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);

      await service.joinRoom("user-1", "conv-1");

      expect(service.isUserInRoom("user-1", "conv-1")).toBe(true);
      expect(socket.join).toHaveBeenCalledWith("conv-1");
    });

    it("persists to redis", async () => {
      const { service, redisService } = createService();
      await service.registerClient("user-1", createMockSocket());

      await service.joinRoom("user-1", "conv-1");

      expect(redisService.joinConversation).toHaveBeenCalledWith("user-1", "conv-1");
    });

    it("throws if conversation does not exist", async () => {
      const { service, conversationService } = createService();
      conversationService.findById.mockResolvedValueOnce(null);
      await service.registerClient("user-1", createMockSocket());

      await expect(service.joinRoom("user-1", "conv-missing")).rejects.toThrow("Conversation not found");
    });

    it("does not add duplicate entry if already in room", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());

      await service.joinRoom("user-1", "conv-1");
      await service.joinRoom("user-1", "conv-1");

      expect(service.getRoomMemberCount("conv-1")).toBe(1);
    });
  });

  describe("leaveRoom", () => {
    it("removes user from room and leaves socket.io room", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);
      await service.joinRoom("user-1", "conv-1");

      await service.leaveRoom("user-1", "conv-1");

      expect(service.isUserInRoom("user-1", "conv-1")).toBe(false);
      expect(socket.leave).toHaveBeenCalledWith("conv-1");
    });

    it("cleans up empty rooms", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());
      await service.joinRoom("user-1", "conv-1");

      await service.leaveRoom("user-1", "conv-1");

      expect(service.getRoomMembers("conv-1")).toEqual([]);
      // Room should be cleaned up — getRoomMemberCount should be 0
      expect(service.getRoomMemberCount("conv-1")).toBe(0);
    });

    it("does nothing if room does not exist", async () => {
      const { service } = createService();
      // Should not throw
      await service.leaveRoom("user-1", "nonexistent");
    });
  });

  describe("getRoomMembers", () => {
    it("returns array of member ids", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket("s1"));
      await service.registerClient("user-2", createMockSocket("s2"));
      await service.joinRoom("user-1", "conv-1");
      await service.joinRoom("user-2", "conv-1");

      const members = service.getRoomMembers("conv-1");
      expect(members).toEqual(expect.arrayContaining(["user-1", "user-2"]));
      expect(members).toHaveLength(2);
    });

    it("returns empty array for nonexistent room", () => {
      const { service } = createService();
      expect(service.getRoomMembers("nonexistent")).toEqual([]);
    });
  });

  describe("getUserRooms", () => {
    it("returns rooms the user has joined", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());
      await service.joinRoom("user-1", "conv-1");
      await service.joinRoom("user-1", "conv-2");

      const rooms = service.getUserRooms("user-1");
      expect(rooms).toEqual(expect.arrayContaining(["conv-1", "conv-2"]));
      expect(rooms).toHaveLength(2);
    });

    it("returns empty array when user is in no rooms", () => {
      const { service } = createService();
      expect(service.getUserRooms("user-1")).toEqual([]);
    });
  });

  describe("getRoomMemberCount", () => {
    it("returns correct count", async () => {
      const { service } = createService();
      await service.registerClient("u1", createMockSocket("s1"));
      await service.registerClient("u2", createMockSocket("s2"));
      await service.joinRoom("u1", "conv-1");
      await service.joinRoom("u2", "conv-1");

      expect(service.getRoomMemberCount("conv-1")).toBe(2);
    });

    it("returns 0 for nonexistent room", () => {
      const { service } = createService();
      expect(service.getRoomMemberCount("nonexistent")).toBe(0);
    });
  });

  describe("isUserInRoom", () => {
    it("returns true when user is in room", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());
      await service.joinRoom("user-1", "conv-1");

      expect(service.isUserInRoom("user-1", "conv-1")).toBe(true);
    });

    it("returns false when user is not in room", () => {
      const { service } = createService();
      expect(service.isUserInRoom("user-1", "conv-1")).toBe(false);
    });
  });

  // =========================================================================
  // Broadcasting
  // =========================================================================

  describe("broadcastToRoom", () => {
    it("emits to all room members", async () => {
      const { service } = createService();
      const socket1 = createMockSocket("s1");
      const socket2 = createMockSocket("s2");
      await service.registerClient("u1", socket1);
      await service.registerClient("u2", socket2);
      await service.joinRoom("u1", "conv-1");
      await service.joinRoom("u2", "conv-1");

      const payload = { message: "hello" };
      service.broadcastToRoom("conv-1", SocketEvent.NEW_MESSAGE, payload);

      expect(socket1.emit).toHaveBeenCalledWith(SocketEvent.NEW_MESSAGE, payload);
      expect(socket2.emit).toHaveBeenCalledWith(SocketEvent.NEW_MESSAGE, payload);
    });

    it("excludes specified user", async () => {
      const { service } = createService();
      const socket1 = createMockSocket("s1");
      const socket2 = createMockSocket("s2");
      await service.registerClient("u1", socket1);
      await service.registerClient("u2", socket2);
      await service.joinRoom("u1", "conv-1");
      await service.joinRoom("u2", "conv-1");

      service.broadcastToRoom("conv-1", SocketEvent.NEW_MESSAGE, {}, "u1");

      expect(socket1.emit).not.toHaveBeenCalled();
      expect(socket2.emit).toHaveBeenCalled();
    });

    it("does nothing for nonexistent room", () => {
      const { service } = createService();
      // Should not throw
      service.broadcastToRoom("nonexistent", SocketEvent.NEW_MESSAGE, {});
    });
  });

  describe("emitToUser", () => {
    it("emits to the specific user", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);

      const payload = { text: "hi" };
      service.emitToUser("user-1", SocketEvent.NEW_MESSAGE, payload);

      expect(socket.emit).toHaveBeenCalledWith(SocketEvent.NEW_MESSAGE, payload);
    });

    it("does nothing if user is not connected", () => {
      const { service } = createService();
      // Should not throw
      service.emitToUser("unknown", SocketEvent.NEW_MESSAGE, {});
    });
  });

  // =========================================================================
  // Business Logic
  // =========================================================================

  describe("handleSendMessage", () => {
    it("throws if no content is provided", async () => {
      const { service } = createService();
      await service.registerClient("user-1", createMockSocket());

      await expect(
        service.handleSendMessage("user-1", "Alice", "conv-1")
      ).rejects.toThrow("Message must have text, url, or fileName");
    });

    it("saves message and broadcasts to online participants", async () => {
      const { service, messageService } = createService();
      const senderSocket = createMockSocket("sender");
      const recipientSocket = createMockSocket("recipient");
      await service.registerClient("sender-1", senderSocket);
      await service.registerClient("recipient-1", recipientSocket);

      messageService.createMessage.mockResolvedValueOnce({
        id: "msg-new",
        conversationId: "conv-1",
        senderAvatar: "avatar.png",
        createdAt: "2024-06-01T00:00:00.000Z",
      });

      (Participant.updateMany as jest.Mock).mockResolvedValueOnce({ modifiedCount: 1 });
      (Participant.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockResolvedValue([
          { userId: { toString: () => "sender-1" } },
          { userId: { toString: () => "recipient-1" } },
        ]),
      });

      await service.handleSendMessage("sender-1", "Alice", "conv-1", "Hello!");

      expect(messageService.createMessage).toHaveBeenCalledWith(
        "sender-1",
        expect.objectContaining({ conversationId: "conv-1", text: "Hello!" })
      );
      expect(Participant.updateMany).toHaveBeenCalled();
      expect(recipientSocket.emit).toHaveBeenCalledWith(
        SocketEvent.NEW_MESSAGE,
        expect.objectContaining({ id: "msg-new" })
      );
      // Sender also receives the event
      expect(senderSocket.emit).toHaveBeenCalledWith(
        SocketEvent.NEW_MESSAGE,
        expect.objectContaining({ id: "msg-new" })
      );
    });

    it("increments unread count for non-sender participants", async () => {
      const { service } = createService();
      await service.registerClient("sender-1", createMockSocket());

      (Participant.updateMany as jest.Mock).mockResolvedValueOnce({});
      (Participant.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockResolvedValue([]),
      });

      await service.handleSendMessage("sender-1", "Alice", "conv-1", "Hello!");

      expect(Participant.updateMany).toHaveBeenCalledWith(
        {
          conversationId: "conv-1",
          userId: { $ne: "sender-1" },
          deletedAt: null,
        },
        { $inc: { unreadCount: 1 } }
      );
    });
  });

  describe("handleJoinConversation", () => {
    it("joins room and emits joined + user_joined events", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);

      await service.handleJoinConversation("user-1", "Alice", "conv-1");

      // User should receive joined_conversation
      expect(socket.emit).toHaveBeenCalledWith(
        SocketEvent.JOINED_CONVERSATION,
        expect.objectContaining({
          conversation_id: "conv-1",
          user_id: "user-1",
          username: "Alice",
        })
      );

      // user_joined is broadcast (but only user in room, so no one else to receive)
      expect(service.isUserInRoom("user-1", "conv-1")).toBe(true);
    });

    it("re-throws if joinRoom fails", async () => {
      const { service, conversationService } = createService();
      await service.registerClient("user-1", createMockSocket());
      conversationService.findById.mockResolvedValueOnce(null);

      await expect(
        service.handleJoinConversation("user-1", "Alice", "conv-missing")
      ).rejects.toThrow("Conversation not found");
    });
  });

  describe("handleLeaveConversation", () => {
    it("leaves room and emits left + user_left events", async () => {
      const { service } = createService();
      const socket = createMockSocket();
      await service.registerClient("user-1", socket);
      await service.joinRoom("user-1", "conv-1");

      await service.handleLeaveConversation("user-1", "Alice", "conv-1");

      expect(socket.emit).toHaveBeenCalledWith(
        SocketEvent.LEFT_CONVERSATION,
        expect.objectContaining({
          conversation_id: "conv-1",
          user_id: "user-1",
          username: "Alice",
        })
      );
      expect(service.isUserInRoom("user-1", "conv-1")).toBe(false);
    });
  });
});
