import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useConversationStore } from '../useConversationStore';
import { ConversationDto, ConversationType } from '@turbo-chat/types';
import { fetchConversationById } from '@/services/api/conversations';

vi.mock('@/services/api/conversations', () => ({
  fetchConversationById: vi.fn(),
}));

const createMockConversation = (
  id: string,
  type: ConversationType = ConversationType.DIRECT,
  overrides?: Partial<ConversationDto>
): ConversationDto => ({
  id,
  name: `Conversation ${id}`,
  type,
  ownerId: 'owner-1',
  createdAt: new Date(),
  ...overrides,
});

describe('useConversationStore', () => {
  beforeEach(() => {
    useConversationStore.setState({
      unreadCounts: {},
      activeConversationId: null,
      currentConversation: null,
      groupConversations: [],
      directConversations: [],
      currentConversationId: null,
      joinedConversations: new Set<string>(),
    });
  });

  describe('setUnreadCount', () => {
    it('should set unread count for a conversation', () => {
      useConversationStore.getState().setUnreadCount('conv-1', 5);

      expect(useConversationStore.getState().unreadCounts['conv-1']).toBe(5);
    });

    it('should update an existing unread count', () => {
      useConversationStore.getState().setUnreadCount('conv-1', 5);
      useConversationStore.getState().setUnreadCount('conv-1', 10);

      expect(useConversationStore.getState().unreadCounts['conv-1']).toBe(10);
    });

    it('should handle multiple conversations independently', () => {
      useConversationStore.getState().setUnreadCount('conv-1', 3);
      useConversationStore.getState().setUnreadCount('conv-2', 7);

      const state = useConversationStore.getState();
      expect(state.unreadCounts['conv-1']).toBe(3);
      expect(state.unreadCounts['conv-2']).toBe(7);
    });
  });

  describe('setActiveConversation', () => {
    it('should set the active conversation id', () => {
      useConversationStore.getState().setActiveConversation('conv-1');

      expect(useConversationStore.getState().activeConversationId).toBe('conv-1');
    });
  });

  describe('setCurrentConversation', () => {
    it('should set the current conversation object', () => {
      const conversation = createMockConversation('conv-1');

      useConversationStore.getState().setCurrentConversation(conversation);

      expect(useConversationStore.getState().currentConversation).toEqual(conversation);
    });
  });

  describe('markAsRead', () => {
    it('should set unread count to 0 for the conversation', async () => {
      useConversationStore.getState().setUnreadCount('conv-1', 5);

      await useConversationStore.getState().markAsRead('conv-1');

      expect(useConversationStore.getState().unreadCounts['conv-1']).toBe(0);
    });
  });

  describe('setGroupConversations', () => {
    it('should set group conversations and extract unread counts', () => {
      const conversations = [
        createMockConversation('conv-1', ConversationType.GROUP, { unreadCount: 3 }),
        createMockConversation('conv-2', ConversationType.GROUP, { unreadCount: 0 }),
      ];

      useConversationStore.getState().setGroupConversations(conversations);

      const state = useConversationStore.getState();
      expect(state.groupConversations).toEqual(conversations);
      expect(state.unreadCounts['conv-1']).toBe(3);
      expect(state.unreadCounts['conv-2']).toBe(0);
    });

    it('should replace existing group conversations', () => {
      const first = [createMockConversation('conv-1', ConversationType.GROUP)];
      const second = [createMockConversation('conv-2', ConversationType.GROUP)];

      useConversationStore.getState().setGroupConversations(first);
      useConversationStore.getState().setGroupConversations(second);

      expect(useConversationStore.getState().groupConversations).toEqual(second);
    });
  });

  describe('setDirectConversations', () => {
    it('should set direct conversations and extract unread counts', () => {
      const conversations = [
        createMockConversation('conv-1', ConversationType.DIRECT, { unreadCount: 2 }),
      ];

      useConversationStore.getState().setDirectConversations(conversations);

      const state = useConversationStore.getState();
      expect(state.directConversations).toEqual(conversations);
      expect(state.unreadCounts['conv-1']).toBe(2);
    });
  });

  describe('addGroupConversation', () => {
    it('should add a conversation to the group list', () => {
      const conversation = createMockConversation('conv-1', ConversationType.GROUP);

      useConversationStore.getState().addGroupConversation(conversation);

      expect(useConversationStore.getState().groupConversations).toHaveLength(1);
      expect(useConversationStore.getState().groupConversations[0]).toEqual(conversation);
    });

    it('should append to existing group conversations', () => {
      const conv1 = createMockConversation('conv-1', ConversationType.GROUP);
      const conv2 = createMockConversation('conv-2', ConversationType.GROUP);

      useConversationStore.getState().addGroupConversation(conv1);
      useConversationStore.getState().addGroupConversation(conv2);

      expect(useConversationStore.getState().groupConversations).toHaveLength(2);
    });
  });

  describe('addDirectConversation', () => {
    it('should add a conversation to the direct list', () => {
      const conversation = createMockConversation('conv-1', ConversationType.DIRECT);

      useConversationStore.getState().addDirectConversation(conversation);

      expect(useConversationStore.getState().directConversations).toHaveLength(1);
      expect(useConversationStore.getState().directConversations[0]).toEqual(conversation);
    });
  });

  describe('removeConversation', () => {
    it('should remove a group conversation when type is group', () => {
      const conv1 = createMockConversation('conv-1', ConversationType.GROUP);
      const conv2 = createMockConversation('conv-2', ConversationType.GROUP);

      useConversationStore.getState().setGroupConversations([conv1, conv2]);
      useConversationStore.getState().removeConversation('conv-1', 'group');

      expect(useConversationStore.getState().groupConversations).toHaveLength(1);
      expect(useConversationStore.getState().groupConversations[0].id).toBe('conv-2');
    });

    it('should remove a direct conversation when type is direct', () => {
      const conv1 = createMockConversation('conv-1', ConversationType.DIRECT);
      const conv2 = createMockConversation('conv-2', ConversationType.DIRECT);

      useConversationStore.getState().setDirectConversations([conv1, conv2]);
      useConversationStore.getState().removeConversation('conv-1', 'direct');

      expect(useConversationStore.getState().directConversations).toHaveLength(1);
      expect(useConversationStore.getState().directConversations[0].id).toBe('conv-2');
    });

    it('should not affect group conversations when removing a direct conversation', () => {
      const groupConv = createMockConversation('g-1', ConversationType.GROUP);
      const directConv = createMockConversation('d-1', ConversationType.DIRECT);

      useConversationStore.getState().setGroupConversations([groupConv]);
      useConversationStore.getState().setDirectConversations([directConv]);

      useConversationStore.getState().removeConversation('d-1', 'direct');

      expect(useConversationStore.getState().groupConversations).toHaveLength(1);
    });
  });

  describe('setCurrentConversationId', () => {
    it('should set the current conversation id', () => {
      useConversationStore.getState().setCurrentConversationId('conv-1');

      expect(useConversationStore.getState().currentConversationId).toBe('conv-1');
    });

    it('should allow setting to null', () => {
      useConversationStore.getState().setCurrentConversationId('conv-1');
      useConversationStore.getState().setCurrentConversationId(null);

      expect(useConversationStore.getState().currentConversationId).toBeNull();
    });
  });

  describe('addJoinedConversation', () => {
    it('should add a conversation id to the joined set', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');

      expect(useConversationStore.getState().joinedConversations.has('conv-1')).toBe(true);
    });

    it('should not duplicate entries in the set', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().addJoinedConversation('conv-1');

      expect(useConversationStore.getState().joinedConversations.size).toBe(1);
    });
  });

  describe('removeJoinedConversation', () => {
    it('should remove a conversation id from the joined set', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().removeJoinedConversation('conv-1');

      expect(useConversationStore.getState().joinedConversations.has('conv-1')).toBe(false);
    });

    it('should clear currentConversationId if it matches the removed conversation', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().setCurrentConversationId('conv-1');

      useConversationStore.getState().removeJoinedConversation('conv-1');

      expect(useConversationStore.getState().currentConversationId).toBeNull();
    });

    it('should not clear currentConversationId if it does not match', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().addJoinedConversation('conv-2');
      useConversationStore.getState().setCurrentConversationId('conv-2');

      useConversationStore.getState().removeJoinedConversation('conv-1');

      expect(useConversationStore.getState().currentConversationId).toBe('conv-2');
    });
  });

  describe('clearJoinedConversations', () => {
    it('should clear all joined conversations and current conversation id', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().addJoinedConversation('conv-2');
      useConversationStore.getState().setCurrentConversationId('conv-1');

      useConversationStore.getState().clearJoinedConversations();

      const state = useConversationStore.getState();
      expect(state.joinedConversations.size).toBe(0);
      expect(state.currentConversationId).toBeNull();
    });
  });

  describe('handleNewMessage', () => {
    it('should increment unread count for non-active conversations', async () => {
      // Set a current conversation so conv-2 is not active
      const activeConv = createMockConversation('conv-1', ConversationType.DIRECT);
      useConversationStore.getState().setCurrentConversation(activeConv);

      const conv2 = createMockConversation('conv-2', ConversationType.DIRECT);
      useConversationStore.getState().setDirectConversations([conv2]);
      // Initialize unread count to 0 manually for test
      useConversationStore.getState().setUnreadCount('conv-2', 0);

      await useConversationStore.getState().handleNewMessage({
        conversationId: 'conv-2',
        text: 'Hello',
      });

      expect(useConversationStore.getState().unreadCounts['conv-2']).toBe(1);
    });

    it('should increment unread count multiple times for non-active conversations', async () => {
      const activeConv = createMockConversation('conv-1', ConversationType.DIRECT);
      useConversationStore.getState().setCurrentConversation(activeConv);

      const conv2 = createMockConversation('conv-2', ConversationType.DIRECT);
      useConversationStore.getState().setDirectConversations([conv2]);
      useConversationStore.getState().setUnreadCount('conv-2', 0);

      await useConversationStore.getState().handleNewMessage({
        conversationId: 'conv-2',
        text: 'Hello',
      });
      await useConversationStore.getState().handleNewMessage({
        conversationId: 'conv-2',
        text: 'World',
      });

      expect(useConversationStore.getState().unreadCounts['conv-2']).toBe(2);
    });

    it('should not increment unread count for the active conversation', async () => {
      const activeConv = createMockConversation('conv-1', ConversationType.DIRECT);
      useConversationStore.getState().setCurrentConversation(activeConv);
      useConversationStore.getState().setDirectConversations([activeConv]);
      useConversationStore.getState().setUnreadCount('conv-1', 0);

      await useConversationStore.getState().handleNewMessage({
        conversationId: 'conv-1',
        text: 'Hello',
      });

      expect(useConversationStore.getState().unreadCounts['conv-1']).toBe(0);
    });

    it('should auto-fetch unknown conversation and add it', async () => {
      const mockApiConversation = {
        id: 'new-conv',
        name: 'New Direct',
        type: ConversationType.DIRECT,
        ownerId: 'owner-1',
        createdAt: new Date().toISOString(),
      };
      (fetchConversationById as Mock).mockResolvedValue(mockApiConversation);

      await useConversationStore.getState().handleNewMessage({
        conversationId: 'new-conv',
        text: 'Hello new conv',
      });

      const state = useConversationStore.getState();
      expect(fetchConversationById).toHaveBeenCalledWith('new-conv');
      expect(state.directConversations).toHaveLength(1);
      expect(state.directConversations[0].id).toBe('new-conv');
      // Should also initialize unreadCount to 1 since it's not active
      expect(state.directConversations[0].unreadCount).toBe(1);
    });

    it('should handle API fetch error gracefully', async () => {
      (fetchConversationById as Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await useConversationStore.getState().handleNewMessage({
        conversationId: 'err-conv',
        text: 'Hello err',
      });

      expect(fetchConversationById).toHaveBeenCalledWith('err-conv');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentConversationId', () => {
    it('should return the current conversation id', () => {
      useConversationStore.getState().setCurrentConversationId('conv-1');

      expect(useConversationStore.getState().getCurrentConversationId()).toBe('conv-1');
    });

    it('should return null when no conversation is set', () => {
      expect(useConversationStore.getState().getCurrentConversationId()).toBeNull();
    });
  });

  describe('isInConversation', () => {
    it('should return true if conversation is in the joined set', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');

      expect(useConversationStore.getState().isInConversation('conv-1')).toBe(true);
    });

    it('should return false if conversation is not in the joined set', () => {
      expect(useConversationStore.getState().isInConversation('conv-1')).toBe(false);
    });
  });

  describe('getJoinedConversations', () => {
    it('should return an array of joined conversation ids', () => {
      useConversationStore.getState().addJoinedConversation('conv-1');
      useConversationStore.getState().addJoinedConversation('conv-2');

      const result = useConversationStore.getState().getJoinedConversations();

      expect(result).toEqual(expect.arrayContaining(['conv-1', 'conv-2']));
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no conversations are joined', () => {
      expect(useConversationStore.getState().getJoinedConversations()).toEqual([]);
    });
  });

  describe('isCurrentConversation', () => {
    it('should return true if the id matches currentConversationId', () => {
      useConversationStore.getState().setCurrentConversationId('conv-1');

      expect(useConversationStore.getState().isCurrentConversation('conv-1')).toBe(true);
    });

    it('should return false if the id does not match currentConversationId', () => {
      useConversationStore.getState().setCurrentConversationId('conv-1');

      expect(useConversationStore.getState().isCurrentConversation('conv-2')).toBe(false);
    });
  });
});
