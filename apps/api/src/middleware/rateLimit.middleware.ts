import { Request, Response, NextFunction } from "express";
import { RedisService } from "@/services/redis.service";
import { logger } from "@/utils/logger";

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip successful requests
  skipFailedRequests?: boolean; // Skip failed requests
  message?: string; // Custom error message
}

export class RedisRateLimit {
  private redisService: RedisService;
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.redisService = new RedisService();
    this.options = {
      keyGenerator: (req: Request) => {
        // Default key generator: IP-based for public routes, user-based for protected routes
        const userId = (req as any).user?.id;
        const endpoint = req.route?.path || req.path;
        return userId ? `rate_limit:user:${userId}:${endpoint}` : `rate_limit:ip:${req.ip}:${endpoint}`;
      },
      message: "Too many requests, please try again later",
      ...options,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.options.keyGenerator!(req);
        const windowMs = this.options.windowMs;
        const maxRequests = this.options.maxRequests;

        // Check rate limit
        const isAllowed = await this.redisService.checkRateLimit(key, maxRequests, windowMs);

        if (!isAllowed) {
          logger.warn("Rate limit exceeded", {
            key,
            ip: req.ip,
            userId: (req as any).user?.id,
            endpoint: req.path,
          });

          res.status(429).json({
            success: false,
            message: this.options.message,
            retryAfter: Math.ceil(windowMs / 1000),
          });
          return;
        }

        // Add rate limit headers
        res.set({
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0", // This would need to be calculated
          "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString(),
        });

        next();
      } catch (error) {
        logger.error("Rate limit middleware error:", error);
        // On error, allow the request to proceed
        next();
      }
    };
  }
}

// Pre-configured rate limiters
export const authRateLimit = new RedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 attempts per 15 minutes (increased for testing)
  message: "Too many authentication attempts, please try again later",
}).middleware();

export const generalRateLimit = new RedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: "Too many requests, please try again later",
}).middleware();

export const strictRateLimit = new RedisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes
  message: "Rate limit exceeded, please slow down",
}).middleware();

export const websocketRateLimit = new RedisRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 messages per minute
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return `rate_limit:ws:${userId}:messages`;
  },
  message: "Too many WebSocket messages, please slow down",
}).middleware();

// Custom rate limiter factory
export const createRateLimit = (options: RateLimitOptions) => {
  return new RedisRateLimit(options).middleware();
};
