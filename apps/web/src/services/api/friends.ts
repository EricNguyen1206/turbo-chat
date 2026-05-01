/**
 * Friends API Hooks
 * React Query hooks for friend operations
 */

import {
  ApiErrorResponse,
  ApiResponse,
  FriendDto,
  FriendRequestDto,
  FriendRequestsResponse,
} from '@turbo-chat/types';
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';

import apiClient from '@/lib/axios-client';
import { useAuthStore } from '@/store/useAuthStore';

// ============ API Functions ============

const getFriends = async (): Promise<FriendDto[]> => {
  const { data } = await apiClient.get<ApiResponse<FriendDto[]>>('/friends');
  return data.data;
};

const getFriendRequests = async (): Promise<FriendRequestsResponse> => {
  const { data } = await apiClient.get<ApiResponse<FriendRequestsResponse>>('/friends/requests');
  return data.data;
};

const sendFriendRequest = async (toUserId: string): Promise<FriendRequestDto> => {
  const { data } = await apiClient.post<ApiResponse<FriendRequestDto>>('/friends/requests', {
    toUserId,
  });
  return data.data;
};

const acceptFriendRequest = async (requestId: string): Promise<FriendDto> => {
  const { data } = await apiClient.post<ApiResponse<FriendDto>>(
    `/friends/requests/${requestId}/accept`
  );
  return data.data;
};

const declineFriendRequest = async (requestId: string): Promise<void> => {
  await apiClient.post(`/friends/requests/${requestId}/decline`);
};

// ============ Query Hooks ============

export const useFriendsQuery = (
  options?: Omit<UseQueryOptions<FriendDto[], AxiosError<ApiErrorResponse>>, 'queryKey' | 'queryFn'>
): UseQueryResult<FriendDto[], AxiosError<ApiErrorResponse>> => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<FriendDto[], AxiosError<ApiErrorResponse>>({
    queryKey: ['friends'],
    queryFn: getFriends,
    staleTime: 30_000, // 30 seconds
    enabled: isAuthenticated && (options?.enabled !== false),
    ...options,
  });
};

export const useFriendRequestsQuery = (
  options?: Omit<
    UseQueryOptions<FriendRequestsResponse, AxiosError<ApiErrorResponse>>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<FriendRequestsResponse, AxiosError<ApiErrorResponse>> => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<FriendRequestsResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['friends', 'requests'],
    queryFn: getFriendRequests,
    staleTime: 30_000, // 30 seconds
    enabled: isAuthenticated && (options?.enabled !== false),
    ...options,
  });
};

// ============ Mutation Hooks ============

export const useSendFriendRequestMutation = (
  options?: UseMutationOptions<FriendRequestDto, AxiosError<ApiErrorResponse>, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<FriendRequestDto, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['friends', 'requests', 'send'],
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      // Invalidate friend requests to refresh the list
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
    ...options,
  });
};

export const useAcceptFriendRequestMutation = (
  options?: UseMutationOptions<FriendDto, AxiosError<ApiErrorResponse>, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<FriendDto, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['friends', 'requests', 'accept'],
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      // Invalidate both friends list and requests
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    ...options,
  });
};

export const useDeclineFriendRequestMutation = (
  options?: UseMutationOptions<void, AxiosError<ApiErrorResponse>, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['friends', 'requests', 'decline'],
    mutationFn: declineFriendRequest,
    onSuccess: () => {
      // Invalidate friend requests to refresh the list
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
    ...options,
  });
};
