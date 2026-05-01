/**
 * Authentication Service
 * Uses centralized axios client with httpOnly cookie-based authentication
 */

import apiClient from '@/lib/axios-client';
import { SigninRequestDto, SignupRequestDto } from '@/lib/validators';
import {
  ApiMessageResponse,
  ApiResponse,
  UserDto,
} from '@turbo-chat/types';

export const authService = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignupRequestDto): Promise<ApiResponse<UserDto>> => {
    const res = await apiClient.post<ApiResponse<UserDto>>('/auth/signup', data);
    return res.data;
  },

  /**
   * Sign in with email and password
   * Backend sets httpOnly cookies with access and refresh tokens
   */
  signIn: async (data: SigninRequestDto): Promise<ApiResponse<UserDto>> => {
    const res = await apiClient.post<ApiResponse<UserDto>>('/auth/signin', data);
    return res.data;
  },


  /**
   * Sign out - clears httpOnly cookies on backend
   */
  signOut: async (): Promise<ApiMessageResponse> => {
    const res = await apiClient.post<ApiMessageResponse>('/auth/signout');
    return res.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<UserDto>> => {
    const res = await apiClient.get<ApiResponse<UserDto>>('/users/profile');
    return res.data;
  },

  /**
   * Refresh access token using httpOnly refresh token cookie
   * Backend handles token rotation securely
   */
  refresh: async (): Promise<ApiResponse<string>> => {
    const res = await apiClient.post<ApiResponse<string>>('/auth/refresh');
    return res.data;
  },

  /**
   * Lightweight session check — faster than getProfile
   */
  checkSession: async (): Promise<ApiResponse<UserDto>> => {
    const res = await apiClient.get<ApiResponse<UserDto>>('/auth/me');
    return res.data;
  },
};
