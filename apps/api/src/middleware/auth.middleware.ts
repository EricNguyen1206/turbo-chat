import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@/config/config";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { logger } from "@/utils/logger";

// AuthenticatedRequest is a convenience alias — req.user and req.userId
// are now globally augmented on Express.Request via src/types/express.d.ts
export type AuthenticatedRequest = Request;

export const authenticateToken = async (
  req: Request,
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

    // Get user from database using Mongoose
    const user = await User.findOne({ _id: decoded.userId, deletedAt: null });

    if (!user) {
      res.status(401).json({
        code: 401,
        message: "Unauthorized",
        details: "User not found",
      });
      return;
    }

    // Add user to request object (augmented via Express global namespace)
    req.user = user;
    req.userId = user.id;

    // Slide session expiration forward if enabled and nearing expiry
    if (config.session.slidingEnabled) {
      try {
        const latestSession = await Session.findOne({ userId: user._id }).sort({ expiresAt: -1 });
        if (latestSession && !latestSession.isExpired()) {
          const daysUntilExpiry =
            (latestSession.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry < config.jwt.sessionRenewalThresholdDays) {
            const refreshDays = parseInt(config.jwt.refreshExpire) || 30;
            latestSession.expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
            await latestSession.save();
          }
        }
      } catch {
        // Non-critical — don't block the request
      }
    }

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
