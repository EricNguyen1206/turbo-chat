import { Message, useChatStore } from "@/store/useChatStore";
import { useMarkConversationAsReadMutation } from "@/services/api/conversations";
import { useEffect } from "react";

// Hook for handling incoming WebSocket messages from ZeroClaw
export const useWebSocketMessageHandler = (conversationId: string | undefined) => {
  const { upsertMessageToConversation } = useChatStore();
  const { mutate: markAsRead } = useMarkConversationAsReadMutation();

  useEffect(() => {
    const handleAIChatMessage = (event: CustomEvent<any>) => {
      const data = event.detail;

      // Parse the incoming AI message. ZeroClaw might send raw text or JSON.
      // We assume it sends an object with text/content and maybe conversationId for now.
      // If it's a direct connection to a specific session in ZeroClaw, we use the current UI conversationId.

      const messageText = data.content || data.text || typeof data === 'string' ? data : "Received empty response";

      if (conversationId) {
        const message: Message = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conversationId: String(conversationId),
          senderId: "system-ai", // Represents the AI
          text: messageText,
          createdAt: new Date().toISOString(),
          senderName: "ZeroClaw AI",
          senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=zeroclaw",
        };

        // Add message to chat store
        upsertMessageToConversation(String(conversationId), message);

        // Mark as read immediately since user is viewing this conversation
        markAsRead(String(conversationId));
      }
    };

    // Listen for chat messages from ZeroClaw WebSocket
    window.addEventListener("ai-chat-message", handleAIChatMessage as EventListener);

    return () => {
      window.removeEventListener("ai-chat-message", handleAIChatMessage as EventListener);
    };
  }, [conversationId, upsertMessageToConversation, markAsRead]);
};