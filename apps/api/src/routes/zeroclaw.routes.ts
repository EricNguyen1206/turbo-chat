import { Router } from 'express';
import { ZeroClawProxyController } from '../controllers/zeroclaw.proxy.controller';

const router = Router();
const controller = new ZeroClawProxyController();

// Pairing (no auth required — this establishes the zeroclaw token)
router.post('/pair', controller.pair.bind(controller));

// All other routes require erion-raven JWT auth (applied in routes/index.ts)
router.get('/status', controller.getStatus.bind(controller));
router.get('/health', controller.getHealth.bind(controller));

router.get('/config', controller.getConfig.bind(controller));
router.put('/config', controller.putConfig.bind(controller));

router.get('/tools', controller.getTools.bind(controller));

router.get('/memory', controller.getMemory.bind(controller));
router.post('/memory', controller.storeMemory.bind(controller));
router.delete('/memory/:key', controller.deleteMemory.bind(controller));

router.get('/cost', controller.getCost.bind(controller));
router.get('/integrations', controller.getIntegrations.bind(controller));
router.post('/doctor', controller.runDoctor.bind(controller));
router.get('/cli-tools', controller.getCliTools.bind(controller));

export default router;
