// Only use module-alias in production (when running from dist)
// In development, tsconfig-paths/register handles path aliases
if (process.env['NODE_ENV'] === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('module-alias/register');
}
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { config } from '@/config/config';
import { initializeDatabase, closeDatabase } from '@/config/database';
import { initializeRedis, closeRedis } from '@/config/redis';
import { setupRoutes } from '@/routes';
import { errorHandler } from '@/middleware/error.middleware';
import { setupSwagger } from '@/config/swagger';
import { WebSocketController } from '@/controllers/websocket.controller';
import { logger } from '@/utils/logger';
import { socketAuthMiddleware } from './middleware/socketAuth.middleware';
import passport from '@/config/passport';

class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  private wsController?: WebSocketController;
  private isReady = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.websocket.corsOrigin,
        methods: ['GET', 'POST'],
      },
    });

    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(
      morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) },
      })
    );

    // Cookie parser middleware
    this.app.use(cookieParser());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Initialize Passport
    this.app.use(passport.initialize());

    // Health check endpoint - always respond quickly for Cloud Run
    this.app.get('/', (_req, res) => {
      res.status(200).json({
        status: this.isReady ? 'ok' : 'starting',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Liveness probe - always returns 200 so Cloud Run knows container is alive
    this.app.get('/health/live', (_req, res) => {
      res.status(200).json({ status: 'alive' });
    });

    // Readiness probe - returns 503 until DB/Redis are connected
    this.app.get('/health/ready', (_req, res) => {
      if (this.isReady) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    });
  }

  private initializeSwagger(): void {
    setupSwagger(this.app);
    logger.info('📚 Swagger UI available at /api-docs');
  }

  private initializeRoutes(): void {
    setupRoutes(this.app, this.io);
  }

  private initializeWebSocket(): void {
    // Initialize WebSocket controller
    this.wsController = new WebSocketController(this.io);

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware as any as (socket: Socket, next: (err?: any) => any) => void);

    // Handle connections
    this.io.on('connection', (socket) => {
      this.wsController!.handleConnection(socket as any);
    });

    logger.info('WebSocket initialized successfully');
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    const port = config.app.port;
    const host = config.app.host;

    // CRITICAL for Cloud Run: Listen on port FIRST before connecting to dependencies
    // Cloud Run will kill the container if port is not bound within startup timeout
    await new Promise<void>((resolve) => {
      this.server.listen(port, host, () => {
        logger.info(`🚀 Server listening on http://${host}:${port}`);
        logger.info(`📊 Environment: ${config.app.env}`);
        logger.info(`🔗 WebSocket enabled`);
        resolve();
      });
    });

    // Connect to dependencies AFTER port is bound
    logger.info('🔄 Connecting to dependencies...');
    try {
      await initializeDatabase();
      logger.info('✅ MongoDB connected');
    } catch (error) {
      logger.error('❌ MongoDB connection failed (server still running):', error);
      // Don't exit - server is already listening. Requests will fail gracefully.
    }

    try {
      await initializeRedis();
      logger.info('✅ Redis connected');
    } catch (error) {
      logger.error('❌ Redis connection failed (server still running):', error);
      // Don't exit - server is already listening. Requests will fail gracefully.
    }

    this.isReady = true;
    logger.info('🎉 Application fully ready');

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      this.server.close(async () => {
        logger.info('HTTP server closed');

        await closeDatabase();
        logger.info('Database connection closed');

        await closeRedis();
        logger.info('Redis connection closed');

        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the application
const app = new App();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
