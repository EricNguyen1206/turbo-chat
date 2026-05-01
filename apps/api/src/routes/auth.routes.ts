import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '@/controllers/auth.controller';
import { validateDto } from '@/middleware/validation.middleware';
import { authenticateToken } from '@/middleware/auth.middleware';
import { SignupRequestDto, SigninRequestDto } from '@turbo-chat/validators';

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/signup
router.post('/signup', validateDto(SignupRequestDto), authController.signup.bind(authController));

// POST /api/v1/auth/signin
router.post('/signin', validateDto(SigninRequestDto), authController.signin.bind(authController));

// GET /api/v1/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/v1/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  authController.oauthCallback.bind(authController)
);

// GET /api/v1/auth/github
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GET /api/v1/auth/github/callback
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  authController.oauthCallback.bind(authController)
);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh.bind(authController));

// GET /api/v1/auth/me
router.get('/me', authenticateToken, authController.me.bind(authController));

// POST /api/v1/auth/signout
router.post('/signout', authenticateToken, authController.signout.bind(authController));

export { router as authRoutes };
