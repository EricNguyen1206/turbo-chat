import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { validateDto } from '@/middleware/validation.middleware';
import { UpdateProfileDto } from '@turbo-chat/validators';

const router = Router();
const userController = new UserController();

// GET /api/v1/users/profile
router.get('/profile', userController.getProfile.bind(userController));

// PUT /api/v1/users/profile
router.put('/profile', validateDto(UpdateProfileDto), userController.updateProfile.bind(userController));

// GET /api/v1/users/search
router.get('/search', userController.searchUsers.bind(userController));

export { router as userRoutes };
