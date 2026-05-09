import { describe, it, expect, beforeEach } from 'vitest';
import { useOnlineStatusStore } from '../useOnlineStatusStore';

describe('useOnlineStatusStore', () => {
  beforeEach(() => {
    useOnlineStatusStore.getState().reset();
  });

  describe('setUserStatus', () => {
    it('should set a user as online', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);

      expect(useOnlineStatusStore.getState().statuses['user-1']).toBe(true);
    });

    it('should set a user as offline', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', false);

      expect(useOnlineStatusStore.getState().statuses['user-1']).toBe(false);
    });

    it('should update an existing user status', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);
      useOnlineStatusStore.getState().setUserStatus('user-1', false);

      expect(useOnlineStatusStore.getState().statuses['user-1']).toBe(false);
    });

    it('should handle multiple users independently', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);
      useOnlineStatusStore.getState().setUserStatus('user-2', false);

      const state = useOnlineStatusStore.getState();
      expect(state.statuses['user-1']).toBe(true);
      expect(state.statuses['user-2']).toBe(false);
    });
  });

  describe('setMultipleStatuses', () => {
    it('should set statuses for multiple users at once', () => {
      useOnlineStatusStore.getState().setMultipleStatuses({
        'user-1': true,
        'user-2': false,
        'user-3': true,
      });

      const state = useOnlineStatusStore.getState();
      expect(state.statuses['user-1']).toBe(true);
      expect(state.statuses['user-2']).toBe(false);
      expect(state.statuses['user-3']).toBe(true);
    });

    it('should merge with existing statuses', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);
      useOnlineStatusStore.getState().setMultipleStatuses({
        'user-2': true,
      });

      const state = useOnlineStatusStore.getState();
      expect(state.statuses['user-1']).toBe(true);
      expect(state.statuses['user-2']).toBe(true);
    });

    it('should overwrite existing statuses when merging', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);
      useOnlineStatusStore.getState().setMultipleStatuses({
        'user-1': false,
      });

      expect(useOnlineStatusStore.getState().statuses['user-1']).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    it('should return true if user is online', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);

      expect(useOnlineStatusStore.getState().isUserOnline('user-1')).toBe(true);
    });

    it('should return false if user is offline', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', false);

      expect(useOnlineStatusStore.getState().isUserOnline('user-1')).toBe(false);
    });

    it('should return false for unknown users', () => {
      expect(useOnlineStatusStore.getState().isUserOnline('unknown-user')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all statuses', () => {
      useOnlineStatusStore.getState().setUserStatus('user-1', true);
      useOnlineStatusStore.getState().setUserStatus('user-2', false);

      useOnlineStatusStore.getState().reset();

      expect(useOnlineStatusStore.getState().statuses).toEqual({});
    });
  });
});
