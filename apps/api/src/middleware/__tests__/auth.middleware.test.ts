/**
 * Unit tests for authenticateToken middleware
 * @module middleware/__tests__/auth.middleware.test
 */

import { authenticateToken } from "../auth.middleware";
import jwt from "jsonwebtoken";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { config } from "@/config/config";
import { mockRequest, mockResponse, mockNext } from "@/tests/helpers/mockExpress";

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
jest.mock("@/models/Session");
jest.mock("jsonwebtoken");

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedSession = Session as jest.Mocked<typeof Session>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authenticateToken middleware", () => {
  let req: any;
  let res: any;
  let next: any;

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
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
  });

  // -------------------------------------------------------------------------
  // Token from cookie - valid
  // -------------------------------------------------------------------------
  it("should call next() when valid token is provided via cookie", async () => {
    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    await authenticateToken(req, res, next);

    expect(mockedJwt.verify).toHaveBeenCalledWith("valid-token", config.jwt.secret);
    expect(mockedUser.findOne).toHaveBeenCalledWith({
      _id: mockDecoded.userId,
      deletedAt: null,
    });
    expect(req.user).toBe(mockUser);
    expect(req.userId).toBe(mockUser.id);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Token from Authorization header - valid
  // -------------------------------------------------------------------------
  it("should call next() when valid token is provided via Authorization header", async () => {
    req.cookies = {};
    req.headers = { authorization: "Bearer valid-header-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    await authenticateToken(req, res, next);

    expect(mockedJwt.verify).toHaveBeenCalledWith("valid-header-token", config.jwt.secret);
    expect(mockedUser.findOne).toHaveBeenCalledWith({
      _id: mockDecoded.userId,
      deletedAt: null,
    });
    expect(req.user).toBe(mockUser);
    expect(req.userId).toBe(mockUser.id);
    expect(next).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // No token provided
  // -------------------------------------------------------------------------
  it("should return 401 when no token is provided", async () => {
    req.cookies = {};
    req.headers = {};

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: "Unauthorized",
      details: "Access token is required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Invalid JWT
  // -------------------------------------------------------------------------
  it("should return 401 when JWT verification fails", async () => {
    req.cookies = { accessToken: "invalid-token" };
    mockedJwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError("invalid signature");
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: "Unauthorized",
      details: "Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // User not found
  // -------------------------------------------------------------------------
  it("should return 401 when user is not found", async () => {
    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(null);

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: "Unauthorized",
      details: "User not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Session sliding enabled and nearing expiry
  // -------------------------------------------------------------------------
  it("should extend session when sliding is enabled and session is nearing expiry", async () => {
    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    // Create a session that is 3 days from expiry (less than threshold of 7)
    const nearExpiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const mockSession = {
      userId: mockUser._id,
      expiresAt: nearExpiryDate,
      isExpired: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockedSession.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockSession),
    } as any);

    await authenticateToken(req, res, next);

    expect(mockedSession.findOne).toHaveBeenCalledWith({ userId: mockUser._id });
    expect(mockSession.isExpired).toHaveBeenCalled();
    expect(mockSession.save).toHaveBeenCalled();
    // Verify the session was extended by ~30 days
    const newExpiry = mockSession.expiresAt;
    const expectedExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(newExpiry.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(next).toHaveBeenCalled();
  });

  it("should not extend session when sliding is enabled but session is not nearing expiry", async () => {
    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    // Create a session that is 20 days from expiry (more than threshold of 7)
    const farExpiryDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const mockSession = {
      userId: mockUser._id,
      expiresAt: farExpiryDate,
      isExpired: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockedSession.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockSession),
    } as any);

    await authenticateToken(req, res, next);

    expect(mockSession.save).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should not attempt session sliding when slidingEnabled is false", async () => {
    // Override config for this test
    config.session.slidingEnabled = false;

    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockResolvedValue(mockUser as any);

    await authenticateToken(req, res, next);

    expect(mockedSession.findOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unexpected error
  // -------------------------------------------------------------------------
  it("should return 500 for unexpected errors", async () => {
    req.cookies = { accessToken: "valid-token" };
    mockedJwt.verify.mockReturnValue(mockDecoded as any);
    mockedUser.findOne.mockRejectedValue(new Error("Database connection failed"));

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: "Internal Server Error",
      details: "Authentication failed",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
