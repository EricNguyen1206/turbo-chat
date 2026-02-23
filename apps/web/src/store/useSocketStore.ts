/**
 * Centralized Socket.IO store for chat functionality
 * 
 * Security: Uses httpOnly cookies for WebSocket authentication.
 * Socket.IO sends cookies automatically with withCredentials: true.
 * The backend validates the cookie on connection.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { useConversationStore } from "./useConversationStore";
import {
  ConnectionState,
  JoinedConversationPayload,
  LeftConversationPayload,
  UserJoinedPayload,
  UserLeftPayload,
  ErrorPayload,
  createJoinConversationPayload,
  createLeaveConversationPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  MessageDto,
  SocketEvent,
  createSendMessagePayload,
} from "@raven/types";
import { apiUrl } from "@/lib/config";

// API base URL from config
const API_BASE_URL = apiUrl;

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

// Main socket store state interface
interface SocketState {
  // Connection state
  connectionState: ConnectionState;
  error: string | null;
  isConnecting: boolean;

  // Socket instance
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  userId: string;

  // Heartbeat interval reference
  heartbeatIntervalId: ReturnType<typeof setInterval> | null;

  // Actions - simplified interface, no token needed
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (conversationId: string, text: string, url?: string, fileName?: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  isConnected: () => boolean;

  // Internal methods
  setupEventHandlers: () => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      // Initial state
      connectionState: ConnectionState.DISCONNECTED,
      error: null,
      isConnecting: false,
      socket: null,
      userId: "",
      heartbeatIntervalId: null,

      /**
       * Connect to Socket.IO server
       * Authentication is handled via httpOnly cookies sent automatically
       */
      connect: async (userId: string) => {
        const { socket, connectionState } = get();

        // Prevent multiple connection attempts
        if (connectionState === ConnectionState.CONNECTING) {
          throw new Error("Connection already in progress");
        }

        if (connectionState === ConnectionState.CONNECTED && socket?.connected) {
          return;
        }

        // Disconnect existing socket if any
        if (socket) {
          socket.disconnect();
        }

        try {
          set({
            connectionState: ConnectionState.CONNECTING,
            error: null,
            isConnecting: true,
            userId,
          });

          return new Promise<void>((resolve, reject) => {
            // Extract origin from API_BASE_URL to avoid "Invalid namespace" error
            // Socket.IO client interprets the path in the URL as a namespace
            let socketUrl = API_BASE_URL;
            try {
              if (API_BASE_URL.startsWith('http')) {
                socketUrl = new URL(API_BASE_URL).origin;
              } else {
                // If it's a relative path (like /api/v1), use the current origin
                socketUrl = window.location.origin;
              }
            } catch (err) {
              console.error("Failed to parse API_BASE_URL, falling back to window.location.origin", err);
              socketUrl = window.location.origin;
            }

            console.log("Connecting to Socket.IO at:", socketUrl);

            // Create Socket.IO client - cookies sent automatically with withCredentials
            const socketInstance = io(socketUrl, {
              transports: ["websocket", "polling"],
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 3000,
              timeout: 10000,
              withCredentials: true, // Send httpOnly cookies for authentication
            });

            set({ socket: socketInstance });

            // Handle successful connection
            socketInstance.on(SocketEvent.CONNECT, () => {
              console.log("Socket.IO connected successfully");

              set({
                connectionState: ConnectionState.CONNECTED,
                isConnecting: false,
              });

              // Setup event handlers after connection
              get().setupEventHandlers();

              // Start heartbeat for presence
              get().startHeartbeat();

              // Auto re-join previously joined conversations
              try {
                const conversationStore = useConversationStore.getState();
                const conversationsToRejoin = conversationStore.getJoinedConversations();

                if (conversationsToRejoin.length > 0) {
                  console.log("Re-joining conversations:", conversationsToRejoin);
                  conversationsToRejoin.forEach((conversationId) => {
                    get().joinConversation(conversationId);
                  });
                }
              } catch (err) {
                console.error("Auto re-join conversations failed:", err);
              }

              resolve();
            });

            // Handle connection errors
            socketInstance.on(SocketEvent.CONNECTION_ERROR, (error: any) => {
              console.error("Socket.IO connection error:", error);
              set({
                connectionState: ConnectionState.ERROR,
                error: error.message || "Connection failed",
                isConnecting: false,
              });
              reject(error);
            });

            // Handle disconnect
            socketInstance.on(SocketEvent.DISCONNECT, (reason: string) => {
              console.log("Socket.IO disconnected:", reason);
              set({
                connectionState: ConnectionState.DISCONNECTED,
                isConnecting: false,
              });
            });

            // Handle errors
            socketInstance.on(SocketEvent.ERROR, (payload: ErrorPayload) => {
              console.error("Socket.IO error:", payload);
              set({ error: payload.message });

              // If authentication failed, reject the connection promise
              if (payload.code === "AUTH_FAILED" || payload.code === "AUTH_ERROR") {
                set({
                  connectionState: ConnectionState.ERROR,
                  isConnecting: false,
                });
                reject(new Error(payload.message));
              }
            });

            // Timeout handling
            setTimeout(() => {
              if (get().connectionState === ConnectionState.CONNECTING) {
                socketInstance.disconnect();
                const timeoutError = new Error("Connection timeout");
                set({
                  connectionState: ConnectionState.ERROR,
                  error: "Connection timeout",
                  isConnecting: false,
                });
                reject(timeoutError);
              }
            }, 15000);
          });
        } catch (error) {
          set({
            connectionState: ConnectionState.ERROR,
            error: error instanceof Error ? error.message : "Connection failed",
            isConnecting: false,
          });
          throw error;
        }
      },

      // Setup event handlers for socket events
      setupEventHandlers: () => {
        const { socket } = get();
        if (!socket) return;

        // Handle new messages
        socket.on(SocketEvent.NEW_MESSAGE, (payload: MessageDto) => {
          console.log("New message received:", payload);

          // Dispatch custom event for components to listen to
          window.dispatchEvent(
            new CustomEvent("chat-message", {
              detail: payload,
            })
          );
        });

        // Handle joined conversation
        socket.on(SocketEvent.JOINED_CONVERSATION, (payload: JoinedConversationPayload) => {
          console.log("Joined conversation:", payload);

          window.dispatchEvent(
            new CustomEvent("ws-conversation-join-ack", {
              detail: { conversationId: payload.conversation_id, userId: payload.user_id },
            })
          );
        });

        // Handle left conversation
        socket.on(SocketEvent.LEFT_CONVERSATION, (payload: LeftConversationPayload) => {
          console.log("Left conversation:", payload);

          window.dispatchEvent(
            new CustomEvent("ws-conversation-leave-ack", {
              detail: { conversationId: payload.conversation_id, userId: payload.user_id },
            })
          );
        });

        // Handle user joined
        socket.on(SocketEvent.USER_JOINED, (payload: UserJoinedPayload) => {
          console.log("User joined conversation:", payload);

          window.dispatchEvent(
            new CustomEvent("ws-user-joined", {
              detail: payload,
            })
          );
        });

        // Handle user left
        socket.on(SocketEvent.USER_LEFT, (payload: UserLeftPayload) => {
          console.log("User left conversation:", payload);

          window.dispatchEvent(
            new CustomEvent("ws-user-left", {
              detail: payload,
            })
          );
        });
      },

      // Start heartbeat interval
      startHeartbeat: () => {
        const { socket, heartbeatIntervalId } = get();

        // Clear existing interval if any
        if (heartbeatIntervalId) {
          clearInterval(heartbeatIntervalId);
        }

        if (!socket) return;

        // Send initial heartbeat immediately
        socket.emit(SocketEvent.HEARTBEAT, { timestamp: Date.now() });

        // Start interval
        const intervalId = setInterval(() => {
          const currentSocket = get().socket;
          if (currentSocket?.connected) {
            currentSocket.emit(SocketEvent.HEARTBEAT, { timestamp: Date.now() });
            console.log("Heartbeat sent");
          }
        }, HEARTBEAT_INTERVAL_MS);

        set({ heartbeatIntervalId: intervalId });
        console.log("Heartbeat interval started");
      },

      // Stop heartbeat interval
      stopHeartbeat: () => {
        const { heartbeatIntervalId } = get();

        if (heartbeatIntervalId) {
          clearInterval(heartbeatIntervalId);
          set({ heartbeatIntervalId: null });
          console.log("Heartbeat interval stopped");
        }
      },

      // Disconnect from Socket.IO server
      disconnect: () => {
        const { socket } = get();

        // Stop heartbeat first
        get().stopHeartbeat();

        if (socket) {
          socket.disconnect();
        }

        set({
          connectionState: ConnectionState.DISCONNECTED,
          error: null,
          isConnecting: false,
          socket: null,
          heartbeatIntervalId: null,
        });
      },

      // Send a message
      sendMessage: (conversationId: string, text: string, url?: string, fileName?: string) => {
        const { socket, connectionState } = get();

        if (!socket || connectionState !== ConnectionState.CONNECTED || !socket.connected) {
          throw new Error("Socket.IO not connected");
        }

        try {
          const payload = createSendMessagePayload(
            conversationId,
            text || null,
            url || null,
            fileName || null
          );

          socket.emit(SocketEvent.SEND_MESSAGE, payload);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to send message" });
          throw error;
        }
      },

      // Join a conversation
      joinConversation: (conversationId: string) => {
        const { socket, connectionState } = get();

        if (!socket || connectionState !== ConnectionState.CONNECTED || !socket.connected) {
          throw new Error("Socket.IO not connected");
        }

        try {
          const payload = createJoinConversationPayload(conversationId);
          socket.emit(SocketEvent.JOIN_CONVERSATION, payload);

          // Track joined conversation for automatic re-join on reconnect
          try {
            const conversationStore = useConversationStore.getState();
            conversationStore.addJoinedConversation(conversationId);
          } catch (err) {
            console.error("Failed to track joined conversation:", err);
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to join conversation" });
          throw error;
        }
      },

      // Leave a conversation
      leaveConversation: (conversationId: string) => {
        const { socket, connectionState } = get();

        if (!socket || connectionState !== ConnectionState.CONNECTED) {
          return;
        }

        try {
          const payload = createLeaveConversationPayload(conversationId);
          socket.emit(SocketEvent.LEAVE_CONVERSATION, payload);

          // Untrack joined conversation
          try {
            const conversationStore = useConversationStore.getState();
            conversationStore.removeJoinedConversation(conversationId);
          } catch (err) {
            console.error("Failed to untrack joined conversation:", err);
          }
        } catch (error) {
          console.error("Failed to leave conversation:", error);
        }
      },

      // Check if connected
      isConnected: () => {
        const { socket, connectionState } = get();
        return connectionState === ConnectionState.CONNECTED && socket?.connected === true;
      },
    }),
    {
      name: "socket-store",
    }
  )
);

// Export types for convenience
export { ConnectionState, SocketEvent };
