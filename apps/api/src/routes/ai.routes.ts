import { Router } from 'express';
import { AIController } from '@/controllers/ai.controller';

const router = Router();
const aiController = new AIController();

// GET /api/v1/ai/settings
router.get('/settings', aiController.getSettings.bind(aiController));

export { router as aiRoutes };
