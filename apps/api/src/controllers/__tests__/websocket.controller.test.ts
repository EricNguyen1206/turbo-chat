import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock all service modules that WebSocketController constructs internally
jest.mock('@/services/websocket.service');
jest.mock('@/services/conversation.service');
jest.mock('@/services/message.service');
jest.mock('@/services/redis.service');
jest.mock('@/services/presence.service');
jest.mock('@/services/friend.service');
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { WebSocketService } from '@/services/websocket.service';
import { PresenceService } from '@/services/presence.service';

const mockedWsService = {
  getOnlineUsers: jest.fn(),
  getRoomMembers: jest.fn(),
  getRoomMemberCount: jest.fn(),
  broadcastToRoom: jest.fn(),
  getSocket: jest.fn(),
};
(WebSocketService as any).mockImplementation(() => mockedWsService);

const mockedPresenceService = {};
(PresenceService as any).mockImplementation(() => mockedPresenceService);

// Import controller AFTER mocks are set up
import { WebSocketController } from '@/controllers/websocket.controller';

describe('WebSocketController', () => {
  let controller: WebSocketController;
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo = {};
    controller = new WebSocketController(mockIo);
  });

  // ==========================================================================
  // getWebSocketStats
  // ==========================================================================
  describe('getWebSocketStats', () => {
    it('should return 200 with WebSocket stats', async () => {
      const onlineUsers = ['user-1', 'user-2'];
      mockedWsService.getOnlineUsers.mockReturnValue(onlineUsers);

      const req = mockRequest();
      const res = mockResponse();

      await controller.getWebSocketStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          connectedUsers: 2,
          users: onlineUsers,
        },
      });
    });

    it('should return 200 with empty stats when no users online', async () => {
      mockedWsService.getOnlineUsers.mockReturnValue([]);

      const req = mockRequest();
      const res = mockResponse();

      await controller.getWebSocketStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          connectedUsers: 0,
          users: [],
        },
      });
    });

    it('should return 500 on error', async () => {
      mockedWsService.getOnlineUsers.mockImplementation(() => {
        throw new Error('Redis error');
      });

      const req = mockRequest();
      const res = mockResponse();

      await controller.getWebSocketStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  // ==========================================================================
  // getParticipants
  // ==========================================================================
  describe('getParticipants', () => {
    it('should return 200 with participants', async () => {
      const participants = ['user-1', 'user-2'];
      mockedWsService.getRoomMembers.mockReturnValue(participants);
      mockedWsService.getRoomMemberCount.mockReturnValue(2);

      const req = mockRequest({ params: { conversationId: 'conv-1' } });
      const res = mockResponse();

      await controller.getParticipants(req, res);

      expect(mockedWsService.getRoomMembers).toHaveBeenCalledWith('conv-1');
      expect(mockedWsService.getRoomMemberCount).toHaveBeenCalledWith('conv-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          conversationId: 'conv-1',
          participants,
          participantCount: 2,
        },
      });
    });

    it('should return 400 when conversationId is missing', async () => {
      const req = mockRequest({ params: {} });
      const res = mockResponse();

      await controller.getParticipants(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Conversation ID is required',
      });
    });

    it('should return 500 on error', async () => {
      mockedWsService.getRoomMembers.mockImplementation(() => {
        throw new Error('Redis error');
      });

      const req = mockRequest({ params: { conversationId: 'conv-1' } });
      const res = mockResponse();

      await controller.getParticipants(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // broadcastToConversation
  // ==========================================================================
  describe('broadcastToConversation', () => {
    it('should return 200 on successful broadcast', async () => {
      const req = mockRequest({
        params: { conversationId: 'conv-1' },
        body: { message: 'System announcement' },
      });
      const res = mockResponse();

      await controller.broadcastToConversation(req, res);

      expect(mockedWsService.broadcastToRoom).toHaveBeenCalledWith(
        'conv-1',
        'new_message',
        expect.objectContaining({
          conversationId: 'conv-1',
          senderId: '0',
          senderName: 'System',
          text: 'System announcement',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message broadcasted successfully',
      });
    });

    it('should return 400 when conversationId is missing', async () => {
      const req = mockRequest({ params: {}, body: { message: 'hello' } });
      const res = mockResponse();

      await controller.broadcastToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Conversation ID is required',
      });
    });

    it('should return 400 when message is missing', async () => {
      const req = mockRequest({ params: { conversationId: 'conv-1' }, body: {} });
      const res = mockResponse();

      await controller.broadcastToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Message is required',
      });
    });

    it('should return 500 on error', async () => {
      mockedWsService.broadcastToRoom.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      const req = mockRequest({
        params: { conversationId: 'conv-1' },
        body: { message: 'hello' },
      });
      const res = mockResponse();

      await controller.broadcastToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getConnectedUsers
  // ==========================================================================
  describe('getConnectedUsers', () => {
    it('should return 200 with connected users', async () => {
      const users = ['user-1', 'user-2', 'user-3'];
      mockedWsService.getOnlineUsers.mockReturnValue(users);

      const req = mockRequest();
      const res = mockResponse();

      await controller.getConnectedUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users,
          count: 3,
        },
      });
    });

    it('should return 200 with empty list when no users connected', async () => {
      mockedWsService.getOnlineUsers.mockReturnValue([]);

      const req = mockRequest();
      const res = mockResponse();

      await controller.getConnectedUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: [],
          count: 0,
        },
      });
    });

    it('should return 500 on error', async () => {
      mockedWsService.getOnlineUsers.mockImplementation(() => {
        throw new Error('Redis error');
      });

      const req = mockRequest();
      const res = mockResponse();

      await controller.getConnectedUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // disconnectUser
  // ==========================================================================
  describe('disconnectUser', () => {
    it('should return 200 on successful disconnect', async () => {
      const mockSocket = { disconnect: jest.fn() };
      mockedWsService.getOnlineUsers.mockReturnValue(['user-1', 'user-2']);
      mockedWsService.getSocket.mockReturnValue(mockSocket);

      const req = mockRequest({ params: { userId: 'user-1' } });
      const res = mockResponse();

      await controller.disconnectUser(req, res);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User disconnected successfully',
      });
    });

    it('should return 400 when userId is missing', async () => {
      const req = mockRequest({ params: {} });
      const res = mockResponse();

      await controller.disconnectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });
    });

    it('should return 404 when user is not connected', async () => {
      mockedWsService.getOnlineUsers.mockReturnValue(['user-2']);

      const req = mockRequest({ params: { userId: 'user-1' } });
      const res = mockResponse();

      await controller.disconnectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not connected',
      });
    });

    it('should return 404 when socket not found', async () => {
      mockedWsService.getOnlineUsers.mockReturnValue(['user-1']);
      mockedWsService.getSocket.mockReturnValue(null);

      const req = mockRequest({ params: { userId: 'user-1' } });
      const res = mockResponse();

      await controller.disconnectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User socket not found',
      });
    });

    it('should return 500 on error', async () => {
      mockedWsService.getOnlineUsers.mockImplementation(() => {
        throw new Error('Redis error');
      });

      const req = mockRequest({ params: { userId: 'user-1' } });
      const res = mockResponse();

      await controller.disconnectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
