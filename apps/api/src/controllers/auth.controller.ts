import { Request, Response } from 'express';
import { AuthService, createFingerprint } from '@/services/auth.service';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.signup(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Signup failed:', error);

      if (error.message === 'Email already exists') {
        res.status(409).json({
          code: 409,
          message: 'Email already exists',
          details: 'A user with this email already exists',
        });
        return;
      }

      res.status(500).json({
        code: 500,
        message: 'Signup failed',
        details: 'An unexpected error occurred',
      });
    }
  };

  public signin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, userEntity } = await this.authService.signin(req.body);
      const fingerprint = createFingerprint(req);
      const { accessToken, refreshToken } = await this.authService.createTokens(userEntity, fingerprint);

      res.cookie('accessToken', accessToken, {
        ...config.cookie,
        maxAge: config.cookie.accessMaxAge,
      });

      res.cookie('refreshToken', refreshToken, {
        ...config.cookie,
        maxAge: config.cookie.refreshMaxAge,
      });

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Signin failed:', error);

      res.status(401).json({
        code: 401,
        message: 'Unauthorized',
        details: 'Invalid credentials',
      });
    }
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies?.['refreshToken'];

      if (!refreshToken) {
        res.status(400).json({
          code: 400,
          message: 'Bad Request',
          details: 'Refresh token is required in cookie',
        });
        return;
      }

      const fingerprint = createFingerprint(req);
      const result = await this.authService.refreshToken(refreshToken, fingerprint);

      res.cookie('accessToken', result.accessToken, {
        ...config.cookie,
        maxAge: config.cookie.accessMaxAge,
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...config.cookie,
        maxAge: config.cookie.refreshMaxAge,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.error('Refresh token failed:', error);

      res.status(401).json({
        code: 401,
        message: 'Unauthorized',
        details: error.message || 'Invalid or expired refresh token',
      });
    }
  };

  public signout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Read refresh token from httpOnly cookie
      const refreshToken = req.cookies?.['refreshToken'];
      const userId = req.userId;

      if (!refreshToken) {
        res.status(400).json({
          code: 400,
          message: 'Bad Request',
          details: 'Refresh token is required in cookie',
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          code: 401,
          message: 'Unauthorized',
          details: 'User not authenticated',
        });
        return;
      }

      await this.authService.signout(refreshToken, userId);

      // Clear access token cookie
      // Clear access token cookie
      res.clearCookie('accessToken', config.cookie);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', config.cookie);

      res.status(200).json({
        success: true,
        message: 'Signed out successfully',
      });
    } catch (error: any) {
      logger.error('Signout failed:', error);

      res.status(500).json({
        code: 500,
        message: 'Signout failed',
        details: 'An unexpected error occurred',
      });
    }
  };

  public oauthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as any;

      if (!user) {
        throw new Error('OAuth authentication failed: no user returned');
      }

      const fingerprint = createFingerprint(req);
      const { accessToken, refreshToken } = await this.authService.createTokens(user, fingerprint);

      res.cookie('accessToken', accessToken, {
        ...config.cookie,
        maxAge: config.cookie.accessMaxAge,
      });

      res.cookie('refreshToken', refreshToken, {
        ...config.cookie,
        maxAge: config.cookie.refreshMaxAge,
      });

      const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?success=true`);
    } catch (error: any) {
      logger.error('OAuth callback failed:', error);
      const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
    }
  };

  public me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ code: 401, message: 'Unauthorized', details: 'User not found' });
      return;
    }

    const data: Record<string, any> = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
    if (user.avatar !== undefined) {
      data['avatar'] = user.avatar;
    }

    res.status(200).json({ success: true, data });
  };
}
