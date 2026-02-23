import { Router } from 'express';
import { SkillsController } from '../controllers/skills.controller';

const router = Router();
const skillsController = new SkillsController();

// Marketplace / Discovery
router.get('/explore', skillsController.explore.bind(skillsController));
router.get('/search', skillsController.search.bind(skillsController));

// Management
router.get('/list', skillsController.listInstalled.bind(skillsController));
router.post('/install', skillsController.install.bind(skillsController));
router.post('/uninstall', skillsController.uninstall.bind(skillsController));

export default router;
