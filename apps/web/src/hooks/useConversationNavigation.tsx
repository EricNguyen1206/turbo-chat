import { useConversationStore } from "@/store/useConversationStore";
import { AIConnectionState, useZeroClawSocketStore } from "@/store/useZeroClawSocketStore";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Hook for managing UI conversation navigation and AI WebSocket connection
export const useConversationNavigation = (isConversationsLoading: boolean) => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { groupConversations, directConversations, currentConversation, setCurrentConversation } = useConversationStore();

  // Use the new ZeroClaw Socket store
  const { connectionState, connect, disconnect } = useZeroClawSocketStore();
  const conversationId = params.id ?? undefined;

  // Memoize conversation lookup to avoid recomputation and noisy effects
  const resolvedConversation = useMemo(() => {
    if (!conversationId) return undefined;
    return groupConversations.find((conv) => conv.id === conversationId) || directConversations.find((conv) => conv.id === conversationId);
  }, [conversationId, groupConversations, directConversations]);

  // Avoid redundant setCurrentConversation calls across renders/StrictMode
  const lastSetConversationIdRef = useRef<string | undefined>(undefined);
  const lastRedirectedForIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!conversationId) return;

    // Check if conversations have been loaded into the store
    const hasConversationsData = groupConversations.length > 0 || directConversations.length > 0;

    // Don't redirect while conversations are still loading or haven't been populated yet
    if (!resolvedConversation) {
      if (!isConversationsLoading && hasConversationsData) {
        if (lastRedirectedForIdRef.current !== conversationId) {
          lastRedirectedForIdRef.current = conversationId;
          navigate("/messages", { replace: true });
        }
      }
      return;
    }

    // Only update store when conversation truly changes
    if (lastSetConversationIdRef.current !== resolvedConversation.id) {
      lastSetConversationIdRef.current = resolvedConversation.id;
      setCurrentConversation(resolvedConversation);
    }
  }, [conversationId, resolvedConversation, navigate, setCurrentConversation, isConversationsLoading, groupConversations.length, directConversations.length]);

  // Connect to ZeroClaw when entering a valid AI conversation
  useEffect(() => {
    // Basic AI integration: connect when a conversation is active
    if (currentConversation?.id) {
      connect().catch(console.error);
    } else {
      disconnect();
    }

    // Cleanup when component unmounts or conversation changes
    return () => {
      // Small delay to prevent immediate disconnect on brief remounts in dev
      setTimeout(() => {
        if (!lastSetConversationIdRef.current) {
          // disconnect();
        }
      }, 100);
    };
  }, [currentConversation?.id, connect, disconnect]);

  // Return formatted state for the UI
  // The UI expects a ConnectionState enum from the legacy store, so we map our new AI state
  const mappedConnectionState =
    connectionState === AIConnectionState.CONNECTED ? "connected" :
      connectionState === AIConnectionState.CONNECTING ? "connecting" :
        connectionState === AIConnectionState.ERROR ? "error" : "disconnected";

  return {
    currentConversation,
    connectionState: mappedConnectionState as any, // Cast to avoid full refactoring of UI types right now
  };
};