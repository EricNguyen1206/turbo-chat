// Mock winston-style logger before any module imports it
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config to avoid env dependency
jest.mock('@/config/config', () => ({
  config: {
    app: { env: 'test', port: 10000, host: 'localhost' },
    database: { uri: 'mongodb://localhost:27017/test' },
    redis: { url: undefined, host: 'localhost', port: 6379, password: undefined, db: 0 },
    jwt: {
      secret: 'test-secret-do-not-use',
      accessExpire: '1h',
      refreshExpire: '30d',
      sessionRenewalThresholdDays: 7,
    },
    cors: { origin: ['http://localhost:3000'] },
    rateLimit: { windowMs: 900000, maxRequests: 100 },
    websocket: { corsOrigin: ['http://localhost:3000'] },
    logging: { level: 'error' },
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      accessMaxAge: 3600000,
      refreshMaxAge: 2592000000,
    },
    session: {
      fingerprintEnabled: true,
      slidingEnabled: true,
      cleanupIntervalMs: 21600000,
    },
  },
}));
