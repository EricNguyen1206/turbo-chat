import {
  ConnectionState,
  SocketEvent,
  createJoinConversationPayload,
  createLeaveConversationPayload,
  createJoinedConversationPayload,
  createLeftConversationPayload,
  createSendMessagePayload,
  createMessageDto,
  createUserJoinedPayload,
  createUserLeftPayload,
  createErrorPayload,
  generateMessageId,
  createSocketMessage,
  isJoinConversationPayload,
  isLeaveConversationPayload,
  isSendMessagePayload,
} from "../socket";

// ============================================================================
// Enums
// ============================================================================

describe("ConnectionState", () => {
  it("has DISCONNECTED value", () => {
    expect(ConnectionState.DISCONNECTED).toBe("disconnected");
  });

  it("has CONNECTING value", () => {
    expect(ConnectionState.CONNECTING).toBe("connecting");
  });

  it("has CONNECTED value", () => {
    expect(ConnectionState.CONNECTED).toBe("connected");
  });

  it("has ERROR value", () => {
    expect(ConnectionState.ERROR).toBe("error");
  });
});

describe("SocketEvent", () => {
  it("has correct connection event values", () => {
    expect(SocketEvent.CONNECT).toBe("connect");
    expect(SocketEvent.DISCONNECT).toBe("disconnect");
    expect(SocketEvent.CONNECTION_ERROR).toBe("connect_error");
  });

  it("has correct conversation event values", () => {
    expect(SocketEvent.JOIN_CONVERSATION).toBe("join_conversation");
    expect(SocketEvent.LEAVE_CONVERSATION).toBe("leave_conversation");
    expect(SocketEvent.JOINED_CONVERSATION).toBe("joined_conversation");
    expect(SocketEvent.LEFT_CONVERSATION).toBe("left_conversation");
  });

  it("has correct message event values", () => {
    expect(SocketEvent.SEND_MESSAGE).toBe("send_message");
    expect(SocketEvent.NEW_MESSAGE).toBe("new_message");
  });

  it("has correct user event values", () => {
    expect(SocketEvent.USER_JOINED).toBe("user_joined");
    expect(SocketEvent.USER_LEFT).toBe("user_left");
  });

  it("has correct presence event values", () => {
    expect(SocketEvent.HEARTBEAT).toBe("heartbeat");
    expect(SocketEvent.FRIEND_STATUS_CHANGED).toBe("friend_status_changed");
  });

  it("has correct error event value", () => {
    expect(SocketEvent.ERROR).toBe("error");
  });
});

// ============================================================================
// Builder Functions
// ============================================================================

describe("createJoinConversationPayload", () => {
  it("returns correct structure", () => {
    const payload = createJoinConversationPayload("conv-123");
    expect(payload).toEqual({ conversation_id: "conv-123" });
  });
});

describe("createLeaveConversationPayload", () => {
  it("returns correct structure", () => {
    const payload = createLeaveConversationPayload("conv-456");
    expect(payload).toEqual({ conversation_id: "conv-456" });
  });
});

describe("createJoinedConversationPayload", () => {
  it("returns correct structure", () => {
    const payload = createJoinedConversationPayload("conv-1", "user-1", "Alice");
    expect(payload).toEqual({
      conversation_id: "conv-1",
      user_id: "user-1",
      username: "Alice",
    });
  });
});

describe("createLeftConversationPayload", () => {
  it("returns correct structure", () => {
    const payload = createLeftConversationPayload("conv-2", "user-2", "Bob");
    expect(payload).toEqual({
      conversation_id: "conv-2",
      user_id: "user-2",
      username: "Bob",
    });
  });
});

describe("createSendMessagePayload", () => {
  it("returns correct structure with text", () => {
    const payload = createSendMessagePayload("conv-1", "Hello!");
    expect(payload).toEqual({
      conversation_id: "conv-1",
      text: "Hello!",
      url: null,
      fileName: null,
    });
  });

  it("returns null for text when not provided", () => {
    const payload = createSendMessagePayload("conv-1");
    expect(payload.text).toBeNull();
    expect(payload.url).toBeNull();
    expect(payload.fileName).toBeNull();
  });

  it("returns correct structure with all fields", () => {
    const payload = createSendMessagePayload("conv-1", "Hi", "https://img.png", "photo.png");
    expect(payload).toEqual({
      conversation_id: "conv-1",
      text: "Hi",
      url: "https://img.png",
      fileName: "photo.png",
    });
  });
});

describe("createMessageDto", () => {
  it("returns correct structure with all fields", () => {
    const dto = createMessageDto(
      "msg-1",
      "conv-1",
      "user-1",
      "Alice",
      "https://avatar.png",
      "Hello",
      null,
      null,
      "2024-01-01T00:00:00.000Z",
      "2024-01-01T00:00:00.000Z"
    );
    expect(dto).toEqual({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
      senderName: "Alice",
      senderAvatar: "https://avatar.png",
      text: "Hello",
      url: null,
      fileName: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("includes senderAvatar when provided", () => {
    const dto = createMessageDto("msg-1", "conv-1", "user-1", "Alice", "avatar-url");
    expect(dto.senderAvatar).toBe("avatar-url");
  });

  it("excludes senderAvatar when undefined", () => {
    const dto = createMessageDto("msg-1", "conv-1", "user-1", "Alice", undefined);
    expect(dto).not.toHaveProperty("senderAvatar");
  });

  it("excludes updatedAt when undefined", () => {
    const dto = createMessageDto("msg-1", "conv-1", "user-1", "Alice", undefined, "Hi", null, null, "2024-01-01T00:00:00.000Z");
    expect(dto).not.toHaveProperty("updatedAt");
  });

  it("includes updatedAt when null is explicitly passed", () => {
    const dto = createMessageDto("msg-1", "conv-1", "user-1", "Alice", undefined, "Hi", null, null, "2024-01-01T00:00:00.000Z", null);
    expect(dto.updatedAt).toBeNull();
  });

  it("generates createdAt when not provided", () => {
    const dto = createMessageDto("msg-1", "conv-1", "user-1", "Alice", undefined);
    expect(dto.createdAt).toBeTruthy();
    expect(new Date(dto.createdAt!).getTime()).not.toBeNaN();
  });
});

describe("createUserJoinedPayload", () => {
  it("returns correct structure", () => {
    const payload = createUserJoinedPayload("conv-1", "user-1", "Alice");
    expect(payload).toEqual({
      conversation_id: "conv-1",
      user_id: "user-1",
      username: "Alice",
    });
  });
});

describe("createUserLeftPayload", () => {
  it("returns correct structure", () => {
    const payload = createUserLeftPayload("conv-1", "user-1", "Alice");
    expect(payload).toEqual({
      conversation_id: "conv-1",
      user_id: "user-1",
      username: "Alice",
    });
  });
});

describe("createErrorPayload", () => {
  it("returns correct structure without details", () => {
    const payload = createErrorPayload("ERR001", "Something went wrong");
    expect(payload).toEqual({
      code: "ERR001",
      message: "Something went wrong",
    });
    expect(payload).not.toHaveProperty("details");
  });

  it("includes details when provided", () => {
    const details = { field: "email", reason: "invalid format" };
    const payload = createErrorPayload("ERR002", "Validation failed", details);
    expect(payload).toEqual({
      code: "ERR002",
      message: "Validation failed",
      details,
    });
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

describe("generateMessageId", () => {
  it("returns a string", () => {
    expect(typeof generateMessageId()).toBe("string");
  });

  it("has expected format: timestamp-randomString", () => {
    const id = generateMessageId();
    // Format: {timestamp}-{9-char base-36 string}
    expect(id).toMatch(/^\d+-[a-z0-9]{9}$/);
  });

  it("generates unique ids on successive calls", () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    expect(id1).not.toBe(id2);
  });
});

describe("createSocketMessage", () => {
  it("returns a SocketMessage with id, timestamp, and data", () => {
    const data = { conversation_id: "conv-1" };
    const msg = createSocketMessage(data);
    expect(msg).toHaveProperty("id");
    expect(msg).toHaveProperty("timestamp");
    expect(typeof msg.timestamp).toBe("number");
    expect(msg.data).toEqual(data);
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe("isJoinConversationPayload", () => {
  it("returns true for valid payload", () => {
    expect(isJoinConversationPayload({ conversation_id: "conv-1" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isJoinConversationPayload(null)).toBe(false);
  });

  it("returns false for missing conversation_id", () => {
    expect(isJoinConversationPayload({})).toBe(false);
  });

  it("returns false for non-string conversation_id", () => {
    expect(isJoinConversationPayload({ conversation_id: 123 })).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isJoinConversationPayload(undefined)).toBe(false);
  });
});

describe("isLeaveConversationPayload", () => {
  it("returns true for valid payload", () => {
    expect(isLeaveConversationPayload({ conversation_id: "conv-1" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isLeaveConversationPayload(null)).toBe(false);
  });

  it("returns false for missing conversation_id", () => {
    expect(isLeaveConversationPayload({})).toBe(false);
  });
});

describe("isSendMessagePayload", () => {
  it("returns true for payload with text", () => {
    expect(isSendMessagePayload({ conversation_id: "conv-1", text: "hello" })).toBe(true);
  });

  it("returns true for payload with url", () => {
    expect(isSendMessagePayload({ conversation_id: "conv-1", url: "https://img.png" })).toBe(true);
  });

  it("returns true for payload with fileName", () => {
    expect(isSendMessagePayload({ conversation_id: "conv-1", fileName: "photo.png" })).toBe(true);
  });

  it("returns false when no content fields are present", () => {
    expect(isSendMessagePayload({ conversation_id: "conv-1" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSendMessagePayload(null)).toBe(false);
  });

  it("returns false for missing conversation_id", () => {
    expect(isSendMessagePayload({ text: "hello" })).toBe(false);
  });
});
