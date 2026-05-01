import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  isOperationalError,
} from "@turbo-chat/shared";

export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Default error response
  let statusCode = 500;
  let message = "Internal server error";
  let field: string | undefined;

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    message = error.message;
    field = error.field;
  } else if (error instanceof UnauthorizedError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ForbiddenError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ConflictError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof RateLimitError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof InternalServerError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (isOperationalError(error)) {
    // Handle other operational errors
    statusCode = (error as any).statusCode || 500;
    message = error.message;
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  // Add field information for validation errors
  if (field) {
    errorResponse.field = field;
  }

  // Add stack trace in development
  if (process.env['NODE_ENV'] === "development") {
    errorResponse.stack = error.stack;
  }

  // Add request ID if available
  if ((req as any).id) {
    errorResponse.requestId = (req as any).id;
  }

  res.status(statusCode).json(errorResponse);
};
