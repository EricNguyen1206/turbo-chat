import { LogLevel } from "../logger";

// Mock config BEFORE importing logger so the Logger constructor reads the mock.
jest.mock("@/config/config", () => ({
  config: {
    logging: {
      level: "error",
    },
  },
}));

// Import logger after the mock is in place.
// We re-import for each log-level scenario by clearing the module registry.
const getFreshLogger = () => {
  jest.resetModules();
  jest.doMock("@/config/config", () => ({
    config: { logging: { level: currentLogLevel } },
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../logger");
  return { logger: mod.logger as { error: jest.Mock; warn: jest.Mock; info: jest.Mock; debug: jest.Mock }, LogLevel: mod.LogLevel as typeof LogLevel };
};

// The logger module exports a singleton; we capture the default (level=error) one too.
import { logger, LogLevel as ImportedLogLevel } from "../logger";

let currentLogLevel: string = "error";

// Spy on console methods, silencing actual output
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── LogLevel enum ────────────────────────────────────────────────────
describe("LogLevel enum", () => {
  it("should have correct string values", () => {
    expect(ImportedLogLevel.ERROR).toBe("error");
    expect(ImportedLogLevel.WARN).toBe("warn");
    expect(ImportedLogLevel.INFO).toBe("info");
    expect(ImportedLogLevel.DEBUG).toBe("debug");
  });
});

// ── Logger construction (default mock: level = error) ────────────────
describe("Logger construction", () => {
  it("should read log level from config", () => {
    // The default mock sets level to "error"
    // We verify by checking that only error() produces output
    logger.error("err");
    logger.warn("warn");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

// ── formatMessage (tested indirectly through public log methods) ─────
describe("formatMessage", () => {
  it("should format message with timestamp, level, and message", () => {
    logger.error("hello");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const output = consoleErrorSpy.mock.calls[0][0] as string;
    // Matches pattern: [ISO-timestamp] ERROR: hello
    expect(output).toMatch(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] ERROR: hello$/);
  });

  it("should include JSON metadata when meta is provided", () => {
    logger.error("msg", { userId: 42 });
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain('"userId":42');
  });

  it("should serialize Error meta as { message, stack }", () => {
    const err = new Error("boom");
    err.stack = "boom\n    at test.js:1:1";
    logger.error("failed", err);
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain('"message":"boom"');
    expect(output).toContain('"stack":"boom\\n    at test.js:1:1"');
  });

  it("should not append metadata when meta is undefined", () => {
    logger.error("plain");
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/\] ERROR: plain$/);
  });
});

// ── Log level filtering ──────────────────────────────────────────────
describe("Log level filtering", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("when level is ERROR, only error() should produce output", () => {
    currentLogLevel = "error";
    const { logger: l } = getFreshLogger();

    l.error("e");
    l.warn("w");
    l.info("i");
    l.debug("d");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("when level is WARN, error() and warn() should produce output", () => {
    currentLogLevel = "warn";
    const { logger: l } = getFreshLogger();

    l.error("e");
    l.warn("w");
    l.info("i");
    l.debug("d");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("when level is INFO, error(), warn(), and info() should produce output", () => {
    currentLogLevel = "info";
    const { logger: l } = getFreshLogger();

    l.error("e");
    l.warn("w");
    l.info("i");
    l.debug("d");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    // info() and debug() both use console.log
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  it("when level is DEBUG, all methods should produce output", () => {
    currentLogLevel = "debug";
    const { logger: l } = getFreshLogger();

    l.error("e");
    l.warn("w");
    l.info("i");
    l.debug("d");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    // info() and debug() both use console.log
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });
});

// ── Individual log methods call the correct console method ───────────
describe("Log methods call correct console functions", () => {
  beforeEach(() => {
    // Set level to DEBUG so every method produces output
    currentLogLevel = "debug";
  });

  it("error() should call console.error", () => {
    const { logger: l } = getFreshLogger();
    l.error("err");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0][0]).toContain("ERROR: err");
  });

  it("warn() should call console.warn", () => {
    const { logger: l } = getFreshLogger();
    l.warn("wrn");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toContain("WARN: wrn");
  });

  it("info() should call console.log with INFO prefix", () => {
    const { logger: l } = getFreshLogger();
    l.info("inf");
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toContain("INFO: inf");
  });

  it("debug() should call console.log with DEBUG prefix", () => {
    const { logger: l } = getFreshLogger();
    l.debug("dbg");
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toContain("DEBUG: dbg");
  });
});
