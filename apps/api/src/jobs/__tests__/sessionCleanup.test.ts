/**
 * Unit tests for sessionCleanup job
 * @module jobs/__tests__/sessionCleanup.test
 */

import { cleanupExpiredSessions, startSessionCleanupSchedule } from "../sessionCleanup";
import { Session } from "@/models/Session";
import { config } from "@/config/config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("@/config/config", () => ({
  config: {
    app: { env: "test", port: 10000, host: "localhost" },
    logging: { level: "error" },
    session: {
      fingerprintEnabled: true,
      slidingEnabled: true,
      cleanupIntervalMs: 21600000,
    },
  },
}));

jest.mock("@/models/Session");

const mockedSession = Session as jest.Mocked<typeof Session>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cleanupExpiredSessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path — expired sessions deleted
  // -------------------------------------------------------------------------
  it("should delete expired sessions and return deletedCount", async () => {
    mockedSession.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);

    const result = await cleanupExpiredSessions();

    expect(mockedSession.deleteMany).toHaveBeenCalledWith({
      expiresAt: { $lt: expect.any(Date) },
    });
    expect(result).toBe(5);
  });

  // -------------------------------------------------------------------------
  // No expired sessions
  // -------------------------------------------------------------------------
  it("should return 0 when no expired sessions exist", async () => {
    mockedSession.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

    const result = await cleanupExpiredSessions();

    expect(result).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Error during deletion
  // -------------------------------------------------------------------------
  it("should return 0 and log error when deletion fails", async () => {
    mockedSession.deleteMany.mockRejectedValue(new Error("Database error"));

    const result = await cleanupExpiredSessions();

    expect(result).toBe(0);
  });
});

describe("startSessionCleanupSchedule", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Calls cleanup immediately on start
  // -------------------------------------------------------------------------
  it("should call cleanupExpiredSessions immediately on start", () => {
    mockedSession.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

    startSessionCleanupSchedule();

    expect(mockedSession.deleteMany).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Returns interval that runs cleanup at configured interval
  // -------------------------------------------------------------------------
  it("should return a NodeJS.Timeout (interval)", () => {
    mockedSession.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

    const timer = startSessionCleanupSchedule();

    expect(timer).toBeDefined();
    expect(typeof timer).toBe("object"); // NodeJS.Timeout is an object

    // Clean up
    clearInterval(timer);
  });

  // -------------------------------------------------------------------------
  // Periodic execution
  // -------------------------------------------------------------------------
  it("should schedule cleanup at the configured interval", () => {
    mockedSession.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

    const timer = startSessionCleanupSchedule();

    // 1 call from the immediate invocation
    expect(mockedSession.deleteMany).toHaveBeenCalledTimes(1);

    // Advance time by the configured interval
    jest.advanceTimersByTime(config.session.cleanupIntervalMs);

    // Should have been called again (2 total: 1 immediate + 1 scheduled)
    expect(mockedSession.deleteMany).toHaveBeenCalledTimes(2);

    // Advance again
    jest.advanceTimersByTime(config.session.cleanupIntervalMs);

    expect(mockedSession.deleteMany).toHaveBeenCalledTimes(3);

    clearInterval(timer);
  });
});
