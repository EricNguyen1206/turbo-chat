import { create } from 'zustand';
import { createJSONStorage, persist, devtools } from 'zustand/middleware';

// Message type for the store
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  text?: string | null;
  url?: string | null;
  fileName?: string | null;
  createdAt: string;
  type?: string;
  receiverId?: string;
}

export interface ChatState {
  // Changed: conversations is now a map of conversationId to messages array
  conversations: Record<string, Message[]>;
  activeConversationId: string | null;
  loading: boolean;

  // Message management methods
  upsertMessageToConversation: (conversationId: string, message: Message) => void;
  addMessageToConversation: (conversationId: string, message: Message) => void;
  removeMessageFromConversation: (conversationId: string, messageId: string) => void;
  clearConversationMessages: (conversationId: string) => void;

  reset: () => void;
  setActiveConversation: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set) => ({
        conversations: {},
        activeConversationId: null,
        loading: false,

        upsertMessageToConversation: (conversationId: string, message: Message) =>
          set((state) => {
            const conversationMessages = state.conversations[conversationId] || [];
            const existingIndex = conversationMessages.findIndex((msg) => msg.id === message.id);

            if (existingIndex !== -1) {
              // Update existing message
              const updatedMessages = [...conversationMessages];
              updatedMessages[existingIndex] = message;
              return {
                conversations: {
                  ...state.conversations,
                  [conversationId]: updatedMessages,
                },
              };
            } else {
              // Add new message
              return {
                conversations: {
                  ...state.conversations,
                  [conversationId]: [...conversationMessages, message],
                },
              };
            }
          }),

        addMessageToConversation: (conversationId: string, message: Message) =>
          set((state) => ({
            conversations: {
              ...state.conversations,
              [conversationId]: [...(state.conversations[conversationId] || []), message],
            },
          })),

        removeMessageFromConversation: (conversationId: string, messageId: string) =>
          set((state) => {
            const conversationMessages = state.conversations[conversationId];
            if (!conversationMessages) return state;

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: conversationMessages.filter((msg) => msg.id !== messageId),
              },
            };
          }),

        clearConversationMessages: (conversationId: string) =>
          set((state) => ({
            conversations: {
              ...state.conversations,
              [conversationId]: [],
            },
          })),

        reset: () => set({ conversations: {}, activeConversationId: null, loading: false }),

        setActiveConversation: (conversationId: string) =>
          set({ activeConversationId: conversationId }),
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          // INFO: Do Not store message for security reason
          activeConversationId: state.activeConversationId,
        }),
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: 'chat-store' }
  )
);
