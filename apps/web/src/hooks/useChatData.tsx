import { useConversationMessagesInfiniteQuery } from "@/services/api/messages";
import { Message, useChatStore } from "@/store/useChatStore";
import { MessageDto, PaginatedApiResponse } from "@turbo-chat/types";
import { useMemo } from "react";

// Hook for managing chat data and messages
export const useChatData = (conversationId: string | undefined) => {
  const {
    data: chatsData,
    isLoading: chatsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useConversationMessagesInfiniteQuery(conversationId);

  const { addMessageToConversation, conversations } = useChatStore();

  const storeMessages = useMemo(() => (conversationId ? conversations[conversationId] || [] : []), [conversations, conversationId]);

  const apiMessages = useMemo(() => {
    if (!chatsData?.pages) return [];

    // Flatten all pages of messages
    const allApiMessages = chatsData.pages.flatMap((page: PaginatedApiResponse<MessageDto[]>) => page.data || []);

    return allApiMessages.map(
      (chat: MessageDto): Message => ({
        id: String(chat.id ?? ""),
        conversationId: String(chat.conversationId ?? conversationId ?? ""),
        createdAt: chat.createdAt ? new Date(chat.createdAt).toISOString() : new Date().toISOString(),
        ...(chat.fileName !== undefined && { fileName: chat.fileName }),
        ...(chat.senderAvatar !== undefined && { senderAvatar: chat.senderAvatar }),
        senderId: String(chat.senderId ?? ""),
        ...(chat.senderName !== undefined && { senderName: chat.senderName }),
        ...(chat.text !== undefined && { text: chat.text }),
        ...(chat.url !== undefined && { url: chat.url }),
      })
    );
  }, [chatsData?.pages, conversationId]);

  // Merge and deduplicate messages
  const chats: Message[] = useMemo(() => {
    const allMessages = [...apiMessages, ...storeMessages];
    const seenIds = new Set<string>();

    const deduplicated = allMessages.filter(msg => {
      // Filter out temp messages if we have the real version with same content
      if (msg.id.startsWith('temp-')) {
        const hasRealVersion = allMessages.some(
          m => !m.id.startsWith('temp-') && m.text === msg.text && m.senderId === msg.senderId
        );
        return !hasRealVersion;
      }

      // Deduplicate by ID
      if (seenIds.has(msg.id)) return false;
      seenIds.add(msg.id);
      return true;
    });

    // Sort by createdAt ascending (oldest first) for correct chronological display
    return deduplicated.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [apiMessages, storeMessages]);

  return {
    chats,
    chatsLoading,
    addMessageToConversation,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isFetchingNextPage,
  };
};