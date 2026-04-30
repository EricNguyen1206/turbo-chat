# Erion Raven

> Real-time chat application: Node.js, Express, Socket.IO, MongoDB, Redis, React.

## Apps

| App | Port | Stack | Responsibility |
| --- | --- | --- | --- |
| `api` | 10000 | Express + Mongoose + Socket.IO + Passport | Auth, REST API, WebSocket gateway |
| `web` | 3001 | React 19 + Vite + TanStack Query + Zustand | SPA frontend, Socket.IO client |

## Architecture Highlights

- **JWT auth**: access token (15 min) + refresh token (30 days) stored in httpOnly cookies
- **OAuth**: Google and GitHub login via Passport.js strategies (gracefully disabled if credentials absent)
- **Real-time messaging**: Socket.IO with room-based broadcasting for conversations
- **Online presence**: heartbeat-based presence tracking via Redis
- **Friend system**: request / accept / decline flow with bidirectional friendship mapping
- **Unread counts**: per-participant unread tracking, mark-as-read on conversation open
- **File uploads**: AWS S3 presigned URLs for avatar and attachment uploads
- **Rate limiting**: sliding window on auth endpoints
- **Input validation**: class-validator DTOs on all request bodies
- **Soft delete**: messages and conversations support soft delete with archival

## Infrastructure

```
MongoDB       users, conversations, messages, friends, sessions
Redis         presence tracking, room management, pub/sub, rate limiting
Socket.IO     real-time messaging, presence, room events
AWS S3        file uploads (presigned URLs)
```

## Quick Start

**1. Start infrastructure:**

```bash
docker compose up -d
```

**2. Install dependencies:**

```bash
pnpm install
```

**3. Environment setup:**

```bash
cp apps/api/env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Configure MongoDB, Redis, JWT secret, and OAuth credentials in `apps/api/.env`.

**4. Run development servers:**

```bash
pnpm dev
```

Or run individually:

```bash
cd apps/api   && pnpm dev     # API on :10000
cd apps/web   && pnpm dev     # Web on :3001
```

## Key Flows

### Auth flow

```
POST /api/v1/auth/signup          register user (bcrypt password)
POST /api/v1/auth/signin          verify credentials, set JWT cookies
GET  /api/v1/auth/google          redirect to Google OAuth
GET  /api/v1/auth/google/callback OAuth callback, set JWT cookies
POST /api/v1/auth/refresh         rotate refresh token
POST /api/v1/auth/signout         clear cookies, revoke session
```

### Chat flow

```
Socket:  join_conversation        join Socket.IO room
Socket:  send_message             broadcast to room members
Socket:  new_message              received by all participants
Socket:  leave_conversation       leave room
POST    /api/v1/messages          send message via REST (fallback)
GET     /api/v1/messages/conversation/:id  fetch paginated messages
DELETE  /api/v1/messages/:id      soft delete message
```

### Conversation flow

```
POST   /api/v1/conversations                create direct or group conversation
GET    /api/v1/conversations                 list user's conversations
POST   /api/v1/conversations/:id/user       add member to group
DELETE /api/v1/conversations/:id/user        remove member
POST   /api/v1/conversations/:id/read       mark as read, clear unread count
```

### Friend flow

```
POST   /api/v1/friends/requests                    send friend request
GET    /api/v1/friends/requests                     list pending requests
POST   /api/v1/friends/requests/:id/accept          accept request
POST   /api/v1/friends/requests/:id/decline         decline request
GET    /api/v1/friends/online-status                get friends' online status
```

### Upload flow

```
POST /api/v1/upload/presigned-url    get S3 presigned URL, client uploads directly
```

## Project Structure

```
erion-raven/
  apps/
    api/               Express backend
      src/
        config/        database, redis, passport, swagger
        controllers/   route handlers
        middleware/    auth, validation, rate limit, socket auth
        models/        Mongoose schemas
        routes/        endpoint definitions
        services/      business logic
        utils/         logger, errors
    web/               React frontend
      src/
        components/    UI components (Radix-based)
        pages/         route pages
        store/         Zustand stores
        services/      API client layer
        hooks/         custom React hooks
        guards/        route guards
  packages/
    shared/            common utilities, errors, constants
    types/             shared TypeScript types
    validators/        class-validator DTOs
    eslint/            ESLint config
    prettier/          Prettier config
    tsconfig/          TypeScript configs
    jest/              Jest config
```

Each API module follows the same internal layout:

```
model/         Mongoose schema + hooks
service/       business logic, DB queries
controller/    request handling, response formatting
route/         endpoint wiring + validation middleware
```
