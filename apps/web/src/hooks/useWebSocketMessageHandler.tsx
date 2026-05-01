import { Message, useChatStore } from "@/store/useChatStore";
import { MessageDto } from "@turbo-chat/types";
import { useMarkConversationAsReadMutation } from "@/services/api/conversations";
import { useEffect } from "react";

// Hook for handling incoming WebSocket messages
export const useWebSocketMessageHandler = (conversationId: string | undefined) => {
  const { upsertMessageToConversation } = useChatStore();
  const { mutate: markAsRead } = useMarkConversationAsReadMutation();

  useEffect(() => {
    const handleChatMessage = (event: CustomEvent<MessageDto>) => {
      const chatMessage = event.detail;

      // Only process messages for the current conversation
      if (conversationId && String(chatMessage.conversationId) === String(conversationId)) {
        const message: Message = {
          id: String(chatMessage.id),
          conversationId: String(chatMessage.conversationId),
          senderId: String(chatMessage.senderId),
          ...(chatMessage.text !== undefined && { text: chatMessage.text }),
          createdAt: chatMessage.createdAt,
          ...(chatMessage.url !== undefined && { url: chatMessage.url }),
          ...(chatMessage.fileName !== undefined && { fileName: chatMessage.fileName }),
          ...(chatMessage.senderName !== undefined && { senderName: chatMessage.senderName }),
          ...(chatMessage.senderAvatar !== undefined && { senderAvatar: chatMessage.senderAvatar }),
        };

        // Add message to chat store
        upsertMessageToConversation(String(conversationId), message);

        // Mark as read immediately since user is viewing this conversation
        markAsRead(String(conversationId));
      }
    };

    // Listen for chat messages from WebSocket
    window.addEventListener("chat-message", handleChatMessage as EventListener);

    return () => {
      window.removeEventListener("chat-message", handleChatMessage as EventListener);
    };
  }, [conversationId, upsertMessageToConversation, markAsRead]);
};