import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock the service module
jest.mock('@/services/auth.service');
import { AuthService, createFingerprint } from '@/services/auth.service';

const mockedAuthService = {
  signup: jest.fn(),
  signin: jest.fn(),
  createTokens: jest.fn(),
  refreshToken: jest.fn(),
  signout: jest.fn(),
};
(AuthService as any).mockImplementation(() => mockedAuthService);

// Mock config
jest.mock('@/config/config', () => ({
  config: {
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
    accessMaxAge: 15 * 60 * 1000,
    refreshMaxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import controller AFTER mocks are set up
import { AuthController } from '@/controllers/auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController();
  });

  // ==========================================================================
  // signup
  // ==========================================================================
  describe('signup', () => {
    it('should return 201 on successful signup', async () => {
      const result = { id: '1', username: 'test', email: 'test@test.com' };
      mockedAuthService.signup.mockResolvedValue(result);

      const req = mockRequest({ body: { username: 'test', email: 'test@test.com', password: 'pass' } });
      const res = mockResponse();

      await controller.signup(req, res);

      expect(mockedAuthService.signup).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    it('should return 409 when email already exists', async () => {
      mockedAuthService.signup.mockRejectedValue(new Error('Email already exists'));

      const req = mockRequest({ body: { email: 'dup@test.com' } });
      const res = mockResponse();

      await controller.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        code: 409,
        message: 'Email already exists',
        details: 'A user with this email already exists',
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockedAuthService.signup.mockRejectedValue(new Error('DB down'));

      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await controller.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: 'Signup failed',
        details: 'An unexpected error occurred',
      });
    });
  });

  // ==========================================================================
  // signin
  // ==========================================================================
  describe('signin', () => {
    it('should return 200 and set cookies on successful signin', async () => {
      const user = { id: '1', username: 'test', email: 'test@test.com' };
      const userEntity = { id: '1', username: 'test', email: 'test@test.com', createdAt: new Date() };
      mockedAuthService.signin.mockResolvedValue({ user, userEntity });
      (createFingerprint as jest.Mock).mockReturnValue('fp');
      mockedAuthService.createTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const req = mockRequest({ body: { email: 'test@test.com', password: 'pass' } });
      const res = mockResponse();

      await controller.signin(req, res);

      expect(mockedAuthService.signin).toHaveBeenCalledWith(req.body);
      expect(createFingerprint).toHaveBeenCalledWith(req);
      expect(mockedAuthService.createTokens).toHaveBeenCalledWith(userEntity, 'fp');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: user });
    });

    it('should return 401 on signin error', async () => {
      mockedAuthService.signin.mockRejectedValue(new Error('Invalid credentials'));

      const req = mockRequest({ body: { email: 'test@test.com', password: 'wrong' } });
      const res = mockResponse();

      await controller.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Unauthorized',
        details: 'Invalid credentials',
      });
    });
  });

  // ==========================================================================
  // refresh
  // ==========================================================================
  describe('refresh', () => {
    it('should return 400 when no refresh token cookie', async () => {
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();

      await controller.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
        details: 'Refresh token is required in cookie',
      });
    });

    it('should return 200 and set cookies on successful refresh', async () => {
      (createFingerprint as jest.Mock).mockReturnValue('fp');
      mockedAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const req = mockRequest({ cookies: { refreshToken: 'old-refresh' } });
      const res = mockResponse();

      await controller.refresh(req, res);

      expect(createFingerprint).toHaveBeenCalledWith(req);
      expect(mockedAuthService.refreshToken).toHaveBeenCalledWith('old-refresh', 'fp');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
      });
    });

    it('should return 401 on refresh error', async () => {
      mockedAuthService.refreshToken.mockRejectedValue(new Error('Token expired'));

      const req = mockRequest({ cookies: { refreshToken: 'bad-token' } });
      const res = mockResponse();

      await controller.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Unauthorized',
        details: 'Token expired',
      });
    });
  });

  // ==========================================================================
  // signout
  // ==========================================================================
  describe('signout', () => {
    it('should return 400 when no refresh token cookie', async () => {
      const req = mockRequest({ cookies: {}, userId: 'user-1' });
      const res = mockResponse();

      await controller.signout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
        details: 'Refresh token is required in cookie',
      });
    });

    it('should return 401 when no userId', async () => {
      const req = mockRequest({ cookies: { refreshToken: 'token' }, userId: undefined });
      const res = mockResponse();

      await controller.signout(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Unauthorized',
        details: 'User not authenticated',
      });
    });

    it('should return 200 and clear cookies on successful signout', async () => {
      mockedAuthService.signout.mockResolvedValue(undefined);

      const req = mockRequest({ cookies: { refreshToken: 'token' }, userId: 'user-1' });
      const res = mockResponse();

      await controller.signout(req, res);

      expect(mockedAuthService.signout).toHaveBeenCalledWith('token', 'user-1');
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Signed out successfully',
      });
    });

    it('should return 500 on signout error', async () => {
      mockedAuthService.signout.mockRejectedValue(new Error('DB error'));

      const req = mockRequest({ cookies: { refreshToken: 'token' }, userId: 'user-1' });
      const res = mockResponse();

      await controller.signout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: 'Signout failed',
        details: 'An unexpected error occurred',
      });
    });
  });

  // ==========================================================================
  // oauthCallback
  // ==========================================================================
  describe('oauthCallback', () => {
    it('should redirect with success on valid user', async () => {
      const user = { id: '1', username: 'test', email: 'test@test.com', createdAt: new Date() };
      (createFingerprint as jest.Mock).mockReturnValue('fp');
      mockedAuthService.createTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const req = mockRequest({ user });
      const res = mockResponse();

      await controller.oauthCallback(req, res);

      expect(mockedAuthService.createTokens).toHaveBeenCalledWith(user, 'fp');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback?success=true')
      );
    });

    it('should redirect with error when no user', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await controller.oauthCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback?error=')
      );
    });
  });

  // ==========================================================================
  // me
  // ==========================================================================
  describe('me', () => {
    it('should return 200 with user data when user is authenticated', async () => {
      const user = {
        id: '1',
        username: 'test',
        email: 'test@test.com',
        createdAt: '2024-01-01',
        avatar: 'avatar-url',
      };

      const req = mockRequest({ user });
      const res = mockResponse();

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '1',
          username: 'test',
          email: 'test@test.com',
          createdAt: '2024-01-01',
          avatar: 'avatar-url',
        },
      });
    });

    it('should return 401 when no user', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Unauthorized',
        details: 'User not found',
      });
    });

    it('should omit avatar field when it is undefined', async () => {
      const user = {
        id: '1',
        username: 'test',
        email: 'test@test.com',
        createdAt: '2024-01-01',
      };

      const req = mockRequest({ user });
      const res = mockResponse();

      await controller.me(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: '1',
          username: 'test',
          email: 'test@test.com',
          createdAt: '2024-01-01',
        },
      });
      const calledData = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(calledData).not.toHaveProperty('avatar');
    });
  });
});
