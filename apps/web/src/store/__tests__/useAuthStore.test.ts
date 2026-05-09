import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the store
vi.mock('@/services/authService', () => ({
  authService: {
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getProfile: vi.fn(),
    refresh: vi.fn(),
    checkSession: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/axios-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { useAuthStore } from '../useAuthStore';
import { authService } from '@/services/authService';
import { toast } from 'react-toastify';
import apiClient from '@/lib/axios-client';
import type { ApiResponse, UserDto } from '@turbo-chat/types';

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().clearState();
  });

  const mockUser: UserDto = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
  };

  describe('clearState', () => {
    it('should reset all auth state to defaults', () => {
      useAuthStore.setState({
        user: mockUser as any,
        loading: true,
        isAuthenticated: true,
        checkAuthAttempts: 3,
      });

      useAuthStore.getState().clearState();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.checkAuthAttempts).toBe(0);
    });
  });

  describe('signUp', () => {
    it('should call authService.signUp and return true on success', async () => {
      vi.mocked(authService.signUp).mockResolvedValueOnce({ success: true, data: mockUser, message: 'Success' });

      const result = await useAuthStore.getState().signUp('testuser', 'password123', 'test@example.com');

      expect(result).toBe(true);
      expect(authService.signUp).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      });
      expect(toast.success).toHaveBeenCalledWith('Registration successful! Please sign in.');
    });

    it('should return false and show error toast on failure', async () => {
      vi.mocked(authService.signUp).mockRejectedValueOnce(new Error('Signup failed'));

      const result = await useAuthStore.getState().signUp('testuser', 'password123', 'test@example.com');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Registration failed. Please try again.');
    });

    it('should set loading to true during signup and false after', async () => {
      vi.mocked(authService.signUp).mockImplementationOnce(
        () => new Promise<ApiResponse<UserDto>>((resolve) => setTimeout(() => resolve({ success: true, data: mockUser, message: 'Success' }), 10))
      );

      const promise = useAuthStore.getState().signUp('testuser', 'password123', 'test@example.com');
      expect(useAuthStore.getState().loading).toBe(true);

      await promise;
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn, getProfile, and return true on success', async () => {
      vi.mocked(authService.signIn).mockResolvedValueOnce({
        success: true,
        data: mockUser,
        message: 'Success',
      });
      vi.mocked(authService.getProfile).mockResolvedValueOnce({
        success: true,
        data: mockUser,
        message: 'Success',
      });

      const result = await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(authService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(authService.getProfile).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Welcome back! 🎉');
    });

    it('should return false when signIn response is not successful', async () => {
      vi.mocked(authService.signIn).mockResolvedValueOnce({
        success: false,
        message: 'Invalid credentials',
      } as ApiResponse<UserDto>);

      const result = await useAuthStore.getState().signIn('test@example.com', 'wrong');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should return false and show error toast on exception', async () => {
      vi.mocked(authService.signIn).mockRejectedValueOnce(new Error('Network error'));

      const result = await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Sign in failed. Please check your credentials.');
    });

    it('should reset checkAuthAttempts on successful sign in', async () => {
      useAuthStore.setState({ checkAuthAttempts: 2 });

      vi.mocked(authService.signIn).mockResolvedValueOnce({ success: true, data: mockUser, message: 'Success' });
      vi.mocked(authService.getProfile).mockResolvedValueOnce({ success: true, data: mockUser, message: 'Success' });

      await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(useAuthStore.getState().checkAuthAttempts).toBe(0);
    });
  });

  describe('signOut', () => {
    it('should call authService.signOut and clear state on success', async () => {
      vi.mocked(authService.signOut).mockResolvedValueOnce({ success: true, message: 'Success' });

      useAuthStore.setState({ user: mockUser as any, isAuthenticated: true });

      await useAuthStore.getState().signOut();

      expect(authService.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Signed out successfully!');
    });

    it('should clear state even on signOut failure', async () => {
      vi.mocked(authService.signOut).mockRejectedValueOnce(new Error('Network error'));

      useAuthStore.setState({ user: mockUser as any, isAuthenticated: true });

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Error during sign out.');
    });
  });

  describe('getProfile', () => {
    it('should set user and isAuthenticated on success', async () => {
      vi.mocked(authService.getProfile).mockResolvedValueOnce({
        success: true,
        data: mockUser,
        message: 'Success',
      });

      await useAuthStore.getState().getProfile();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.checkAuthAttempts).toBe(0);
    });

    it('should clear user and set isAuthenticated to false on failure', async () => {
      vi.mocked(authService.getProfile).mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().getProfile();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('should not proceed if already loading', async () => {
      useAuthStore.setState({ loading: true });

      await useAuthStore.getState().checkAuth();

      expect(authService.checkSession).not.toHaveBeenCalled();
    });

    it('should not proceed if already authenticated', async () => {
      useAuthStore.setState({ isAuthenticated: true, loading: false });

      await useAuthStore.getState().checkAuth();

      expect(authService.checkSession).not.toHaveBeenCalled();
    });

    it('should not proceed if max attempts (3) reached', async () => {
      useAuthStore.setState({ checkAuthAttempts: 3, loading: false });

      await useAuthStore.getState().checkAuth();

      expect(authService.checkSession).not.toHaveBeenCalled();
    });

    it('should set user on successful checkSession', async () => {
      vi.mocked(authService.checkSession).mockResolvedValueOnce({
        success: true,
        data: mockUser,
        message: 'Success',
      });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.checkAuthAttempts).toBe(0);
    });

    it('should try refresh + getProfile if checkSession fails', async () => {
      vi.mocked(authService.checkSession).mockRejectedValueOnce(new Error('Session expired'));
      vi.mocked(authService.refresh).mockResolvedValueOnce({ success: true, message: 'Success', data: '' });
      vi.mocked(authService.getProfile).mockResolvedValueOnce({ success: true, data: mockUser, message: 'Success' });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(authService.refresh).toHaveBeenCalled();
      expect(authService.getProfile).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set unauthenticated if both checkSession and refresh fail', async () => {
      vi.mocked(authService.checkSession).mockRejectedValueOnce(new Error('Session expired'));
      vi.mocked(authService.refresh).mockRejectedValueOnce(new Error('Refresh failed'));

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should increment checkAuthAttempts', async () => {
      vi.mocked(authService.checkSession).mockRejectedValueOnce(new Error('fail'));
      vi.mocked(authService.refresh).mockRejectedValueOnce(new Error('fail'));

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().checkAuthAttempts).toBe(1);
    });
  });

  describe('startSessionMonitor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a cleanup function', () => {
      const cleanup = useAuthStore.getState().startSessionMonitor();

      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('should periodically check session via /auth/me', () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true } } as any);

      useAuthStore.getState().startSessionMonitor();

      // First interval tick (4 minutes)
      vi.advanceTimersByTime(4 * 60 * 1000);

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should try refresh when /auth/me fails', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Unauthorized') as any);
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } } as any);

      useAuthStore.getState().startSessionMonitor();

      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
    });

    it('should clear state and redirect when both checks fail', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized') as any);
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Refresh failed') as any);

      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      useAuthStore.setState({ user: mockUser as any, isAuthenticated: true });

      const cleanup = useAuthStore.getState().startSessionMonitor();

      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(window.location.href).toBe('/login');

      cleanup();

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should clear interval and remove listener on cleanup', () => {
      const cleanup = useAuthStore.getState().startSessionMonitor();

      const removeSpy = vi.spyOn(document, 'removeEventListener');

      cleanup();

      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
