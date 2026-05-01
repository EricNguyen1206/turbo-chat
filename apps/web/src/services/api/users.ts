/**
 * Users API Hooks
 * React Query hooks for user operations
 */

import { ApiErrorResponse, ApiResponse, UserDto } from '@turbo-chat/types';
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';

import apiClient from '@/lib/axios-client';
import { UpdateProfileDto } from '@/lib/validators';
import { useAuthStore } from '@/store/useAuthStore';

const getCurrentUser = async (): Promise<UserDto> => {
  const { data } = await apiClient.get<ApiResponse<UserDto>>('/users/profile');
  return data.data;
};

const searchUsers = async (username: string): Promise<UserDto[]> => {
  const { data } = await apiClient.get<UserDto[]>('/users/search', {
    params: { username },
  });
  return data;
};

const updateProfile = async (payload: UpdateProfileDto): Promise<UserDto> => {
  const { data } = await apiClient.put<ApiResponse<UserDto>>('/users/profile', payload);
  return data.data;
};

export const useCurrentUserQuery = (
  options?: Omit<UseQueryOptions<UserDto, AxiosError<ApiErrorResponse>>, 'queryKey' | 'queryFn'>
): UseQueryResult<UserDto, AxiosError<ApiErrorResponse>> => {
  // Only run this query if user is authenticated
  const { isAuthenticated } = useAuthStore();

  return useQuery<UserDto, AxiosError<ApiErrorResponse>>({
    queryKey: ['user', 'current'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: isAuthenticated && (options?.enabled !== false),
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401, 403, 404)
      const status = error.response?.status;
      if (status === 401 || status === 403 || status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
};

export const useSearchUsersQuery = (
  username: string
): UseQueryResult<UserDto[], AxiosError<ApiErrorResponse>> => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['users', 'search', username],
    queryFn: () => searchUsers(username),
    enabled: isAuthenticated && !!username && username.length >= 2,
    staleTime: 30_000,
  });
};

export const useUpdateProfileMutation = (
  options?: UseMutationOptions<UserDto, AxiosError<ApiErrorResponse>, UpdateProfileDto>
) => {
  return useMutation<UserDto, AxiosError<ApiErrorResponse>, UpdateProfileDto>({
    mutationKey: ['users', 'profile', 'update'],
    mutationFn: updateProfile,
    ...options,
  });
};
