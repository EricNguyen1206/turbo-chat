# AI Chatbot Features System Design

**Date:** 2026-02-21
**Project:** Erion Raven (Backend) & Web Frontend

## 1. Overview
This design document defines the architecture and implementation approach for adding AI Chatbot capabilities to the Erion Raven project. The system will support individual API key management, 3D Avatars, and Voice Input/Output.

## 2. Approach: Monolithic + Micro-Frontend
The chosen architecture uses the existing Backend (NestJS/Express + MongoDB) as the primary data store and API configuration manager. The Frontend takes on heavy lifting for 3D rendering and direct STT/TTS API calls to a self-hosted HuggingFace Space backend.

## 3. Core Components

### 3.1 LLM API, Model & AI Profile Management
- **Target Audience:** Individual users (Self-hosted/Personal use). No central Admin required.
- **Data Models (MongoDB):**
  - **User:** Store encrypted `llmProviders` (API Keys) and a `defaultModel`.
  - **AIProfile (New):** Stores `userId`, `name`, `systemPrompt`, `avatarUrl` (.vrm file path), `voiceSettings`, and preferred `model`.
- **Frontend UI:**
  - View to input and manage personal API Keys (OpenAI, Anthropic, etc.).
  - AI Profile builder (System prompt editor, Avatar selector, Model selector).

### 3.2 Chat Interface & Context Window (Token Usage)
- **Data Models:**
  - **Conversation:** Added fields for `aiProfileId`, `totalTokensUsed`, and `maxContextWindow`.
  - **Message:** Added `tokenCount` and `isArchived` (boolean).
- **Frontend UI:**
  - **Context Window:** Progress bar in the chat header showing `Used Tokens / Max Context`.
  - **Reset Conversation:** Archiving historical messages (`isArchived: true`) to clean the context window without deleting data from the DB. Token count resets to 0.
- **Backend Logic:** Token counting (e.g., using `tiktoken` equivalent) happens on the backend before saving the message to DB.

### 3.3 Voice Input/Output & 3D Avatar
- **Voice Input (STT):**
  - Frontend records audio via `MediaRecorder API`.
  - Frontend calls the self-hosted HuggingFace STT endpoint (Whisper).
  - Returns text to the chat input/LLM.
- **Voice Output (TTS) & 3D Avatar Animation (Three.js):**
  - **3D Avatar:** Frontend loads `.vrm` files using React Three Fiber. Displays in a PiP (Picture-in-Picture) popup in the chat UI.
  - **Audio & Lip-sync:** AI text response is sent to the HuggingFace TTS endpoint. Audio plays via `AudioContext`. Web Audio API (`AnalyserNode`) detects volume/frequencies to manipulate `.vrm` blendshapes for lip-syncing.
  - **Body Animation:** State-based animations (Idle, Thinking, Talking).

## 4. Next Steps
- Transition to Implementation Phase.
- Generate detailed `implementation_plan.md` using the writing-plans skill.
