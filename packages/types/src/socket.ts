/**
 * Centralized Socket.IO types for the chat application
 * Shared between frontend and backend for type safety
 */

import { MessageDto } from "./message.js";

// ============================================================================
// Connection States
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

// ============================================================================
// Socket Event Names (using Socket.IO conventions)
// ============================================================================

export enum SocketEvent {
  // Connection events
  CONNECT = "connect",
  DISCONNECT = "disconnect",

  // Conversation events
  JOIN_CONVERSATION = "join_conversation",
  LEAVE_CONVERSATION = "leave_conversation",
  JOINED_CONVERSATION = "joined_conversation",
  LEFT_CONVERSATION = "left_conversation",

  // Message events
  SEND_MESSAGE = "send_message",
  NEW_MESSAGE = "new_message",

  // User events
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left",

  // Presence events
  HEARTBEAT = "heartbeat",

  // Error events
  ERROR = "error",
  CONNECTION_ERROR = "connect_error",
}

// ============================================================================
// Base Message Interfaces
// ============================================================================

export interface SocketMessage<T = any> {
  id: string;
  timestamp: number;
  data: T;
}


// ============================================================================
// Conversation Payloads
// ============================================================================

export interface JoinConversationPayload {
  conversation_id: string;
}

export interface LeaveConversationPayload {
  conversation_id: string;
}

export interface JoinedConversationPayload {
  conversation_id: string;
  user_id: string;
  username: string;
}

export interface LeftConversationPayload {
  conversation_id: string;
  user_id: string;
  username: string;
}

// ============================================================================
// Message Payloads
// ============================================================================

export interface SendMessagePayload {
  conversation_id: string;
  text?: string | null;
  url?: string | null;
  fileName?: string | null;
}

// Using MessageDto from message.ts for consistency
// No need for separate NewMessagePayload

// ============================================================================
// User Event Payloads
// ============================================================================

export interface UserJoinedPayload {
  conversation_id: string;
  user_id: string;
  username: string;
}

export interface UserLeftPayload {
  conversation_id: string;
  user_id: string;
  username: string;
}

// ============================================================================
// Presence Payloads
// ============================================================================

export interface HeartbeatPayload {
  timestamp: number;
}

// ============================================================================
// Error Payloads
// ============================================================================

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Socket.IO Server to Client Events (what server emits)
// ============================================================================

export interface ServerToClientEvents {
  [SocketEvent.JOINED_CONVERSATION]: (payload: JoinedConversationPayload) => void;
  [SocketEvent.LEFT_CONVERSATION]: (payload: LeftConversationPayload) => void;
  [SocketEvent.NEW_MESSAGE]: (payload: MessageDto) => void;
  [SocketEvent.USER_JOINED]: (payload: UserJoinedPayload) => void;
  [SocketEvent.USER_LEFT]: (payload: UserLeftPayload) => void;
  [SocketEvent.ERROR]: (payload: ErrorPayload) => void;
}

// ============================================================================
// Socket.IO Client to Server Events (what client emits)
// ============================================================================

export interface ClientToServerEvents {
  [SocketEvent.JOIN_CONVERSATION]: (payload: JoinConversationPayload) => void;
  [SocketEvent.LEAVE_CONVERSATION]: (payload: LeaveConversationPayload) => void;
  [SocketEvent.SEND_MESSAGE]: (payload: SendMessagePayload) => void;
  [SocketEvent.HEARTBEAT]: (payload: HeartbeatPayload) => void;
}

// ============================================================================
// Type-safe Message Builders
// ============================================================================

export function createSocketMessage<T>(data: T): SocketMessage<T> {
  return {
    id: generateMessageId(),
    timestamp: Date.now(),
    data,
  };
}


export function createJoinConversationPayload(conversationId: string): JoinConversationPayload {
  return {
    conversation_id: conversationId,
  };
}

export function createLeaveConversationPayload(conversationId: string): LeaveConversationPayload {
  return {
    conversation_id: conversationId,
  };
}

export function createJoinedConversationPayload(
  conversationId: string,
  userId: string,
  username: string
): JoinedConversationPayload {
  return {
    conversation_id: conversationId,
    user_id: userId,
    username,
  };
}

export function createLeftConversationPayload(
  conversationId: string,
  userId: string,
  username: string
): LeftConversationPayload {
  return {
    conversation_id: conversationId,
    user_id: userId,
    username,
  };
}

export function createSendMessagePayload(
  conversationId: string,
  text?: string | null,
  url?: string | null,
  fileName?: string | null
): SendMessagePayload {
  return {
    conversation_id: conversationId,
    text: text || null,
    url: url || null,
    fileName: fileName || null,
  };
}

export function createMessageDto(
  id: string,
  conversationId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  text?: string | null,
  url?: string | null,
  fileName?: string | null,
  createdAt?: string,
  updatedAt?: string | null
): MessageDto {
  const messageDto: MessageDto = {
    id,
    conversationId,
    senderId,
    senderName,
    text: text || null,
    url: url || null,
    fileName: fileName || null,
    createdAt: createdAt || new Date().toISOString(),
  };

  if (senderAvatar) {
    messageDto.senderAvatar = senderAvatar;
  }

  if (updatedAt !== undefined) {
    messageDto.updatedAt = updatedAt;
  }

  return messageDto;
}

export function createUserJoinedPayload(
  conversationId: string,
  userId: string,
  username: string
): UserJoinedPayload {
  return {
    conversation_id: conversationId,
    user_id: userId,
    username,
  };
}

export function createUserLeftPayload(
  conversationId: string,
  userId: string,
  username: string
): UserLeftPayload {
  return {
    conversation_id: conversationId,
    user_id: userId,
    username,
  };
}

export function createErrorPayload(code: string, message: string, details?: any): ErrorPayload {
  return {
    code,
    message,
    ...(details && { details }),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Type Guards
// ============================================================================



export function isJoinConversationPayload(payload: any): payload is JoinConversationPayload {
  return typeof payload === "object" && typeof payload.conversation_id === "string";
}

export function isLeaveConversationPayload(payload: any): payload is LeaveConversationPayload {
  return typeof payload === "object" && typeof payload.conversation_id === "string";
}

export function isSendMessagePayload(payload: any): payload is SendMessagePayload {
  return (
    typeof payload === "object" &&
    typeof payload.conversation_id === "string" &&
    (payload.text !== undefined || payload.url !== undefined || payload.fileName !== undefined)
  );
}
