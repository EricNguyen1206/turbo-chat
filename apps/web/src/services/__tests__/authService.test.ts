import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the axios client before importing the service
vi.mock('@/lib/axios-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import apiClient from '@/lib/axios-client';
import { authService } from '../authService';

describe('authService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('signUp', () => {
    it('should call POST /auth/signup with the provided data', async () => {
      const mockResponse = {
        data: { success: true, data: { id: '1', username: 'testuser', email: 'test@example.com' } },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const signupData = { username: 'testuser', password: 'password123', email: 'test@example.com' };
      const result = await authService.signUp(signupData as any);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', signupData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('signIn', () => {
    it('should call POST /auth/signin with credentials', async () => {
      const mockResponse = {
        data: { success: true, data: { id: '1', email: 'test@example.com' } },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const signinData = { email: 'test@example.com', password: 'password123' };
      const result = await authService.signIn(signinData as any);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signin', signinData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('signOut', () => {
    it('should call POST /auth/signout', async () => {
      const mockResponse = {
        data: { success: true, message: 'Signed out' },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.signOut();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signout');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getProfile', () => {
    it('should call GET /users/profile', async () => {
      const mockResponse = {
        data: { success: true, data: { id: '1', username: 'testuser', email: 'test@example.com' } },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await authService.getProfile();

      expect(apiClient.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('refresh', () => {
    it('should call POST /auth/refresh', async () => {
      const mockResponse = {
        data: { success: true, data: 'new-token' },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.refresh();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('checkSession', () => {
    it('should call GET /auth/me', async () => {
      const mockResponse = {
        data: { success: true, data: { id: '1', username: 'testuser' } },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await authService.checkSession();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from signUp', async () => {
      const error = new Error('Signup failed');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.signUp({} as any)).rejects.toThrow('Signup failed');
    });

    it('should propagate errors from signIn', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.signIn({} as any)).rejects.toThrow('Invalid credentials');
    });

    it('should propagate errors from getProfile', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(authService.getProfile()).rejects.toThrow('Unauthorized');
    });
  });
});
