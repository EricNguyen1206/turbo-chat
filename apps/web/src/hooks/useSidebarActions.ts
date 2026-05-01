import { useConversationsQuery } from "@/services/api/conversations";
import { useConversationStore } from "@/store/useConversationStore";
import { useSocketStore } from "@/store/useSocketStore";
import { ConversationDto, ConversationType } from "@turbo-chat/types";
import { useEffect, useMemo, useState, useRef } from "react";

/**
 * Hook for managing conversation search functionality
 */
export const useConversationSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const clearSearch = () => setSearchQuery("");

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
  };
};

/**
 * Transforms API conversation data to ConversationDto format
 */
const transformConversationData = (conversations: any[], type: "group" | "direct"): ConversationDto[] => {
  if (!Array.isArray(conversations)) return [];

  return conversations.map(
    (ch) =>
      ({
        id: String(ch.id ?? ""),
        name: ch.name,
        ownerId: String(ch.ownerId ?? ""),
        createdAt: ch.createdAt || new Date(),
        otherUserId: String(ch.otherUserId ?? ""),
        type: type === "group" ? ConversationType.GROUP : ConversationType.DIRECT,
        avatar: ch.avatar || "",
        unreadCount: ch.unreadCount ?? 0,
        lastReadAt: ch.lastReadAt ? new Date(ch.lastReadAt) : undefined,
      }) as ConversationDto
  );
};

/**
 * Hook for managing conversation data fetching and transformation
 */
export const useConversationData = () => {
  const { setGroupConversations, setDirectConversations } = useConversationStore();

  // Fetch conversations data
  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useConversationsQuery();

  // Transform and set conversation data when it changes
  useEffect(() => {
    if (conversationsData) {
      const groupConversations = transformConversationData(conversationsData.group || [], "group");
      const directConversations = transformConversationData(conversationsData.direct || [], "direct");

      setGroupConversations(groupConversations);
      setDirectConversations(directConversations);
    } else {
      setGroupConversations([]);
      setDirectConversations([]);
    }
  }, [conversationsData, setGroupConversations, setDirectConversations]);

  return {
    isConversationsLoading,
    conversationsError,
    refetchConversations,
  };
};

/**
 * Hook for filtering conversations based on search query
 */
export const useConversationFiltering = (searchQuery: string) => {
  const { groupConversations, directConversations } = useConversationStore();

  const filteredConversations = useMemo(
    () => groupConversations.filter((conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [groupConversations, searchQuery]
  );

  const filteredDirectMessages = useMemo(
    () => directConversations.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [directConversations, searchQuery]
  );

  return {
    filteredConversations,
    filteredDirectMessages,
  };
};

/**
 * Hook for managing WebSocket connection
 * This ensures the connection is established only once
 */
export const useWebSocketConnection = (_userId: string | null) => {
  const { isConnected, connectionState, error } = useSocketStore();

  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isConnected: isConnected(),
    isConnecting: connectionState === "connecting",
    isReconnecting: false, // Simplified store doesn't have reconnecting state
    connectionState,
    error,
  };
};

/**
 * Main hook that combines all sidebar functionality
 * This is the primary hook that components should use
 */
export const useSidebarActions = (userId?: string) => {
  // Search functionality
  const { searchQuery, setSearchQuery, clearSearch } = useConversationSearch();

  // Conversation data management
  const { isConversationsLoading, conversationsError, refetchConversations } = useConversationData();

  // Conversation filtering
  const { filteredConversations, filteredDirectMessages } = useConversationFiltering(searchQuery);

  // WebSocket connection (optional - only if userId provided)
  const webSocketConnection = userId ? useWebSocketConnection(userId) : null;

  return {
    // Search
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Conversation data
    filteredConversations,
    filteredDirectMessages,
    isConversationsLoading,
    conversationsError,
    refetchConversations,

    // WebSocket (if applicable)
    webSocketConnection,
  };
};

/**
 * Utility functions for conversation operations
 */
export const conversationUtils = {
  /**
   * Get conversation by ID from store
   */
  getConversationById: (conversationId: string): ConversationDto | null => {
    const { groupConversations, directConversations } = useConversationStore.getState();
    return [...groupConversations, ...directConversations].find((conv) => conv.id === conversationId) || null;
  },

  /**
   * Format conversation name for display
   */
  formatConversationName: (conversation: ConversationDto): string => {
    return conversation.type === ConversationType.GROUP ? `#${conversation.name}` : conversation.name;
  },

  /**
   * Get unread count for a conversation
   */
  getUnreadCount: (conversationId: string): number => {
    const { unreadCounts } = useConversationStore.getState();
    return unreadCounts[conversationId] || 0;
  },
};
