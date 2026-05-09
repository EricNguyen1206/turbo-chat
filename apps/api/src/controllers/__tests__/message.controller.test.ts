import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock the service module
jest.mock('@/services/message.service');
import { MessageService } from '@/services/message.service';

const mockedMessageService = {
  getConversationMessages: jest.fn(),
  createMessage: jest.fn(),
  getFriendMessages: jest.fn(),
  getMessageById: jest.fn(),
  deleteMessage: jest.fn(),
};
(MessageService as any).mockImplementation(() => mockedMessageService);

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import controller AFTER mocks are set up
import { MessageController } from '@/controllers/message.controller';

describe('MessageController', () => {
  let controller: MessageController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MessageController();
  });

  // ==========================================================================
  // getConversationMessages
  // ==========================================================================
  describe('getConversationMessages', () => {
    it('should return 200 with messages', async () => {
      const messages = [{ id: 'msg-1', text: 'hello' }];
      mockedMessageService.getConversationMessages.mockResolvedValue(messages);

      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '20' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(mockedMessageService.getConversationMessages).toHaveBeenCalledWith('conv-1', 20, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: messages,
        pagination: { limit: 20, before: undefined, hasMore: false },
      });
    });

    it('should return 400 when conversationId is missing', async () => {
      const req = mockRequest({ params: {}, query: {} });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid conversation ID' })
      );
    });

    it('should return 400 when limit is invalid (non-numeric)', async () => {
      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: 'abc' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Limit must be a number between 1 and 100' })
      );
    });

    it('should return 400 when limit is less than 1', async () => {
      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '0' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when limit is greater than 100', async () => {
      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '101' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when before is not a valid ObjectId (length != 24)', async () => {
      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '20', before: 'short' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Before must be a valid MongoDB ObjectId' })
      );
    });

    it('should accept valid before parameter', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      mockedMessageService.getConversationMessages.mockResolvedValue([]);

      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '20', before: validObjectId } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(mockedMessageService.getConversationMessages).toHaveBeenCalledWith('conv-1', 20, validObjectId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return hasMore true when messages length equals limit', async () => {
      const messages = Array(20).fill({ id: 'msg', text: 'hi' });
      mockedMessageService.getConversationMessages.mockResolvedValue(messages);

      const req = mockRequest({ params: { id: 'conv-1' }, query: { limit: '20' } });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pagination: expect.objectContaining({ hasMore: true }) })
      );
    });

    it('should return 500 on service error', async () => {
      mockedMessageService.getConversationMessages.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ params: { id: 'conv-1' }, query: {} });
      const res = mockResponse();

      await controller.getConversationMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // createMessage
  // ==========================================================================
  describe('createMessage', () => {
    it('should return 201 on successful message creation', async () => {
      const message = { id: 'msg-1', text: 'hello', conversationId: 'conv-1' };
      mockedMessageService.createMessage.mockResolvedValue(message);

      const req = mockRequest({
        user: { id: 'user-1' },
        body: { conversationId: 'conv-1', text: 'hello' },
      });
      const res = mockResponse();

      await controller.createMessage(req, res);

      expect(mockedMessageService.createMessage).toHaveBeenCalledWith('user-1', {
        conversationId: 'conv-1',
        receiverId: undefined,
        text: 'hello',
        url: undefined,
        fileName: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: message });
    });

    it('should return 400 when both conversationId and receiverId are missing', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { text: 'hello' },
      });
      const res = mockResponse();

      await controller.createMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Either conversationId or receiverId must be provided' })
      );
    });

    it('should return 400 when both conversationId and receiverId are provided', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { conversationId: 'conv-1', receiverId: 'user-2', text: 'hello' },
      });
      const res = mockResponse();

      await controller.createMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot specify both conversationId and receiverId' })
      );
    });

    it('should return 400 when no content (text, url, fileName) is provided', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { conversationId: 'conv-1' },
      });
      const res = mockResponse();

      await controller.createMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'At least one content field (text, url, fileName) must be provided',
        })
      );
    });

    it('should return 500 on service error', async () => {
      mockedMessageService.createMessage.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({
        user: { id: 'user-1' },
        body: { conversationId: 'conv-1', text: 'hello' },
      });
      const res = mockResponse();

      await controller.createMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getFriendMessages
  // ==========================================================================
  describe('getFriendMessages', () => {
    it('should return 200 with friend messages', async () => {
      const messages = [{ id: 'msg-1', text: 'hello' }];
      mockedMessageService.getFriendMessages.mockResolvedValue(messages);

      const req = mockRequest({ user: { id: 'user-1' }, params: { friendId: 'user-2' } });
      const res = mockResponse();

      await controller.getFriendMessages(req, res);

      expect(mockedMessageService.getFriendMessages).toHaveBeenCalledWith('user-1', 'user-2');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: messages });
    });

    it('should return 400 when friendId is missing', async () => {
      const req = mockRequest({ user: { id: 'user-1' }, params: {} });
      const res = mockResponse();

      await controller.getFriendMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockedMessageService.getFriendMessages.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' }, params: { friendId: 'user-2' } });
      const res = mockResponse();

      await controller.getFriendMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getMessageById
  // ==========================================================================
  describe('getMessageById', () => {
    it('should return 200 with message', async () => {
      const message = { id: 'msg-1', text: 'hello' };
      mockedMessageService.getMessageById.mockResolvedValue(message);

      const req = mockRequest({ params: { id: 'msg-1' } });
      const res = mockResponse();

      await controller.getMessageById(req, res);

      expect(mockedMessageService.getMessageById).toHaveBeenCalledWith('msg-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: message });
    });

    it('should return 400 when messageId is missing', async () => {
      const req = mockRequest({ params: {} });
      const res = mockResponse();

      await controller.getMessageById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when message not found', async () => {
      mockedMessageService.getMessageById.mockResolvedValue(null);

      const req = mockRequest({ params: { id: 'msg-x' } });
      const res = mockResponse();

      await controller.getMessageById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Message not found' })
      );
    });

    it('should return 500 on service error', async () => {
      mockedMessageService.getMessageById.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ params: { id: 'msg-1' } });
      const res = mockResponse();

      await controller.getMessageById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // deleteMessage
  // ==========================================================================
  describe('deleteMessage', () => {
    it('should return 200 on successful delete', async () => {
      mockedMessageService.deleteMessage.mockResolvedValue(undefined);

      const req = mockRequest({ params: { id: 'msg-1' }, user: { id: 'user-1' } });
      const res = mockResponse();

      await controller.deleteMessage(req, res);

      expect(mockedMessageService.deleteMessage).toHaveBeenCalledWith('msg-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message deleted successfully',
      });
    });

    it('should return 400 when messageId is missing', async () => {
      const req = mockRequest({ params: {}, user: { id: 'user-1' } });
      const res = mockResponse();

      await controller.deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when user is missing', async () => {
      const req = mockRequest({ params: { id: 'msg-1' } });
      const res = mockResponse();

      await controller.deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 on service error', async () => {
      mockedMessageService.deleteMessage.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ params: { id: 'msg-1' }, user: { id: 'user-1' } });
      const res = mockResponse();

      await controller.deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
