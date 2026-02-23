/**
 * WebSocket store for ZeroClaw AI Connection
 * 
 * Connects to the Express Proxy at /api/v1/ai/ws which forwards
 * raw WebSockets to the local ZeroClaw Rust backend.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { apiUrl } from "@/lib/config";

// Connection state enum
export enum AIConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

interface ZeroClawSocketState {
  connectionState: AIConnectionState;
  error: string | null;
  ws: WebSocket | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  isConnected: () => boolean;
  rpc: (method: string, params?: Record<string, any>) => Promise<any>;
}

export const useZeroClawSocketStore = create<ZeroClawSocketState>()(
  devtools(
    (set, get) => ({
      connectionState: AIConnectionState.DISCONNECTED,
      error: null,
      ws: null,

      connect: async () => {
        const { connectionState, ws } = get();

        if (connectionState === AIConnectionState.CONNECTING) return;
        if (connectionState === AIConnectionState.CONNECTED && ws && ws.readyState === WebSocket.OPEN) return;

        // Disconnect existing if any
        if (ws) {
          ws.close();
        }

        try {
          set({
            connectionState: AIConnectionState.CONNECTING,
            error: null,
          });

          return new Promise<void>((resolve, reject) => {
            // Determine WS URL based on API URL (http -> ws, https -> wss)
            let wsUrl = '';
            try {
              if (apiUrl.startsWith('http')) {
                const url = new URL(apiUrl);
                wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/api/v1/ai/ws`;
              } else {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${protocol}//${window.location.host}/api/v1/ai/ws`;
              }
            } catch (err) {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              wsUrl = `${protocol}//${window.location.host}/api/v1/ai/ws`;
            }

            console.log("Connecting to ZeroClaw WebSocket at:", wsUrl);
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
              console.log("ZeroClaw WebSocket connected successfully");
              set({
                connectionState: AIConnectionState.CONNECTED,
                ws: socket,
              });
              resolve();
            };

            socket.onmessage = (event) => {
              try {
                // MCP format or raw message format depending on ZeroClaw implementation
                const data = JSON.parse(event.data);
                console.log("ZeroClaw WS Message:", data);

                // Dispatch custom event for React components to listen to
                window.dispatchEvent(
                  new CustomEvent("ai-chat-message", {
                    detail: data,
                  })
                );
              } catch (e) {
                console.warn("Received non-JSON message from ZeroClaw:", event.data);
              }
            };

            socket.onerror = (error) => {
              console.error("ZeroClaw WebSocket error:", error);
              set({
                connectionState: AIConnectionState.ERROR,
                error: "WebSocket Connection Error",
              });
              reject(error);
            };

            socket.onclose = (event) => {
              console.log("ZeroClaw WebSocket disconnected:", event.reason);
              set({
                connectionState: AIConnectionState.DISCONNECTED,
                ws: null,
              });
            };
          });
        } catch (error) {
          set({
            connectionState: AIConnectionState.ERROR,
            error: error instanceof Error ? error.message : "Connection failed",
          });
          throw error;
        }
      },

      disconnect: () => {
        const { ws } = get();
        if (ws) {
          ws.close();
        }
        set({
          connectionState: AIConnectionState.DISCONNECTED,
          error: null,
          ws: null,
        });
      },

      sendMessage: (text: string) => {
        const { ws, connectionState } = get();
        if (!ws || connectionState !== AIConnectionState.CONNECTED || ws.readyState !== WebSocket.OPEN) {
          throw new Error("ZeroClaw WebSocket not connected");
        }

        // This format might need to match what ZeroClaw expects for standard text input
        ws.send(JSON.stringify({
          type: "message",
          content: text
        }));
      },

      isConnected: () => {
        const { ws, connectionState } = get();
        return connectionState === AIConnectionState.CONNECTED && ws?.readyState === WebSocket.OPEN;
      },

      rpc: async (method: string, params?: Record<string, any>) => {
        const { ws, connectionState } = get();
        if (!ws || connectionState !== AIConnectionState.CONNECTED || ws.readyState !== WebSocket.OPEN) {
          throw new Error("ZeroClaw WebSocket not connected");
        }

        return new Promise((resolve, reject) => {
          const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          const handleMessage = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.id === requestId) {
                ws.removeEventListener('message', handleMessage);
                if (data.error) {
                  reject(new Error(data.error.message || 'RPC Error'));
                } else {
                  resolve(data.result);
                }
              }
            } catch (e) {
              // Ignore parse errors from other messages
            }
          };

          ws.addEventListener('message', handleMessage);

          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method,
            params: params || {}
          }));

          // Timeout after 10s
          setTimeout(() => {
            ws.removeEventListener('message', handleMessage);
            reject(new Error(`RPC timeout for method ${method}`));
          }, 10000);
        });
      },
    }),
    {
      name: "zeroclaw-socket-store",
    }
  )
);
