import { Session } from "@/models/Session";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await Session.deleteMany({ expiresAt: { $lt: new Date() } });
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
    }
    return result.deletedCount;
  } catch (error) {
    logger.error("Session cleanup failed:", error);
    return 0;
  }
}

export function startSessionCleanupSchedule(): NodeJS.Timeout {
  cleanupExpiredSessions();
  return setInterval(cleanupExpiredSessions, config.session.cleanupIntervalMs);
}
