import { Router } from 'express';
import { CronController } from '../controllers/cron.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const cronController = new CronController();

// All cron routes require authentication
router.use(authenticateToken);

router.get('/', cronController.listJobs.bind(cronController));
router.post('/', cronController.createJob.bind(cronController));
router.patch('/:id', cronController.updateJob.bind(cronController));
router.delete('/:id', cronController.deleteJob.bind(cronController));
router.post('/:id/trigger', cronController.triggerJob.bind(cronController));

export default router;
