# 🦅 Erion Raven

> A modern, real-time chat application with direct messaging and group conversations.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101.svg)](https://socket.io/)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.x-880000.svg)](https://mongoosejs.com/)

---

## 🎯 Overview

**Erion Raven** is a full-stack real-time chat application built with a modern monorepo architecture (Turborepo). It features a Node.js/Express backend and a React frontend, using **MongoDB** (via **Mongoose**) for application data and **Redis** for high-performance caching and real-time presence state.

### Key Features

*   **Real-time Messaging**: Instant delivery and updates using Socket.IO.
*   **Chat Modes**: Support for 1-1 direct messages and group conversations.
*   **Secure Auth**: JWT-based authentication with httpOnly cookie sessions.
*   **Presence**: Real-time online/offline status tracking.

---

## 📸 Screenshots

| Dashboard | Group Creation | Chat View |
| :---: | :---: | :---: |
| <img src="./docs/assets/dashboard_main_1771946213444.png" width="300" /> | <img src="./docs/assets/group_creation_modal_1771946554600.png" width="300" /> | <img src="./docs/assets/dashboard_main_1771946213444.png" width="300" /> |

---

## 📄 Project Documentation

Detailed documentation for architecture and features is maintained in the `_docs/` directory.

### System & Architecture
*   **[High-Level Architecture](_docs/HIGH_LEVEL_DESIGN.md)** - System design, tech stack, and data flow.
*   **[Database Design](_docs/DATABASE_DESIGN.md)** - MongoDB collections, Mongoose models, and relationships.
*   **[User Management & Utilities](_docs/OTHER_FEATURE.md)** - User profiles, search, and file uploads.

### Feature Implementations
*   **[Authentication Feature](_docs/AUTH_FEATURE.md)** - JWT flow, cookies, and session management.
*   **[Chat Realtime Feature](_docs/CHAT_REALTIME_FEATURE.md)** - WebSocket events, messaging flow, and room management.
*   **[Online Status Feature](_docs/ONLINE_STATUS_FEATURE.md)** - Real-time user presence system.
*   **[Unread Message Feature](_docs/UNREAD_MESSAGE_FEATURE.md)** - Unread counts and read receipt logic.

---

## 🚀 Quick Start

1.  **Clone & Install**
    ```bash
    git clone https://github.com/EricNguyen1206/erion-raven.git
    cd erion-raven
    pnpm install
    ```

2.  **Environment Setup**
    ```bash
    cp apps/api/env.example apps/api/.env
    cp apps/web/.env.example apps/web/.env
    ```
    Configure MongoDB and Redis credentials in `apps/api/.env`.

3.  **Run Development Server**
    ```bash
    pnpm dev
    ```
