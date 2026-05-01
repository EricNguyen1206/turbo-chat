# Chat Service Backend (`@turbo-chat/api`)

Real-time chat backend built with Express.js, TypeScript, Socket.IO, MongoDB (Mongoose), and Redis.

## 🚀 Features

- Real-time messaging via Socket.IO
- Direct and group conversation management
- JWT authentication with refresh-session support
- OAuth sign-in providers (Google and GitHub)
- Redis-backed online presence and room state
- Swagger UI for API exploration in non-production environments

## 🛠️ Tech Stack

- Runtime: Node.js 18+
- Framework: Express.js
- Language: TypeScript
- Database: MongoDB with Mongoose
- Cache / Presence: Redis
- WebSocket: Socket.IO
- Authentication: JWT + bcrypt

## 📁 Project Structure

```text
apps/api/
├── docs/                # Swagger/OpenAPI spec
├── src/
│   ├── config/          # App, DB, Redis, Swagger, Passport config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # HTTP and socket middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # Route registration
│   ├── services/        # Business logic
│   ├── tests/           # Integration/unit tests
│   ├── types/           # Local type definitions
│   └── utils/           # Logger and helpers
├── env.example
├── package.json
└── tsconfig.json
```

## ⚙️ Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 6+

## 🚀 Quick Start

1. Install dependencies from workspace root:

```bash
pnpm install
```

2. Create environment file:

```bash
cp apps/api/env.example apps/api/.env
```

3. Update key environment variables in `apps/api/.env`:

```env
NODE_ENV=development
PORT=8080
HOST=localhost

MONGODB_URI=mongodb://localhost:27017/notify_chat
REDIS_URL=redis://localhost:6379/0

JWT_SECRET=replace-with-secure-secret
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d

CORS_ORIGIN=http://localhost:3000,http://localhost:3001
WS_CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

4. Start backend:

```bash
pnpm --filter @turbo-chat/api dev
```

## 📚 API Documentation

Swagger UI is enabled in development/staging.

- Swagger UI: `http://localhost:8080/api-docs`
- Raw OpenAPI JSON: `http://localhost:8080/api-docs.json`

If you use a different `PORT`, replace `8080` accordingly.

## 📦 Scripts

Run from workspace root:

```bash
pnpm --filter @turbo-chat/api dev
pnpm --filter @turbo-chat/api build
pnpm --filter @turbo-chat/api start
pnpm --filter @turbo-chat/api test
pnpm --filter @turbo-chat/api lint
pnpm --filter @turbo-chat/api typecheck
```

Run from `apps/api` directly:

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm typecheck
```

## 🧪 Testing

```bash
pnpm --filter @turbo-chat/api test
```

The test suite expects MongoDB and Redis to be available.

## 🔗 Related Docs

- Root project overview: `README.md`
- Architecture docs: `_docs/HIGH_LEVEL_DESIGN.md`
- Database docs: `_docs/DATABASE_DESIGN.md`
