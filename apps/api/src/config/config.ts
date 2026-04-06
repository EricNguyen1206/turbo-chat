import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  app: {
    env: process.env["NODE_ENV"] || "development",
    port: parseInt(process.env["PORT"] || "10000", 10),
    host: process.env["HOST"] || (process.env["NODE_ENV"] === "production" ? "0.0.0.0" : "localhost"),
  },
  database: {
    uri: process.env["MONGODB_URI"] || "mongodb://localhost:27017/notify_chat",
  },
  redis: {
    url: process.env["REDIS_URL"],
    // Fallback to individual config if REDIS_URL not provided
    host: process.env["REDIS_HOST"] || "localhost",
    port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
    password: process.env["REDIS_PASSWORD"] || undefined,
    db: parseInt(process.env["REDIS_DB"] || "0", 10),
  },
  jwt: {
    secret: (() => {
      const secret = process.env["JWT_SECRET"];
      if (!secret && process.env["NODE_ENV"] === "production") {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      return secret || "dev-secret-do-not-use-in-prod";
    })(),
    accessExpire: process.env["JWT_ACCESS_EXPIRE"] || "15m",
    refreshExpire: process.env["JWT_REFRESH_EXPIRE"] || "30d",
  },
  cors: {
    origin: process.env["CORS_ORIGIN"]?.split(",") || ["http://localhost:3000", "http://localhost:3001"],
  },
  rateLimit: {
    windowMs: parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100", 10),
  },
  websocket: {
    corsOrigin: process.env["WS_CORS_ORIGIN"]?.split(",") || ["http://localhost:3000", "http://localhost:3001"],
  },
  logging: {
    level: process.env["LOG_LEVEL"] || "debug",
  },
  cookie: {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: (process.env["NODE_ENV"] === "production" ? "none" : "lax") as "none" | "lax" | "strict",
    path: "/",
  },
};
