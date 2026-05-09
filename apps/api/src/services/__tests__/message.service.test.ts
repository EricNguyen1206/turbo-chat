/**
 * Unit tests for MessageService
 * @module services/__tests__/message.service.test
 */

import { MessageService } from "../message.service";
import { Message } from "@/models/Message";
import { IUser } from "@/models/User";
import { Participant } from "@/models/Participant";
import { Conversation } from "@/models/Conversation";

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

jest.mock("@/models/Message");
jest.mock("@/models/Participant");
jest.mock("@/models/Conversation");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockPopulatedMessage(overrides: Record<string, any> = {}) {
  return {
    id: "msg-id-123",
    conversationId: { toString: () => "conv-id-123" },
    senderId: {
      id: "sender-id",
      username: "sender",
      avatar: "https://example.com/avatar.png",
    } as unknown as IUser,
    text: "Hello world",
    url: undefined,
    fileName: undefined,
    createdAt: new Date("2025-06-01T12:00:00Z"),
    updatedAt: new Date("2025-06-01T12:00:00Z"),
    ...overrides,
  };
}

function createFindChain(resolvedValue: any) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(resolvedValue),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MessageService", () => {
  let messageService: MessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    messageService = new MessageService();
  });

  // -----------------------------------------------------------------------
  // getConversationMessages
  // -----------------------------------------------------------------------
  describe("getConversationMessages", () => {
    it("should return messages for a conversation with default limit", async () => {
      // Arrange
      const messages = [mockPopulatedMessage()];
      const chain = createFindChain(messages);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      const result = await messageService.getConversationMessages("conv-id-123");

      // Assert
      expect(Message.find).toHaveBeenCalledWith({
        conversationId: "conv-id-123",
        deletedAt: null,
      });
      expect(chain.limit).toHaveBeenCalledWith(20); // default limit
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "msg-id-123",
        conversationId: "conv-id-123",
        senderId: "sender-id",
        senderName: "sender",
        senderAvatar: "https://example.com/avatar.png",
        text: "Hello world",
        url: undefined,
        fileName: undefined,
        createdAt: "2025-06-01T12:00:00.000Z",
        updatedAt: "2025-06-01T12:00:00.000Z",
      });
    });

    it("should return messages with custom limit and before cursor", async () => {
      // Arrange
      const chain = createFindChain([]);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      await messageService.getConversationMessages("conv-id-123", 10, "cursor-id");

      // Assert
      expect(Message.find).toHaveBeenCalledWith({
        conversationId: "conv-id-123",
        deletedAt: null,
        _id: { $lt: "cursor-id" },
      });
      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it("should return empty array when no messages", async () => {
      // Arrange
      const chain = createFindChain([]);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      const result = await messageService.getConversationMessages("conv-id-123");

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      // Arrange
      const chain = createFindChain(Promise.reject(new Error("DB error")));
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act & Assert
      await expect(
        messageService.getConversationMessages("conv-id-123")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // createMessage
  // -----------------------------------------------------------------------
  describe("createMessage", () => {
    it("should throw if sender is not a participant in the conversation", async () => {
      // Arrange
      (Participant.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        messageService.createMessage("sender-id", {
          conversationId: "conv-id-123",
          text: "Hello!",
        })
      ).rejects.toThrow("Sender is not a participant in this conversation");
    });

    it("should create a message with text content", async () => {
      // Arrange
      (Participant.findOne as jest.Mock).mockResolvedValue({ id: "participant-id" });
      const savedMessage = {
        _id: "new-msg-id",
      };
      const saveMock = jest.fn().mockResolvedValue(savedMessage);
      (Message as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      const populatedMessage = mockPopulatedMessage({
        id: "new-msg-id",
        text: "Hello!",
      });
      const findByIdChain = {
        populate: jest.fn().mockResolvedValue(populatedMessage),
      };
      (Message.findById as jest.Mock).mockReturnValue(findByIdChain);

      // Act
      const result = await messageService.createMessage("sender-id", {
        conversationId: "conv-id-123",
        text: "Hello!",
      });

      // Assert
      expect(saveMock).toHaveBeenCalled();
      expect(Message.findById).toHaveBeenCalledWith("new-msg-id");
      expect(result.text).toBe("Hello!");
      expect(result.conversationId).toBe("conv-id-123");
    });

    it("should create a message with url and fileName content", async () => {
      // Arrange
      (Participant.findOne as jest.Mock).mockResolvedValue({ id: "participant-id" });
      const savedMessage = { _id: "file-msg-id" };
      const saveMock = jest.fn().mockResolvedValue(savedMessage);
      (Message as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      const populatedMessage = mockPopulatedMessage({
        id: "file-msg-id",
        text: undefined,
        url: "https://cdn.example.com/file.pdf",
        fileName: "file.pdf",
      });
      const findByIdChain = {
        populate: jest.fn().mockResolvedValue(populatedMessage),
      };
      (Message.findById as jest.Mock).mockReturnValue(findByIdChain);

      // Act
      const result = await messageService.createMessage("sender-id", {
        conversationId: "conv-id-123",
        url: "https://cdn.example.com/file.pdf",
        fileName: "file.pdf",
      });

      // Assert
      expect(result.url).toBe("https://cdn.example.com/file.pdf");
      expect(result.fileName).toBe("file.pdf");
    });

    it("should throw if conversationId is not provided", async () => {
      // Act & Assert
      await expect(
        messageService.createMessage("sender-id", {
          text: "Hello!",
        })
      ).rejects.toThrow("conversationId must be set");
    });

    it("should throw if no content field is provided", async () => {
      // Act & Assert
      await expect(
        messageService.createMessage("sender-id", {
          conversationId: "conv-id-123",
        })
      ).rejects.toThrow(
        "At least one content field (text, url, fileName) must be provided"
      );
    });

    it("should update conversation lastMessage and updatedAt on successful creation", async () => {
      // Arrange
      (Participant.findOne as jest.Mock).mockResolvedValue({ id: "participant-id" });
      const savedMessage = { _id: "new-msg-id" };
      const saveMock = jest.fn().mockResolvedValue(savedMessage);
      (Message as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      const populatedMessage = mockPopulatedMessage({
        id: "new-msg-id",
        text: "Hello!",
      });
      const findByIdChain = {
        populate: jest.fn().mockResolvedValue(populatedMessage),
      };
      (Message.findById as jest.Mock).mockReturnValue(findByIdChain);
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      // Act
      await messageService.createMessage("sender-id", {
        conversationId: "conv-id-123",
        text: "Hello!",
      });

      // Assert
      expect(Conversation.updateOne).toHaveBeenCalledWith(
        { _id: "conv-id-123" },
        { 
          lastMessage: "new-msg-id",
          updatedAt: expect.any(Date) 
        }
      );
    });

    it("should throw if message not found after creation", async () => {
      // Arrange
      (Participant.findOne as jest.Mock).mockResolvedValue({ id: "participant-id" });
      const saveMock = jest.fn().mockResolvedValue({ _id: "msg-id" });
      (Message as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));
      const findByIdChain = {
        populate: jest.fn().mockResolvedValue(null),
      };
      (Message.findById as jest.Mock).mockReturnValue(findByIdChain);

      // Act & Assert
      await expect(
        messageService.createMessage("sender-id", {
          conversationId: "conv-id-123",
          text: "Hello!",
        })
      ).rejects.toThrow("Message not found after creation");
    });
  });

  // -----------------------------------------------------------------------
  // getFriendMessages
  // -----------------------------------------------------------------------
  describe("getFriendMessages", () => {
    it("should return direct messages between two users", async () => {
      // Arrange
      const messages = [mockPopulatedMessage()];
      const chain = createFindChain(messages);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      const result = await messageService.getFriendMessages(
        "user-id",
        "friend-id"
      );

      // Assert
      expect(Message.find).toHaveBeenCalledWith({
        $or: [
          { senderId: "user-id", receiverId: "friend-id" },
          { senderId: "friend-id", receiverId: "user-id" },
        ],
        deletedAt: null,
      });
      expect(result).toHaveLength(1);
    });

    it("should support custom limit and before cursor", async () => {
      // Arrange
      const chain = createFindChain([]);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      await messageService.getFriendMessages(
        "user-id",
        "friend-id",
        25,
        "cursor-id"
      );

      // Assert
      expect(Message.find).toHaveBeenCalledWith({
        $or: [
          { senderId: "user-id", receiverId: "friend-id" },
          { senderId: "friend-id", receiverId: "user-id" },
        ],
        deletedAt: null,
        _id: { $lt: "cursor-id" },
      });
      expect(chain.limit).toHaveBeenCalledWith(25);
    });

    it("should throw on database error", async () => {
      // Arrange
      const chain = createFindChain(Promise.reject(new Error("DB error")));
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act & Assert
      await expect(
        messageService.getFriendMessages("user-id", "friend-id")
      ).rejects.toThrow("DB error");
    });
  });

  // -----------------------------------------------------------------------
  // getMessageById
  // -----------------------------------------------------------------------
  describe("getMessageById", () => {
    it("should return MessageDto when message is found", async () => {
      // Arrange
      const message = mockPopulatedMessage();
      const populateChain = {
        populate: jest.fn().mockResolvedValue(message),
      };
      (Message.findOne as jest.Mock).mockReturnValue(populateChain);

      // Act
      const result = await messageService.getMessageById("msg-id-123");

      // Assert
      expect(Message.findOne).toHaveBeenCalledWith({
        _id: "msg-id-123",
        deletedAt: null,
      });
      expect(result).not.toBeNull();
      expect(result!.id).toBe("msg-id-123");
      expect(result!.senderName).toBe("sender");
    });

    it("should return null when message is not found", async () => {
      // Arrange
      const populateChain = {
        populate: jest.fn().mockResolvedValue(null),
      };
      (Message.findOne as jest.Mock).mockReturnValue(populateChain);

      // Act
      const result = await messageService.getMessageById("nonexistent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      // Arrange
      const populateChain = {
        populate: jest
          .fn()
          .mockRejectedValue(new Error("DB connection failed")),
      };
      (Message.findOne as jest.Mock).mockReturnValue(populateChain);

      // Act & Assert
      await expect(
        messageService.getMessageById("msg-id-123")
      ).rejects.toThrow("DB connection failed");
    });
  });

  // -----------------------------------------------------------------------
  // deleteMessage
  // -----------------------------------------------------------------------
  describe("deleteMessage", () => {
    it("should throw if user is not the sender of the message", async () => {
      // Arrange
      const message = mockPopulatedMessage({ senderId: { id: "real-sender-id" } as any });
      (Message.findById as jest.Mock).mockResolvedValue(message);

      // Act & Assert
      await expect(
        messageService.deleteMessage("msg-id-123", "not-sender-id")
      ).rejects.toThrow("You are not authorized to delete this message");
    });

    it("should throw if message not found", async () => {
      // Arrange
      (Message.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        messageService.deleteMessage("nonexistent-id", "sender-id")
      ).rejects.toThrow("Message not found");
    });

    it("should soft delete a message by setting deletedAt", async () => {
      // Arrange
      const message = mockPopulatedMessage({ senderId: { id: "sender-id" } as any });
      (Message.findById as jest.Mock).mockResolvedValue(message);
      (Message.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });
      (Message.find as jest.Mock).mockReturnValue(createFindChain([]));
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      // Act
      await messageService.deleteMessage("msg-id-123", "sender-id");

      // Assert
      expect(Message.updateOne).toHaveBeenCalledWith(
        { _id: "msg-id-123" },
        { deletedAt: expect.any(Date) }
      );
    });

    it("should trigger conversation lastMessage update after delete", async () => {
      // Arrange
      const message = mockPopulatedMessage({ 
        conversationId: "conv-id-123",
        senderId: { id: "sender-id" } as any 
      });
      (Message.findById as jest.Mock).mockResolvedValue(message);
      (Message.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (Conversation.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
      
      const chain = createFindChain([ { _id: "prev-msg-id" } ]);
      (Message.find as jest.Mock).mockReturnValue(chain);

      // Act
      await messageService.deleteMessage("msg-id-123", "sender-id");

      // Assert
      expect(Conversation.updateOne).toHaveBeenCalledWith(
        { _id: "conv-id-123" },
        { 
          lastMessage: "prev-msg-id",
          updatedAt: expect.any(Date) 
        }
      );
    });

    it("should throw on database error", async () => {
      // Arrange
      const message = mockPopulatedMessage({ senderId: { id: "sender-id" } as any });
      (Message.findById as jest.Mock).mockResolvedValue(message);
      (Message.updateOne as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      // Act & Assert
      await expect(
        messageService.deleteMessage("msg-id-123", "sender-id")
      ).rejects.toThrow("DB error");
    });
  });
});
