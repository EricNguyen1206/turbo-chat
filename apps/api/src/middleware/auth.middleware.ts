import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/config/config";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get token from cookie first (preferred method)
    let token = req.cookies?.["accessToken"];

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    }

    if (!token) {
      res.status(401).json({
        code: 401,
        message: "Unauthorized",
        details: "Access token is required",
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Get user from database using Prisma
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        deletedAt: null,
      },
    });

    if (!user) {
      res.status(401).json({
        code: 401,
        message: "Unauthorized",
        details: "User not found",
      });
      return;
    }

    // Add user to request object
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error("Authentication error:", error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        code: 401,
        message: "Unauthorized",
        details: "Invalid token",
      });
      return;
    }

    res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      details: "Authentication failed",
    });
  }
};
