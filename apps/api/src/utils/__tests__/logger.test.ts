jest.mock("@/config/config", () => ({
  config: {
    logging: {
      level: "error",
    },
  },
}));

const getFreshLogger = () => {
  jest.resetModules();
  jest.doMock("@/config/config", () => ({
    __esModule: true,
    config: { logging: { level: currentLogLevel } },
  }));
  const mod = jest.requireActual("../logger") as typeof import("../logger");
  return {
    logger: new mod.Logger() as unknown as { error: jest.Mock; warn: jest.Mock; info: jest.Mock; debug: jest.Mock },
    LogLevel: mod.LogLevel,
  };
};

// The logger module exports a singleton; we capture the default (level=error) one too.
import "../logger";

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
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });
});

// ── Individual log methods call the correct console method ───────────
describe("Log methods call correct console functions", () => {
  beforeEach(() => {
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
