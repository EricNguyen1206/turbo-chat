/**
 * Unit tests for AuthService
 * @module services/__tests__/auth.service.test
 */

import { AuthService, createFingerprint, OAuthProfile } from "../auth.service";
import { User, IUser } from "@/models/User";
import { Session } from "@/models/Session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "@/config/config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("@/config/config", () => ({
  config: {
    app: { env: "test", port: 10000, host: "localhost" },
    database: { uri: "mongodb://localhost:27017/test" },
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
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("crypto", () => {
  const actual = jest.requireActual("crypto");
  return {
    ...actual,
    createHash: jest.fn(),
    randomBytes: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockUser(overrides: Record<string, any> = {}): IUser {
  return {
    _id: "507f1f77bcf86cd799439011",
    id: "user-id-123",
    username: "testuser",
    email: "test@example.com",
    password: "hashed-password",
    providers: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    save: jest.fn(),
    ...overrides,
  } as unknown as IUser;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  // -----------------------------------------------------------------------
  // signup
  // -----------------------------------------------------------------------
  describe("signup", () => {
    const signupData = {
      username: "newuser",
      email: "new@example.com",
      password: "Password123",
    };

    it("should create a new user successfully", async () => {
      // Arrange
      const savedUser = mockUser({
        id: "new-user-id",
        username: signupData.username,
        email: signupData.email,
        createdAt: new Date("2025-06-01"),
      });
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      const saveMock = jest.fn().mockResolvedValue(savedUser);
      (User as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: signupData.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(signupData.password, 12);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      });
    });

    it("should throw if email already exists", async () => {
      // Arrange
      const existingUser = mockUser({ email: signupData.email });
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.signup(signupData)).rejects.toThrow(
        "Email already exists"
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it("should throw on general error", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockRejectedValue(
        new Error("DB connection failed")
      );

      // Act & Assert
      await expect(authService.signup(signupData)).rejects.toThrow(
        "DB connection failed"
      );
    });
  });

  // -----------------------------------------------------------------------
  // signin
  // -----------------------------------------------------------------------
  describe("signin", () => {
    const signinData = {
      email: "test@example.com",
      password: "Password123",
    };

    it("should return user and userEntity on success", async () => {
      // Arrange
      const user = mockUser();
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.signin(signinData);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: signinData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signinData.password,
        user.password
      );
      expect(result.user).toEqual({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      });
      expect(result.userEntity).toBe(user);
    });

    it("should throw if user not found", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.signin(signinData)).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("should throw if user has no password (OAuth-only user)", async () => {
      // Arrange
      const user = mockUser({ password: undefined });
      (User.findOne as jest.Mock).mockResolvedValue(user);

      // Act & Assert
      await expect(authService.signin(signinData)).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("should throw if password is invalid", async () => {
      // Arrange
      const user = mockUser();
      (User.findOne as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.signin(signinData)).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  // -----------------------------------------------------------------------
  // refreshToken
  // -----------------------------------------------------------------------
  describe("refreshToken", () => {
    const oldRefreshToken = "old-refresh-token";
    const fingerprint = "abc123";

    it("should rotate tokens successfully", async () => {
      // Arrange
      const user = mockUser();
      const session = {
        _id: "session-id",
        userId: user,
        fingerprint,
        isExpired: jest.fn().mockReturnValue(false),
      };
      (Session.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(session),
      });
      (Session.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue("new-refresh-token"),
      });
      const sessionSaveMock = jest.fn().mockResolvedValue({});
      (Session as unknown as jest.Mock).mockImplementation(() => ({
        save: sessionSaveMock,
      }));
      (jwt.sign as jest.Mock).mockReturnValue("new-access-token");

      // Act
      const result = await authService.refreshToken(
        oldRefreshToken,
        fingerprint
      );

      // Assert
      expect(Session.deleteOne).toHaveBeenCalledWith({ _id: session._id });
      expect(sessionSaveMock).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpire }
      );
      expect(result).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });
    });

    it("should throw if session not found", async () => {
      // Arrange
      (Session.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        authService.refreshToken(oldRefreshToken, fingerprint)
      ).rejects.toThrow("Invalid refresh token");
    });

    it("should throw if session is expired", async () => {
      // Arrange
      const user = mockUser();
      const session = {
        _id: "session-id",
        userId: user,
        fingerprint,
        isExpired: jest.fn().mockReturnValue(true),
      };
      (Session.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(session),
      });

      // Act & Assert
      await expect(
        authService.refreshToken(oldRefreshToken, fingerprint)
      ).rejects.toThrow("Refresh token expired");
    });

    it("should throw if user not found in session", async () => {
      // Arrange
      const session = {
        _id: "session-id",
        userId: null,
        fingerprint,
        isExpired: jest.fn().mockReturnValue(false),
      };
      (Session.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(session),
      });

      // Act & Assert
      await expect(
        authService.refreshToken(oldRefreshToken, fingerprint)
      ).rejects.toThrow("User not found");
    });

    it("should delete all sessions and throw on fingerprint mismatch", async () => {
      // Arrange
      const user = mockUser();
      const session = {
        _id: "session-id",
        userId: user,
        fingerprint: "original-fingerprint",
        isExpired: jest.fn().mockReturnValue(false),
      };
      (Session.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(session),
      });
      (Session.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });

      // Act & Assert
      await expect(
        authService.refreshToken(oldRefreshToken, "wrong-fingerprint")
      ).rejects.toThrow("Session fingerprint mismatch");
      expect(Session.deleteMany).toHaveBeenCalledWith({
        userId: user._id,
      });
    });
  });

  // -----------------------------------------------------------------------
  // signout
  // -----------------------------------------------------------------------
  describe("signout", () => {
    it("should delete the session if found", async () => {
      // Arrange
      const session = { _id: "session-id", id: "session-id" };
      (Session.findOne as jest.Mock).mockResolvedValue(session);
      (Session.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      // Act
      await authService.signout("refresh-token", "user-id");

      // Assert
      expect(Session.findOne).toHaveBeenCalledWith({
        refreshToken: "refresh-token",
        userId: "user-id",
      });
      expect(Session.deleteOne).toHaveBeenCalledWith({ _id: session._id });
    });

    it("should succeed without deleting if session not found", async () => {
      // Arrange
      (Session.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await authService.signout("refresh-token", "user-id");

      // Assert
      expect(Session.deleteOne).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // logoutAll
  // -----------------------------------------------------------------------
  describe("logoutAll", () => {
    it("should delete all sessions for the user", async () => {
      // Arrange
      (Session.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      // Act
      await authService.logoutAll("user-id");

      // Assert
      expect(Session.deleteMany).toHaveBeenCalledWith({ userId: "user-id" });
    });

    it("should throw on database error", async () => {
      // Arrange
      (Session.deleteMany as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      // Act & Assert
      await expect(authService.logoutAll("user-id")).rejects.toThrow(
        "DB error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // createTokens
  // -----------------------------------------------------------------------
  describe("createTokens", () => {
    it("should create access and refresh tokens with fingerprint", async () => {
      // Arrange
      const user = mockUser();
      (jwt.sign as jest.Mock).mockReturnValue("access-token");
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue("refresh-token"),
      });
      const saveMock = jest.fn().mockResolvedValue({});
      (Session as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      // Act
      const result = await authService.createTokens(user, "fp-hash");

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpire }
      );
      expect(crypto.randomBytes).toHaveBeenCalledWith(64);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should create tokens without fingerprint", async () => {
      // Arrange
      const user = mockUser();
      (jwt.sign as jest.Mock).mockReturnValue("access-token");
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue("refresh-token"),
      });
      const saveMock = jest.fn().mockResolvedValue({});
      (Session as unknown as jest.Mock).mockImplementation((data: any) => ({
        save: saveMock,
        data,
      }));

      // Act
      const result = await authService.createTokens(user);

      // Assert
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });
  });

  // -----------------------------------------------------------------------
  // findOrCreateOAuthUser
  // -----------------------------------------------------------------------
  describe("findOrCreateOAuthUser", () => {
    const profile: OAuthProfile = {
      provider: "google",
      providerId: "google-123",
      email: "oauth@example.com",
      name: "OAuth User",
      avatar: "https://example.com/avatar.jpg",
    };

    it("should create a new user when email does not exist", async () => {
      // Arrange
      const saveMock = jest.fn().mockImplementation(function(this: any) {
        this.id = "new-oauth-id";
        return Promise.resolve(this);
      });
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email lookup
        .mockResolvedValueOnce(null); // username lookup
      (User as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        save: saveMock,
      }));

      // Act
      const result = await authService.findOrCreateOAuthUser(profile);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: profile.email });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: "new-oauth-id",
        email: profile.email,
      }));
    });

    it("should link a new provider to an existing user (auto-link by email)", async () => {
      // Arrange
      const existingUser = mockUser({
        id: "existing-id",
        email: profile.email,
        providers: [],
        save: jest.fn().mockResolvedValue(undefined),
      });
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      const result = await authService.findOrCreateOAuthUser(profile);

      // Assert
      expect(existingUser.providers).toHaveLength(1);
      expect(existingUser.providers[0]!.name).toBe("google");
      expect(existingUser.save).toHaveBeenCalled();
      expect(result).toBe(existingUser);
    });

    it("should update provider details on re-login (avatar change)", async () => {
      // Arrange
      const existingUser = mockUser({
        id: "existing-id",
        email: profile.email,
        providers: [
          {
            name: "google",
            providerId: "google-123",
            email: profile.email,
            avatar: "https://old-avatar.jpg",
            linkedAt: new Date(),
          },
        ],
        avatar: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      });
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      const result = await authService.findOrCreateOAuthUser({
        ...profile,
        avatar: "https://new-avatar.jpg",
      });

      // Assert
      expect(existingUser.providers).toHaveLength(1); // no duplicate
      expect(existingUser.save).toHaveBeenCalled();
      expect(result).toBe(existingUser);
    });

    it("should update user avatar if missing and profile has one", async () => {
      // Arrange
      const existingUser = mockUser({
        id: "existing-id",
        email: profile.email,
        avatar: undefined,
        providers: [
          {
            name: "google",
            providerId: "google-123",
            email: profile.email,
            avatar: profile.avatar,
            linkedAt: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      });
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      await authService.findOrCreateOAuthUser(profile);

      // Assert
      expect(existingUser.avatar).toBe(profile.avatar);
      expect(existingUser.save).toHaveBeenCalled();
    });

    it("should not save if nothing changed", async () => {
      // Arrange
      const existingUser = mockUser({
        id: "existing-id",
        email: profile.email,
        avatar: profile.avatar,
        providers: [
          {
            name: "google",
            providerId: "google-123",
            email: profile.email,
            avatar: profile.avatar,
            linkedAt: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      });
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      // Act
      await authService.findOrCreateOAuthUser(profile);

      // Assert
      expect(existingUser.save).not.toHaveBeenCalled();
    });

    it("should generate random username if name is empty and email prefix is empty", async () => {
      // Arrange
      const profileNoName: OAuthProfile = {
        provider: "github",
        providerId: "gh-123",
        email: "x@y.com",
      };
      const newUser = mockUser({
        id: "new-oauth-id",
        email: profileNoName.email,
      });
      const saveMock = jest.fn().mockResolvedValue(newUser);
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email lookup
        .mockResolvedValueOnce(null); // username lookup (x from x@y.com)
      (User as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      // Act
      await authService.findOrCreateOAuthUser(profileNoName);

      // Assert
      expect(saveMock).toHaveBeenCalled();
    });

    it("should append random suffix if username is taken", async () => {
      // Arrange
      const newUser = mockUser({
        id: "new-oauth-id",
        email: profile.email,
      });
      const saveMock = jest.fn().mockResolvedValue(newUser);
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email lookup
        .mockResolvedValueOnce({ id: "other-user" }); // username taken
      (User as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      // Act
      await authService.findOrCreateOAuthUser(profile);

      // Assert
      expect(saveMock).toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      // Arrange
      (User.findOne as jest.Mock).mockRejectedValue(
        new Error("DB connection failed")
      );

      // Act & Assert
      await expect(
        authService.findOrCreateOAuthUser(profile)
      ).rejects.toThrow("DB connection failed");
    });
  });
});

// ---------------------------------------------------------------------------
// createFingerprint (standalone function)
// ---------------------------------------------------------------------------
describe("createFingerprint", () => {
  it("should create a sha256 hash from user-agent header", () => {
    // Arrange
    const mockDigest = { digest: jest.fn().mockReturnValue("hashed-fp") };
    const mockUpdate = { update: jest.fn().mockReturnValue(mockDigest) };
    (crypto.createHash as jest.Mock).mockReturnValue(mockUpdate);

    const req = {
      headers: { "user-agent": "Mozilla/5.0 Test Browser" },
    } as any;

    // Act
    const result = createFingerprint(req);

    // Assert
    expect(crypto.createHash).toHaveBeenCalledWith("sha256");
    expect(mockUpdate.update).toHaveBeenCalledWith("Mozilla/5.0 Test Browser");
    expect(mockDigest.digest).toHaveBeenCalledWith("hex");
    expect(result).toBe("hashed-fp");
  });

  it("should handle missing user-agent header", () => {
    // Arrange
    const mockDigest = { digest: jest.fn().mockReturnValue("hashed-fp") };
    const mockUpdate = { update: jest.fn().mockReturnValue(mockDigest) };
    (crypto.createHash as jest.Mock).mockReturnValue(mockUpdate);

    const req = { headers: {} } as any;

    // Act
    const result = createFingerprint(req);

    // Assert
    expect(mockUpdate.update).toHaveBeenCalledWith("");
    expect(result).toBe("hashed-fp");
  });
});
