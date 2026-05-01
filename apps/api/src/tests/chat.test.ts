import { WebSocketService } from '../services/websocket.service';
import { RedisService } from '../services/redis.service';
import { MessageService } from '../services/message.service';
import { ConversationService } from '../services/conversation.service';
import { SocketEvent, ConversationType } from '@turbo-chat/types';
import { Socket } from 'socket.io';
import { Participant } from '../models/Participant';

// Mock dependencies
jest.mock('../services/redis.service');
jest.mock('../services/message.service');
jest.mock('../services/conversation.service');
jest.mock('@/utils/logger');
jest.mock('../models/Participant', () => ({
  Participant: {
    updateMany: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([{ userId: '507f191e810c19729de860ea' }]),
    }),
  },
}));

describe('Chat Flow 1-1', () => {
  let webSocketService: WebSocketService;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockMessageService: jest.Mocked<MessageService>;
  let mockConversationService: jest.Mocked<ConversationService>;

  beforeEach(() => {
    mockRedisService = new RedisService() as jest.Mocked<RedisService>;
    mockMessageService = new MessageService() as jest.Mocked<MessageService>;
    mockConversationService = new ConversationService() as jest.Mocked<ConversationService>;

    webSocketService = new WebSocketService(
      mockRedisService,
      mockMessageService,
      mockConversationService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow user to connect, join room and send message', async () => {
    const userId = '507f191e810c19729de860ea';
    const username = 'testuser';
    const conversationId = '507f191e810c19729de860eb';
    const messageText = 'Hello 1-1';

    // 1. Mock Socket
    const mockSocket = {
      id: 'socket-id-1',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;

    // 2. Mock registration
    await webSocketService.registerClient(userId, mockSocket);
    expect(mockRedisService.setUserOnline).toHaveBeenCalledWith(userId);

    // 3. Mock joining room
    mockConversationService.findById.mockResolvedValue({
      id: conversationId,
      _id: conversationId,
      type: ConversationType.DIRECT,
    } as any);

    await webSocketService.handleJoinConversation(userId, username, conversationId);

    expect(mockConversationService.findById).toHaveBeenCalledWith(conversationId);
    expect(mockSocket.join).toHaveBeenCalledWith(conversationId);
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvent.JOINED_CONVERSATION, expect.objectContaining({
      conversation_id: conversationId,
      user_id: userId
    }));

    // 4. Mock sending message
    mockMessageService.createMessage.mockResolvedValue({
      id: 'msg789',
      text: messageText,
      createdAt: new Date().toISOString(),
      senderAvatar: 'avatar-url'
    } as any);

    await webSocketService.handleSendMessage(userId, username, conversationId, messageText);

    expect(mockMessageService.createMessage).toHaveBeenCalledWith(userId, {
      conversationId: conversationId,
      text: messageText
    });

    expect(Participant.updateMany).toHaveBeenCalled();

    // Broadcast to room (including sender in this implementation)
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvent.NEW_MESSAGE, expect.objectContaining({
      text: messageText,
      senderId: userId
    }));
  });

  it('should fail if authentication token is missing (Middleware check)', async () => {
    // This part is usually tested in middleware tests, but we can verify the middleware logic here
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { socketAuthMiddleware } = require('../middleware/socketAuth.middleware');
    const mockNext = jest.fn();
    const mockSocket = {
      handshake: {
        headers: {
          cookie: 'otherCookie=someValue'
        }
      },
      id: 'socket-id-2'
    } as any;

    await socketAuthMiddleware(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
  });
});
