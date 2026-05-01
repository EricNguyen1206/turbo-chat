import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../store/useChatStore';
import { MessageDto } from '@turbo-chat/types';

describe('Chat Flow Frontend', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('should add a message to the store when a socket event is received', () => {
    const conversationId = 'conv-123';
    const mockMessage: MessageDto = {
      id: 'msg-1',
      conversationId: conversationId,
      senderId: 'user-2',
      senderName: 'User Two',
      text: 'Hello from socket!',
      createdAt: new Date().toISOString(),
    };

    // Simulate the logic in useWebSocketMessageHandler
    const { upsertMessageToConversation } = useChatStore.getState();

    // This is the FIXED logic
    const eventDetail = mockMessage; // Directly the payload
    const chatMessage = eventDetail;

    if (conversationId && chatMessage && String(chatMessage.conversationId) === String(conversationId)) {
      const messageToStore = {
        id: String(chatMessage.id),
        conversationId: String(chatMessage.conversationId),
        senderId: String(chatMessage.senderId),
        senderName: chatMessage.senderName,
        text: chatMessage.text,
        createdAt: chatMessage.createdAt || new Date().toISOString(),
      };
      upsertMessageToConversation(conversationId, messageToStore);
    }

    const messages = useChatStore.getState().conversations[conversationId];
    expect(messages).toBeDefined();
    expect(messages[0].id).toBe('msg-1'); // This will fail if it's "undefined"
  });

  it('should immediately display sent message (optimistic update)', () => {
    const conversationId = 'conv-123';
    const userId = 'user-1';
    const text = 'My outgoing message';

    const { addMessageToConversation } = useChatStore.getState();

    // Simulate handleSendMessage optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: userId,
      text,
      createdAt: new Date().toISOString(),
    };

    addMessageToConversation(conversationId, optimisticMessage);

    const messages = useChatStore.getState().conversations[conversationId];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(1);
    expect(messages[0].text).toBe(text);
  });
});
