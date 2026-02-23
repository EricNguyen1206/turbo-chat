# ClawX to Erion-Raven Integration Design

## 1. Overview
The goal is to port the beautifully designed AI-agent user interface from the `ClawX` (Electron/React) project into `erion-raven` (Web/React) while adapting it to communicate with the `zeroclaw` Rust gateway. The system will be modified to serve purely as an AI Chatbot platform, meaning legacy human-to-human chat features will be stripped away.

## 2. Architecture Approach (Hybrid Integration)
The application will use a **Hybrid Architecture** to optimize for both performance and backend control:
- **Web Frontend (React):** Uses ported ClawX components. State managed via `Zustand`.
- **Backend (Express):** Acts as a secure intermediary layer, connecting the user's web session to the local `zeroclaw` gateway running at `127.0.0.1:42617`.
  - **REST API (`/api/ai/*`):** Used for AI Settings, Provider configurations, Skills, and Cron Tasks. The backend fetches this from ZeroClaw and maps it to the frontend via standard JSON responses.
  - **Streaming / WebSocket Proxy (`/api/ai/chat`):** Used for Chat & Voice features. The Express backend will transparently proxy WebSocket/SSE connections between the React Web UI and ZeroClaw to ensure real-time token streaming without latency.

## 3. Legacy Features to Remove
Since the app is transitioning to a pure AI chatbot, the following legacy peer-to-peer chat features will be **removed**:

**Backend (`apps/api`):**
- **Models:**
  - `FriendRequest.ts`
  - `Friends.ts`
  - `Participant.ts` (Group chat concepts removed, conversations are strictly 1-on-1 between User and AI Profile).
- **Controllers & Routes:**
  - `friend.controller.ts` & `friend.routes.ts`
  - Any group-chat or human-to-human logic in `conversation.controller.ts` and `message.controller.ts`.
- **Websockets:**
  - Remove typing indicators for other human users, read receipts, and online status broadcasting from `websocket.controller.ts`.

**Frontend (`apps/web`):**
- **Pages:**
  - `ContactsPage.tsx`
  - Group creation modals and peer-to-peer specific UI flows.

## 4. ClawX Features to Port & Adapt
The following ClawX UI features will be ported and adapted to the web environment:

1. **AI Chat Interface:**
   - Port the Markdown rendering, chat history layout, and streaming response UI.
   - Adapt JSON-RPC hooks to call our new Express Proxy endpoints (`/api/ai/chat`).
2. **AI Settings & Providers:**
   - Port the configuration panels for endpoints (OpenAI, Anthropic, Ollama, etc.).
   - Values will be saved via Express REST API, allowing the backend to configure the ZeroClaw gateway dynamically.
3. **Skills Marketplace / Management:**
   - Port the Skills list and toggle UI. Express backend will fetch available skills from ZeroClaw and serve them to the UI.
4. **Cron Tasks:**
   - Port the scheduling UI. Scheduled tasks will be registered through the Express backend down to ZeroClaw.

## 5. Next Steps
Once this design is approved, we will proceed to create a detailed implementation plan step-by-step.
