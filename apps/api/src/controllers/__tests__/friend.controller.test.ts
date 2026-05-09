import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock the service modules
jest.mock('@/services/friend.service');
jest.mock('@/services/redis.service');
jest.mock('@/services/presence.service');
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { FriendService } from '@/services/friend.service';
import { RedisService } from '@/services/redis.service';
import { PresenceService } from '@/services/presence.service';

const mockedFriendService = {
  sendFriendRequest: jest.fn(),
  acceptFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  getFriendRequests: jest.fn(),
  getFriends: jest.fn(),
};
(FriendService as any).mockImplementation(() => mockedFriendService);

const mockedRedisService = {};
(RedisService as any).mockImplementation(() => mockedRedisService);

const mockedPresenceService = {
  getFriendsOnlineStatus: jest.fn(),
};
(PresenceService as any).mockImplementation(() => mockedPresenceService);

// Import controller AFTER mocks are set up
import { FriendController } from '@/controllers/friend.controller';

describe('FriendController', () => {
  let controller: FriendController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FriendController();
  });

  // ==========================================================================
  // sendFriendRequest
  // ==========================================================================
  describe('sendFriendRequest', () => {
    it('should return 201 on successful friend request', async () => {
      const friendRequest = { id: 'fr-1', fromUserId: 'user-1', toUserId: 'user-2', status: 'PENDING' };
      mockedFriendService.sendFriendRequest.mockResolvedValue(friendRequest);

      const req = mockRequest({ userId: 'user-1', body: { toUserId: 'user-2' } });
      const res = mockResponse();

      await controller.sendFriendRequest(req, res);

      expect(mockedFriendService.sendFriendRequest).toHaveBeenCalledWith('user-1', 'user-2');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: friendRequest,
        message: 'Friend request sent successfully',
      });
    });

    it('should return 400 when sending request to yourself', async () => {
      mockedFriendService.sendFriendRequest.mockRejectedValue(
        new Error('You cannot send a friend request to yourself')
      );

      const req = mockRequest({ userId: 'user-1', body: { toUserId: 'user-1' } });
      const res = mockResponse();

      await controller.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when request already sent', async () => {
      mockedFriendService.sendFriendRequest.mockRejectedValue(
        new Error('Friend request already sent')
      );

      const req = mockRequest({ userId: 'user-1', body: { toUserId: 'user-2' } });
      const res = mockResponse();

      await controller.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when target user not found', async () => {
      mockedFriendService.sendFriendRequest.mockRejectedValue(
        new Error('User not found')
      );

      const req = mockRequest({ userId: 'user-1', body: { toUserId: 'user-x' } });
      const res = mockResponse();

      await controller.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on unexpected error', async () => {
      mockedFriendService.sendFriendRequest.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1', body: { toUserId: 'user-2' } });
      const res = mockResponse();

      await controller.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // acceptFriendRequest
  // ==========================================================================
  describe('acceptFriendRequest', () => {
    it('should return 200 on successful accept', async () => {
      const friendship = { id: 'f-1' };
      mockedFriendService.acceptFriendRequest.mockResolvedValue(friendship);

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.acceptFriendRequest(req, res);

      expect(mockedFriendService.acceptFriendRequest).toHaveBeenCalledWith('fr-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: friendship,
        message: 'Friend request accepted successfully',
      });
    });

    it('should return 400 when requestId is missing', async () => {
      const req = mockRequest({ userId: 'user-1', params: {} });
      const res = mockResponse();

      await controller.acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when request not found', async () => {
      mockedFriendService.acceptFriendRequest.mockRejectedValue(
        new Error('Request not found')
      );

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-x' } });
      const res = mockResponse();

      await controller.acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when not authorized', async () => {
      mockedFriendService.acceptFriendRequest.mockRejectedValue(
        new Error('not authorized to accept')
      );

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      mockedFriendService.acceptFriendRequest.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // declineFriendRequest
  // ==========================================================================
  describe('declineFriendRequest', () => {
    it('should return 200 on successful decline', async () => {
      mockedFriendService.declineFriendRequest.mockResolvedValue(undefined);

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.declineFriendRequest(req, res);

      expect(mockedFriendService.declineFriendRequest).toHaveBeenCalledWith('fr-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Friend request declined successfully',
      });
    });

    it('should return 400 when requestId is missing', async () => {
      const req = mockRequest({ userId: 'user-1', params: {} });
      const res = mockResponse();

      await controller.declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when request not found', async () => {
      mockedFriendService.declineFriendRequest.mockRejectedValue(
        new Error('Request not found')
      );

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-x' } });
      const res = mockResponse();

      await controller.declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when not authorized', async () => {
      mockedFriendService.declineFriendRequest.mockRejectedValue(
        new Error('not authorized to decline')
      );

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected error', async () => {
      mockedFriendService.declineFriendRequest.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1', params: { requestId: 'fr-1' } });
      const res = mockResponse();

      await controller.declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getFriendRequests
  // ==========================================================================
  describe('getFriendRequests', () => {
    it('should return 200 with friend requests', async () => {
      const requests = { sent: [], received: [] };
      mockedFriendService.getFriendRequests.mockResolvedValue(requests);

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriendRequests(req, res);

      expect(mockedFriendService.getFriendRequests).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: requests });
    });

    it('should return 500 on error', async () => {
      mockedFriendService.getFriendRequests.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriendRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getFriends
  // ==========================================================================
  describe('getFriends', () => {
    it('should return 200 with friends list', async () => {
      const friends = [{ id: 'user-2', username: 'friend1' }];
      mockedFriendService.getFriends.mockResolvedValue(friends);

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriends(req, res);

      expect(mockedFriendService.getFriends).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: friends });
    });

    it('should return 500 on error', async () => {
      mockedFriendService.getFriends.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriends(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // getFriendsOnlineStatus
  // ==========================================================================
  describe('getFriendsOnlineStatus', () => {
    it('should return 200 with online statuses', async () => {
      const statuses = [{ userId: 'user-2', online: true }];
      mockedPresenceService.getFriendsOnlineStatus.mockResolvedValue(statuses);

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriendsOnlineStatus(req, res);

      expect(mockedPresenceService.getFriendsOnlineStatus).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { statuses } });
    });

    it('should return 500 on error', async () => {
      mockedPresenceService.getFriendsOnlineStatus.mockRejectedValue(new Error('Redis error'));

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getFriendsOnlineStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
