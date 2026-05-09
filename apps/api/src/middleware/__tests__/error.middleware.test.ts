/**
 * Unit tests for errorHandler middleware
 * @module middleware/__tests__/error.middleware.test
 */

import { errorHandler } from "../error.middleware";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
} from "@turbo-chat/shared";
import { mockRequest, mockResponse, mockNext } from "@/tests/helpers/mockExpress";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Capture and restore the original NODE_ENV
const originalNodeEnv = process.env["NODE_ENV"];

function setNodeEnv(env: string | undefined) {
  if (env === undefined) {
    delete process.env["NODE_ENV"];
  } else {
    process.env["NODE_ENV"] = env;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("errorHandler middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    setNodeEnv("test");
  });

  afterAll(() => {
    setNodeEnv(originalNodeEnv);
  });

  // -------------------------------------------------------------------------
  // ValidationError → 400
  // -------------------------------------------------------------------------
  it("should handle ValidationError with status 400", () => {
    const error = new ValidationError("Email is required", "email");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Email is required");
    expect(responseBody.field).toBe("email");
  });

  it("should include field when ValidationError has one", () => {
    const error = new ValidationError("Invalid format", "username");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.field).toBe("username");
  });

  // -------------------------------------------------------------------------
  // UnauthorizedError → 401
  // -------------------------------------------------------------------------
  it("should handle UnauthorizedError with status 401", () => {
    const error = new UnauthorizedError("Invalid credentials");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Invalid credentials");
  });

  // -------------------------------------------------------------------------
  // ForbiddenError → 403
  // -------------------------------------------------------------------------
  it("should handle ForbiddenError with status 403", () => {
    const error = new ForbiddenError("Access denied");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Access denied");
  });

  // -------------------------------------------------------------------------
  // NotFoundError → 404
  // -------------------------------------------------------------------------
  it("should handle NotFoundError with status 404", () => {
    const error = new NotFoundError("User not found");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("User not found");
  });

  // -------------------------------------------------------------------------
  // ConflictError → 409
  // -------------------------------------------------------------------------
  it("should handle ConflictError with status 409", () => {
    const error = new ConflictError("Username already taken");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Username already taken");
  });

  // -------------------------------------------------------------------------
  // RateLimitError → 429
  // -------------------------------------------------------------------------
  it("should handle RateLimitError with status 429", () => {
    const error = new RateLimitError("Too many requests");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Too many requests");
  });

  // -------------------------------------------------------------------------
  // InternalServerError → 500
  // -------------------------------------------------------------------------
  it("should handle InternalServerError with status 500", () => {
    const error = new InternalServerError("Something went wrong");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Something went wrong");
  });

  // -------------------------------------------------------------------------
  // Generic error (non-operational) → 500
  // -------------------------------------------------------------------------
  it("should handle generic Error with status 500 and default message", () => {
    const error = new Error("Something broke");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBe("Internal server error");
  });

  // -------------------------------------------------------------------------
  // Other operational errors
  // -------------------------------------------------------------------------
  it("should handle other operational errors with their status code", () => {
    const error: any = new Error("Custom operational error");
    error.isOperational = true;
    error.statusCode = 418;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(418);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.message).toBe("Custom operational error");
  });

  // -------------------------------------------------------------------------
  // Stack trace in development mode
  // -------------------------------------------------------------------------
  it("should include stack trace in development mode", () => {
    setNodeEnv("development");
    const error = new Error("Dev error");

    errorHandler(error, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.stack).toBe(error.stack);
  });

  it("should not include stack trace in production mode", () => {
    setNodeEnv("production");
    const error = new Error("Prod error");

    errorHandler(error, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.stack).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Request ID
  // -------------------------------------------------------------------------
  it("should include requestId when available on request", () => {
    req.id = "req-123";
    const error = new Error("With request ID");

    errorHandler(error, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.requestId).toBe("req-123");
  });

  it("should not include requestId when not present", () => {
    const error = new Error("No request ID");

    errorHandler(error, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.requestId).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Response shape
  // -------------------------------------------------------------------------
  it("should always include success, message, timestamp, path, and method", () => {
    const error = new NotFoundError("Not found");

    errorHandler(error, req, res, next);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody).toMatchObject({
      success: false,
      message: "Not found",
      path: "/test",
      method: "GET",
    });
    expect(responseBody.timestamp).toBeDefined();
  });
});
