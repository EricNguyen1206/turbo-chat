/**
 * Unit tests for socketAuthMiddleware
 * @module middleware/__tests__/socketAuth.middleware.test
 */

import { socketAuthMiddleware, AuthenticatedSocket } from "../socketAuth.middleware";
import jwt from "jsonwebtoken";
import { User } from "@/models/User";
import { config } from "@/config/config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("@/config/config", () => ({
  config: {
    app: { env: "test", port: 10000, host: "localhost" },
    jwt: {
      secret: "test-secret-do-not-use",
      accessExpire: "1h",
      refreshExpire: "30d",
      sessionRenewalThresholdDays: 7,
    },
    logging: { level: "error" },
    session: {
      fingerprintEnabled: true,
      slidingEnabled: true,
      cleanupIntervalMs: 21600000,
    },
  },
}));

jest.mock("@/models/User");
jest.mock("jsonwebtoken");

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUser = User as jest.Mocked<typeof User>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSocket(cookieString?: string): any {
  return {
    id: "socket-123",
    handshake: {
      headers: {
        cookie: cookieString,
      },
    },
    userId: undefined,
    username: undefined,
    email: undefined,
  };
}

function mockNext(): jest.Mock {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("socketAuthMiddleware", () => {
  const mockDecoded = { userId: "507f1f77bcf86cd799439011" };
  const mockUser = {
    _id: "507f1f77bcf86cd799439011",
    id: "507f1f77bcf86cd799439011",
    username: "testuser",
    email: "test@example.com",
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path — valid token in cookie
  // -------------------------------------------------------------------------
  it("should authenticate socket with valid token from cookie", async () => {
    const socket = mockSocket("accessToken=valid-token; path=/");
    const next = mockNext();

    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(mockedJwt.verify).toHaveBeenCalledWith("valid-token", config.jwt.secret);
    expect(mockedUser.findOne).toHaveBeenCalledWith({
      _id: mockDecoded.userId,
      deletedAt: null,
    });
    expect(socket.userId).toBe(mockUser.id);
    expect(socket.username).toBe(mockUser.username);
    expect(socket.email).toBe(mockUser.email);
    expect(next).toHaveBeenCalledWith();
  });

  it("should parse accessToken from cookie string with multiple cookies", async () => {
    const socket = mockSocket("theme=dark; accessToken=valid-token; lang=en");
    const next = mockNext();

    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(mockedJwt.verify).toHaveBeenCalledWith("valid-token", config.jwt.secret);
    expect(next).toHaveBeenCalledWith();
  });

  // -------------------------------------------------------------------------
  // No token
  // -------------------------------------------------------------------------
  it("should reject with error when no cookie header is present", async () => {
    const socket = mockSocket(undefined);
    const next = mockNext();

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Authentication token required"));
  });

  it("should reject with error when cookie does not contain accessToken", async () => {
    const socket = mockSocket("theme=dark; lang=en");
    const next = mockNext();

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Authentication token required"));
  });

  // -------------------------------------------------------------------------
  // Invalid decoded payload (no userId)
  // -------------------------------------------------------------------------
  it("should reject with error when decoded token has no userId", async () => {
    const socket = mockSocket("accessToken=valid-token");
    const next = mockNext();

    mockedJwt.verify.mockReturnValue({} as any);

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Invalid token"));
  });

  // -------------------------------------------------------------------------
  // User not found
  // -------------------------------------------------------------------------
  it("should reject with error when user is not found", async () => {
    const socket = mockSocket("accessToken=valid-token");
    const next = mockNext();

    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(null);

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("User not found"));
  });

  // -------------------------------------------------------------------------
  // JsonWebTokenError
  // -------------------------------------------------------------------------
  it("should handle JsonWebTokenError with 'Invalid token' message", async () => {
    const socket = mockSocket("accessToken=bad-token");
    const next = mockNext();

    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError("invalid signature");
    });

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Invalid token"));
  });

  // -------------------------------------------------------------------------
  // TokenExpiredError
  // -------------------------------------------------------------------------
  it("should handle TokenExpiredError with 'Token expired' message", async () => {
    const socket = mockSocket("accessToken=expired-token");
    const next = mockNext();

    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.TokenExpiredError("jwt expired", new Date());
    });

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Token expired"));
  });

  // -------------------------------------------------------------------------
  // Unexpected error
  // -------------------------------------------------------------------------
  it("should handle unexpected errors with generic 'Authentication failed' message", async () => {
    const socket = mockSocket("accessToken=valid-token");
    const next = mockNext();

    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockRejectedValue(new Error("Database error"));

    await socketAuthMiddleware(socket as AuthenticatedSocket, next);

    expect(next).toHaveBeenCalledWith(new Error("Authentication failed"));
  });
});
