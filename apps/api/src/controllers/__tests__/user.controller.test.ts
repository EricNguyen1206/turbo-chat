import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock the service module
jest.mock('@/services/user.service');
import { UserService } from '@/services/user.service';

const mockedUserService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  searchUsers: jest.fn(),
};
(UserService as any).mockImplementation(() => mockedUserService);

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import controller AFTER mocks are set up
import { UserController } from '@/controllers/user.controller';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserController();
  });

  // ==========================================================================
  // getProfile
  // ==========================================================================
  describe('getProfile', () => {
    it('should return 200 with user profile', async () => {
      const profile = { id: 'user-1', username: 'test', email: 'test@test.com' };
      mockedUserService.getProfile.mockResolvedValue(profile);

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getProfile(req, res);

      expect(mockedUserService.getProfile).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: profile });
    });

    it('should return 500 on error', async () => {
      mockedUserService.getProfile.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1' });
      const res = mockResponse();

      await controller.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to get profile',
        details: 'An unexpected error occurred',
      });
    });
  });

  // ==========================================================================
  // updateProfile
  // ==========================================================================
  describe('updateProfile', () => {
    it('should return 200 with updated profile', async () => {
      const updated = { id: 'user-1', username: 'newname' };
      mockedUserService.updateProfile.mockResolvedValue(updated);

      const req = mockRequest({ userId: 'user-1', body: { username: 'newname' } });
      const res = mockResponse();

      await controller.updateProfile(req, res);

      expect(mockedUserService.updateProfile).toHaveBeenCalledWith('user-1', { username: 'newname' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    it('should return 400 when current password is incorrect', async () => {
      mockedUserService.updateProfile.mockRejectedValue(
        new Error('Current password is incorrect')
      );

      const req = mockRequest({ userId: 'user-1', body: { password: 'wrong' } });
      const res = mockResponse();

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
        details: 'Current password is incorrect',
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockedUserService.updateProfile.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ userId: 'user-1', body: { username: 'newname' } });
      const res = mockResponse();

      await controller.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to update profile',
        details: 'An unexpected error occurred',
      });
    });
  });

  // ==========================================================================
  // searchUsers
  // ==========================================================================
  describe('searchUsers', () => {
    it('should return 200 with search results', async () => {
      const users = [{ id: 'user-2', username: 'testuser' }];
      mockedUserService.searchUsers.mockResolvedValue(users);

      const req = mockRequest({ query: { username: 'test' } });
      const res = mockResponse();

      await controller.searchUsers(req, res);

      expect(mockedUserService.searchUsers).toHaveBeenCalledWith('test');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it('should return 400 when username is missing', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
        details: 'Username query parameter is required',
      });
    });

    it('should return 400 when username is not a string', async () => {
      const req = mockRequest({ query: { username: 123 as any } });
      const res = mockResponse();

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      mockedUserService.searchUsers.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ query: { username: 'test' } });
      const res = mockResponse();

      await controller.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: 'Failed to search users',
        details: 'An unexpected error occurred',
      });
    });
  });
});
