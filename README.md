# 🦅 Erion Raven

> A modern, real-time chat application with direct messaging, group conversations, and AI-powered interactions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101.svg)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748.svg)](https://www.prisma.io/)

---

## 🎯 Overview

**Erion Raven** is a full-stack real-time chat application built with a modern monorepo architecture (Turborepo). It features a Node.js/Express backend and a React frontend, leveraging **PostgreSQL** (via **Prisma**) for persistence and Redis for high-performance caching and real-time state management.

### Key Features

*   **Real-time Messaging**: Instant delivery and updates using Socket.IO.
*   **Chat Modes**: Support for 1-1 Direct Messages and Group Conversations.
*   **AI Integration**: Built-in support for AI chatbot interactions and profiles.
*   **Secure Auth**: JWT-based authentication with httpOnly cookie sessions.
*   **Presence**: Real-time online/offline status tracking.

---

## 📸 Screenshots

| Dashboard | Group Creation | AI Configuration |
| :---: | :---: | :---: |
| <img src="./docs/assets/dashboard_main_1771946213444.png" width="300" /> | <img src="./docs/assets/group_creation_modal_1771946554600.png" width="300" /> | <img src="./docs/assets/ai_settings_config_1771946605296.png" width="300" /> |

---

## 📄 Project Documentation

Detailed documentation for all features and systems is maintained in the `docs/` directory.

### System & Architecture
*   **[High-Level Architecture](docs/HIGH_LEVEL_DESIGN.md)** - System design, tech stack, and data flow.
*   **[Database Design](docs/DATABASE_DESIGN.md)** - PostgreSQL schema, Prisma models, and relationships.
*   **[User Management & Utilities](docs/OTHER_FEATURE.md)** - User profiles, search, and file uploads.

### Feature Implementations
*   **[Authentication Feature](docs/AUTH_FEATURE.md)** - JWT flow, cookies, and session management.
*   **[Chat Realtime Feature](docs/CHAT_REALTIME_FEATURE.md)** - WebSocket events, messaging flow, and room management.
*   **[Online Status Feature](docs/ONLINE_STATUS_FEATURE.md)** - Real-time user presence system.
*   **[Unread Message Feature](docs/UNREAD_MESSAGE_FEATURE.md)** - Unread counts and read receipt logic.

### Guides
*   **[Development Guide](docs/DEVELOPMENT.md)** (Legacy)
*   **[Deployment Guide](docs/DEPLOYMENT.md)** (Legacy)

---

## 🚀 Quick Start

1.  **Clone & Install**
    ```bash
    git clone https://github.com/EricNguyen1206/erion-raven.git
    cd erion-raven
    pnpm install
    ```

2.  **Environment Setup**
    Copy `.env.example` files to `.env` in `apps/api` and `apps/web` and configure your database (PostgreSQL), Redis, and MongoDB (for AI logs) credentials.

3.  **Run Development Server**
    ```bash
    pnpm dev
    ```