import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { NextFunction } from 'express';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: NextFunction) => {
  try {
    // Get token from handshake auth (matching Socket.IO best practices)
    const cookiesString = socket.handshake.headers.cookie;

    // Improved cookie parsing: trim spaces and find the exact accessToken key
    const token = cookiesString
      ?.split(';')
      .map(c => c.trim())
      .find(cookie => cookie.startsWith('accessToken='))
      ?.split('=')[1];

    if (!token) {
      logger.warn('Socket connection rejected: No token provided', { socketId: socket.id });
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token (matching API auth middleware)
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (!decoded || !decoded.userId) {
      logger.warn('Socket connection rejected: Invalid token', { socketId: socket.id });
      return next(new Error('Invalid token'));
    }

    // Validate user exists in database using Prisma
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        deletedAt: null,
      },
    });

    if (!user) {
      logger.warn('Socket connection rejected: User not found', {
        socketId: socket.id,
        userId: decoded.userId
      });
      return next(new Error('User not found'));
    }

    // Attach user info to socket for use in handlers
    socket.userId = user.id;
    socket.username = user.username;
    socket.email = user.email;

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
    });

    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);

    // Handle JWT specific errors
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }

    next(new Error('Authentication failed'));
  }
};
