import { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { conversationRoutes } from './conversation.routes';
import { aiRoutes } from './ai.routes';
import messageRoutes from './message.routes';
import uploadRoutes from './upload.route';
import websocketRoutes, { initializeWebSocketRoutes } from './websocket.routes';
import voiceRoutes from './voice.routes';
import skillsRoutes from './skills.routes';
import cronRoutes from './cron.routes';
import { generalRateLimit, authRateLimit } from '@/middleware/rateLimit.middleware';
import { authenticateToken } from '@/middleware/auth.middleware';
export const setupRoutes = (app: Application, io: SocketIOServer): void => {
  // Initialize WebSocket routes
  initializeWebSocketRoutes(io);

  // API version prefix
  const apiPrefix = '/api/v1';

  // Public routes (no authentication required)
  app.use(`${apiPrefix}/auth`, authRateLimit, authRoutes);

  // Protected routes (authentication required)
  app.use(`${apiPrefix}/users`, generalRateLimit, authenticateToken, userRoutes);
  app.use(`${apiPrefix}/conversations`, generalRateLimit, authenticateToken, conversationRoutes);
  app.use(`${apiPrefix}/ai`, generalRateLimit, authenticateToken, aiRoutes);
  app.use(`${apiPrefix}/messages`, generalRateLimit, authenticateToken, messageRoutes);
  app.use(`${apiPrefix}/upload`, generalRateLimit, authenticateToken, uploadRoutes);
  app.use(`${apiPrefix}/voice`, generalRateLimit, authenticateToken, voiceRoutes);
  app.use(`${apiPrefix}/skills`, generalRateLimit, authenticateToken, skillsRoutes);
  app.use(`${apiPrefix}/cron`, generalRateLimit, authenticateToken, cronRoutes);

  // WebSocket routes
  app.use(`${apiPrefix}/ws`, websocketRoutes);
};
