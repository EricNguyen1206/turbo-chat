# System Architecture

> **Last Updated:** 2026-01-04
> **Feature:** System Architecture
> **Components:** Frontend, Backend, Database, Redis
> **Status:** Implemented

## 📋 Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Related Documentation](#related-documentation)

---

## 🎯 Overview

**erion-raven** is a real-time chat application built with a modern monorepo architecture. The system supports:

- ✅ Real-time messaging with WebSocket (Socket.IO)
- ✅ Direct messages (1-1 chat)
- ✅ Group conversations
- ✅ Friend request system
- ✅ User authentication with JWT
- ✅ Rate limiting and security features

---

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React + Vite]
    end
    
    subgraph "API Gateway"
        API[Express API Server<br/>Port 8080]
        WS[Socket.IO Server<br/>WebSocket]
    end
    
    subgraph "Services Layer"
        AUTH[Auth Service]
        USER[User Service]
        CONV[Conversation Service]
        MSG[Message Service]
        FRIEND[Friend Service]
        WSVC[WebSocket Service]
        STORAGE[Storage Service]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB<br/>Primary Database)]
        REDIS[(Redis<br/>Cache & Sessions)]
        S3[(Object Storage)]
    end
    
    WEB -->|HTTP/HTTPS| API
    WEB -->|WebSocket| WS
    
    API --> AUTH
    API --> USER
    API --> CONV
    API --> MSG
    API --> FRIEND
    API --> STORAGE
    
    WS --> WSVC
    
    AUTH --> MONGO
    AUTH --> REDIS
    USER --> MONGO
    CONV --> MONGO
    MSG --> MONGO
    FRIEND --> MONGO
    WSVC --> REDIS
    STORAGE --> S3
    
    style WEB fill:#61dafb
    style API fill:#68a063
    style WS fill:#010101
    style MONGO fill:#47a248
    style REDIS fill:#dc382d
    style S3 fill:#e34c26
```

---

## 📦 Monorepo Structure

```
erion-raven/
├── apps/
│   ├── api/                    # Backend API (Node.js + Express)
│   │   ├── src/
│   │   │   ├── config/        # Configuration files
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── models/        # Mongoose models
│   │   │   ├── routes/        # API routes
│   │   │   ├── services/      # Business logic
│   │   │   ├── utils/         # Utilities
│   │   │   └── index.ts       # Entry point
│   │   └── package.json
│   │
│   └── web/                    # Frontend (React + Vite)
│       ├── src/
│       │   ├── components/    # React components
│       │   │   ├── atoms/     # Basic UI elements
│       │   │   ├── molecules/ # Composite components
│       │   │   ├── organisms/ # Complex components
│       │   │   ├── templates/ # Layout templates
│       │   │   └── ui/        # shadcn/ui components
│       │   ├── guards/        # Route guards
│       │   ├── hooks/         # Custom React hooks
│       │   ├── lib/           # Libraries & utilities
│       │   ├── pages/         # Page components
│       │   ├── services/      # API services
│       │   ├── store/         # Zustand stores
│       │   └── App.tsx
│       └── package.json
│
├── packages/
│   ├── config/                 # Shared configs (ESLint, Prettier, TS)
│   │   ├── eslint/
│   │   ├── jest/
│   │   ├── prettier/
│   │   └── tsconfig/
│   │
│   ├── shared/                 # Shared utilities
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── errors.ts
│   │       └── helpers.ts
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       ├── user.ts
│   │       ├── conversation.ts
│   │       ├── message.ts
│   │       ├── friend.ts
│   │       └── socket.ts
│   │
│   └── validators/             # Shared validation schemas
│       └── src/
│           ├── auth.dto.ts
│           ├── conversation.dto.ts
│           ├── friend.dto.ts
│           └── message.dto.ts
│
├── _docs/                      # Documentation
│   ├── HIGH_LEVEL_DESIGN.md    # This file
│   ├── DATABASE_DESIGN.md     # Database schema
│   ├── AUTH_FEATURE.md        # Authentication features
│   ├── RELATIONSHIP_FEATURE.md # Friend & Conversation features
│   ├── CHAT_REALTIME_FEATURE.md # Real-time chat features
│   ├── ONLINE_STATUS_FEATURE.md # Online status features
│   ├── UNREAD_MESSAGE_FEATURE.md # Unread message features
│   ├── OTHER_FEATURE.md       # User management & Util features
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── DEVELOPMENT.md         # Development setup
│   └── TESTING.md             # Testing guide
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│
├── docker-compose.yml          # Docker setup
├── Makefile                    # Build commands
├── pnpm-workspace.yaml         # PNPM workspace config
├── turbo.json                  # Turborepo config
└── package.json                # Root package.json
```

### 📂 Key Directories Explained

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `apps/api` | Backend REST API & WebSocket server | `index.ts`, controllers, services |
| `apps/web` | Frontend React application | `App.tsx`, components, pages |
| `packages/types` | Shared TypeScript type definitions | `user.ts`, `message.ts`, `socket.ts` |
| `packages/validators` | Shared validation schemas (Zod) | `*.dto.ts` files |
| `packages/config` | Shared configuration (ESLint, TS, etc.) | Config files |
| `_docs` | Project documentation | Markdown files |

---

## 🛠️ Technology Stack

### Backend (`apps/api`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Express.js** | 4.x | Web framework |
| **MongoDB** | 6.x | Primary database |
| **Mongoose** | 8.x | MongoDB ODM |
| **Redis** | 7.x | Cache & session store |
| **Socket.IO** | 4.x | WebSocket server |
| **JWT** | 9.x | Authentication tokens |
| **Bcrypt** | 5.x | Password hashing |
| **Zod** | 3.x | Schema validation |
| **Winston** | 3.x | Logging |

### Frontend (`apps/web`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 5.x | Build tool |
| **React Router** | 6.x | Routing |
| **Zustand** | 4.x | State management |
| **TanStack Query** | 5.x | Data fetching |
| **Socket.IO Client** | 4.x | WebSocket client |
| **Axios** | 1.x | HTTP client |
| **shadcn/ui** | Latest | UI components |
| **Tailwind CSS** | 3.x | Styling |

### DevOps & Tools

| Tool | Purpose |
|------|---------|
| **PNPM** | Package manager |
| **Turborepo** | Monorepo build system |
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Jest** | Unit testing |
| **Vitest** | Frontend testing |

---
