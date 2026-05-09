import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore, Message } from '../useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: {},
      activeConversationId: null,
      loading: false,
    });
  });

  const mockMessage: Message = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    senderName: 'Test User',
    text: 'Hello world',
    createdAt: '2024-01-01T00:00:00.000Z',
    type: 'text',
  };

  const mockMessage2: Message = {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'user-2',
    senderName: 'Another User',
    text: 'Hello back',
    createdAt: '2024-01-01T00:01:00.000Z',
    type: 'text',
  };

  describe('addMessageToConversation', () => {
    it('should add a message to an empty conversation', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-1'][0]).toEqual(mockMessage);
    });

    it('should append messages to an existing conversation', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage2);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(2);
      expect(state.conversations['conv-1'][1]).toEqual(mockMessage2);
    });

    it('should handle multiple independent conversations', () => {
      const otherMessage: Message = {
        ...mockMessage,
        id: 'msg-other',
        conversationId: 'conv-2',
      };

      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().addMessageToConversation('conv-2', otherMessage);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-2']).toHaveLength(1);
    });
  });

  describe('upsertMessageToConversation', () => {
    it('should add a new message if it does not exist', () => {
      useChatStore.getState().upsertMessageToConversation('conv-1', mockMessage);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-1'][0]).toEqual(mockMessage);
    });

    it('should update an existing message with the same id', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);

      const updatedMessage: Message = {
        ...mockMessage,
        text: 'Updated text',
      };

      useChatStore.getState().upsertMessageToConversation('conv-1', updatedMessage);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-1'][0].text).toBe('Updated text');
    });

    it('should not duplicate messages when upserting existing', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().upsertMessageToConversation('conv-1', mockMessage);

      expect(useChatStore.getState().conversations['conv-1']).toHaveLength(1);
    });
  });

  describe('removeMessageFromConversation', () => {
    it('should remove the message if it exists in the conversation', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage2);

      useChatStore.getState().removeMessageFromConversation('conv-1', mockMessage.id);

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-1'][0].id).toBe(mockMessage2.id);
    });

    it('should not throw or fail if conversation does not exist', () => {
      useChatStore.getState().removeMessageFromConversation('nonexistent-conv', 'msg-1');
      const state = useChatStore.getState();
      expect(state.conversations['nonexistent-conv']).toBeUndefined();
    });

    it('should not change anything if messageId does not exist', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().removeMessageFromConversation('conv-1', 'nonexistent-msg');

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toHaveLength(1);
      expect(state.conversations['conv-1'][0]).toEqual(mockMessage);
    });
  });

  describe('clearConversationMessages', () => {
    it('should clear all messages in a conversation', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage2);

      useChatStore.getState().clearConversationMessages('conv-1');

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toEqual([]);
    });

    it('should not affect other conversations', () => {
      const otherMessage: Message = {
        ...mockMessage,
        id: 'msg-other',
        conversationId: 'conv-2',
      };

      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().addMessageToConversation('conv-2', otherMessage);

      useChatStore.getState().clearConversationMessages('conv-1');

      const state = useChatStore.getState();
      expect(state.conversations['conv-1']).toEqual([]);
      expect(state.conversations['conv-2']).toHaveLength(1);
    });
  });

  describe('setActiveConversation', () => {
    it('should set the active conversation id', () => {
      useChatStore.getState().setActiveConversation('conv-1');

      expect(useChatStore.getState().activeConversationId).toBe('conv-1');
    });

    it('should update the active conversation id', () => {
      useChatStore.getState().setActiveConversation('conv-1');
      useChatStore.getState().setActiveConversation('conv-2');

      expect(useChatStore.getState().activeConversationId).toBe('conv-2');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useChatStore.getState().addMessageToConversation('conv-1', mockMessage);
      useChatStore.getState().setActiveConversation('conv-1');

      useChatStore.getState().reset();

      const state = useChatStore.getState();
      expect(state.conversations).toEqual({});
      expect(state.activeConversationId).toBeNull();
      expect(state.loading).toBe(false);
    });
  });
});
