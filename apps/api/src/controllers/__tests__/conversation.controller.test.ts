import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';
import { ConversationType } from '@turbo-chat/types';

// Mock the service module
jest.mock('@/services/conversation.service');
import { ConversationService } from '@/services/conversation.service';

const mockedConversationService = {
  getAllConversation: jest.fn(),
  createConversation: jest.fn(),
  getConversationById: jest.fn(),
  updateConversation: jest.fn(),
  deleteConversation: jest.fn(),
  addUserToConversation: jest.fn(),
  leaveConversation: jest.fn(),
  removeUserFromConversation: jest.fn(),
  markConversationAsRead: jest.fn(),
};
(ConversationService as any).mockImplementation(() => mockedConversationService);

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import controller AFTER mocks are set up
import { ConversationController } from '@/controllers/conversation.controller';

describe('ConversationController', () => {
  let controller: ConversationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ConversationController();
  });

  // ==========================================================================
  // getUserConversations
  // ==========================================================================
  describe('getUserConversations', () => {
    it('should return 200 with conversations', async () => {
      const conversations = { direct: [], group: [] };
      mockedConversationService.getAllConversation.mockResolvedValue(conversations);

      const req = mockRequest({ user: { id: 'user-1' } });
      const res = mockResponse();

      await controller.getUserConversations(req, res);

      expect(mockedConversationService.getAllConversation).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Success' })
      );
    });

    it('should return 500 on error', async () => {
      mockedConversationService.getAllConversation.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' } });
      const res = mockResponse();

      await controller.getUserConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // createConversation
  // ==========================================================================
  describe('createConversation', () => {
    it('should return 400 when fields are missing', async () => {
      const req = mockRequest({ user: { id: 'user-1' }, body: { name: 'test' } });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing required fields: name, type, userIds' })
      );
    });

    it('should return 400 when type is invalid', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'test', type: 'INVALID' as any, userIds: ['user-2'] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid conversation type' })
      );
    });

    it('should return 400 when DIRECT has != 1 other user', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'dm', type: ConversationType.DIRECT, userIds: ['user-2', 'user-3'] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Direct message conversation must have exactly 1 other user',
        })
      );
    });

    it('should return 400 when GROUP has 0 other users', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'grp', type: ConversationType.GROUP, userIds: [] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Group conversation must have 1-3 other users',
        })
      );
    });

    it('should return 400 when GROUP has more than 3 other users', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'grp', type: ConversationType.GROUP, userIds: ['u2', 'u3', 'u4', 'u5'] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Group conversation must have 1-3 other users',
        })
      );
    });

    it('should return 201 on successful creation', async () => {
      const conversation = { id: 'conv-1', name: 'test', type: ConversationType.DIRECT, ownerId: 'user-1' };
      mockedConversationService.createConversation.mockResolvedValue(conversation);

      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'test', type: ConversationType.DIRECT, userIds: ['user-2'] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'conv-1',
          name: 'test',
          type: ConversationType.DIRECT,
          ownerId: 'user-1',
        },
      });
    });

    it('should return 500 on service error', async () => {
      mockedConversationService.createConversation.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({
        user: { id: 'user-1' },
        body: { name: 'test', type: ConversationType.DIRECT, userIds: ['user-2'] },
      });
      const res = mockResponse();

      await controller.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getConversationById
  // ==========================================================================
  describe('getConversationById', () => {
    it('should return 200 with conversation data', async () => {
      const conversation = { id: 'conv-1', name: 'test' };
      mockedConversationService.getConversationById.mockResolvedValue(conversation);

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Success' })
      );
    });

    it('should return 404 when conversation not found (null)', async () => {
      mockedConversationService.getConversationById.mockResolvedValue(null);

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-x' } });
      const res = mockResponse();

      await controller.getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when service throws Conversation not found', async () => {
      mockedConversationService.getConversationById.mockRejectedValue(
        new Error('Conversation not found')
      );

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      mockedConversationService.getConversationById.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // updateConversation
  // ==========================================================================
  describe('updateConversation', () => {
    it('should return 200 on successful update', async () => {
      mockedConversationService.updateConversation.mockResolvedValue(undefined);

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: { name: 'updated' },
      });
      const res = mockResponse();

      await controller.updateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Conversation updated successfully' })
      );
    });

    it('should return 400 when name is missing', async () => {
      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: {},
      });
      const res = mockResponse();

      await controller.updateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when conversation not found', async () => {
      mockedConversationService.updateConversation.mockRejectedValue(
        new Error('Conversation not found')
      );

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: { name: 'updated' },
      });
      const res = mockResponse();

      await controller.updateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      mockedConversationService.updateConversation.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: { name: 'updated' },
      });
      const res = mockResponse();

      await controller.updateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // deleteConversation
  // ==========================================================================
  describe('deleteConversation', () => {
    it('should return 200 on successful delete', async () => {
      mockedConversationService.deleteConversation.mockResolvedValue(undefined);

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
      });
      const res = mockResponse();

      await controller.deleteConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Conversation deleted successfully' })
      );
    });

    it('should return 404 when conversation not found', async () => {
      mockedConversationService.deleteConversation.mockRejectedValue(
        new Error('Conversation not found')
      );

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.deleteConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when not owner', async () => {
      mockedConversationService.deleteConversation.mockRejectedValue(
        new Error('Only conversation owner can delete conversation')
      );

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.deleteConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on unexpected error', async () => {
      mockedConversationService.deleteConversation.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.deleteConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // addUserToConversation
  // ==========================================================================
  describe('addUserToConversation', () => {
    it('should return 200 on successful add', async () => {
      mockedConversationService.addUserToConversation.mockResolvedValue(undefined);

      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: { userId: 'target-1' },
      });
      const res = mockResponse();

      await controller.addUserToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'User added to conversation successfully' })
      );
    });

    it('should return 400 when target userId is missing', async () => {
      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: {},
      });
      const res = mockResponse();

      await controller.addUserToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when not owner', async () => {
      mockedConversationService.addUserToConversation.mockRejectedValue(
        new Error('Only conversation owner can add users')
      );

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: { userId: 'target-1' },
      });
      const res = mockResponse();

      await controller.addUserToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when target user not found', async () => {
      mockedConversationService.addUserToConversation.mockRejectedValue(
        new Error('Target user not found')
      );

      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: { userId: 'target-x' },
      });
      const res = mockResponse();

      await controller.addUserToConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // leaveConversation
  // ==========================================================================
  describe('leaveConversation', () => {
    it('should return 200 on successful leave', async () => {
      mockedConversationService.leaveConversation.mockResolvedValue(undefined);

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.leaveConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Left conversation successfully' })
      );
    });

    it('should return 404 when conversation not found', async () => {
      mockedConversationService.leaveConversation.mockRejectedValue(
        new Error('Conversation not found')
      );

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.leaveConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when user not found', async () => {
      mockedConversationService.leaveConversation.mockRejectedValue(
        new Error('User not found')
      );

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.leaveConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      mockedConversationService.leaveConversation.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.leaveConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // removeUserFromConversation
  // ==========================================================================
  describe('removeUserFromConversation', () => {
    it('should return 200 on successful removal', async () => {
      mockedConversationService.removeUserFromConversation.mockResolvedValue(undefined);

      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: { userId: 'target-1' },
      });
      const res = mockResponse();

      await controller.removeUserFromConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'User removed from conversation successfully' })
      );
    });

    it('should return 400 when target userId is missing', async () => {
      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: {},
      });
      const res = mockResponse();

      await controller.removeUserFromConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when not owner', async () => {
      mockedConversationService.removeUserFromConversation.mockRejectedValue(
        new Error('Only conversation owner can remove users')
      );

      const req = mockRequest({
        user: { id: 'user-1' },
        params: { id: 'conv-1' },
        body: { userId: 'target-1' },
      });
      const res = mockResponse();

      await controller.removeUserFromConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 when trying to remove owner', async () => {
      mockedConversationService.removeUserFromConversation.mockRejectedValue(
        new Error('Cannot remove conversation owner')
      );

      const req = mockRequest({
        user: { id: 'owner-1' },
        params: { id: 'conv-1' },
        body: { userId: 'owner-1' },
      });
      const res = mockResponse();

      await controller.removeUserFromConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // markAsRead
  // ==========================================================================
  describe('markAsRead', () => {
    it('should return 200 on successful mark as read', async () => {
      mockedConversationService.markConversationAsRead.mockResolvedValue(undefined);

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.markAsRead(req, res);

      expect(mockedConversationService.markConversationAsRead).toHaveBeenCalledWith('user-1', 'conv-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Conversation marked as read' })
      );
    });

    it('should return 400 when conversation id is missing', async () => {
      const req = mockRequest({ user: { id: 'user-1' }, params: {} });
      const res = mockResponse();

      await controller.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      mockedConversationService.markConversationAsRead.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ user: { id: 'user-1' }, params: { id: 'conv-1' } });
      const res = mockResponse();

      await controller.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
