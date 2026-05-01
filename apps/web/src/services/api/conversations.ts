import {
  ApiErrorResponse,
  ApiMessageResponse,
  ConversationDetailApiResponse,
  ConversationDetailResponseDto,
  ConversationMembershipRequest,
  ConversationMutationResponse,
  ConversationResponse,
  ConversationType,
  ConversationListApiResponse,
  CreateConversationRequest,
  ConversationListResponseDto,
} from '@turbo-chat/types';
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  QueryKey,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';

import apiClient from '@/lib/axios-client';

const CONVERSATIONS_QUERY_KEY = ['conversations'];

const fetchConversations = async (): Promise<ConversationListResponseDto> => {
  const { data } = await apiClient.get<ConversationListApiResponse>('/conversations');
  return data.data;
};

const fetchConversationById = async (id: string): Promise<ConversationDetailResponseDto> => {
  const { data } = await apiClient.get<ConversationDetailApiResponse>(`/conversations/${id}`);
  return data.data;
};

const createConversationRequest = async (
  payload: CreateConversationRequest
): Promise<ConversationResponse> => {
  const { data } = await apiClient.post<ConversationMutationResponse>('/conversations', payload);
  return data.data;
};

const deleteConversationRequest = async (id: string): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.delete<ApiMessageResponse>(`/conversations/${id}`);
  return data;
};

const leaveConversationRequest = async (id: string): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.put<ApiMessageResponse>(`/conversations/${id}/user`, {});
  return data;
};

const addUserToConversationRequest = async ({
  id,
  body,
}: {
  id: string;
  body: ConversationMembershipRequest;
}): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.post<ApiMessageResponse>(`/conversations/${id}/user`, body);
  return data;
};

const removeUserFromConversationRequest = async ({
  id,
  body,
}: {
  id: string;
  body: ConversationMembershipRequest;
}): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.delete<ApiMessageResponse>(`/conversations/${id}/user`, {
    data: body,
  });
  return data;
};

export const useConversationsQuery = <TData = ConversationListResponseDto>(
  options?: UseQueryOptions<ConversationListResponseDto, AxiosError<ApiErrorResponse>, TData>
): UseQueryResult<TData, AxiosError<ApiErrorResponse>> => {
  return useQuery<ConversationListResponseDto, AxiosError<ApiErrorResponse>, TData>({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: fetchConversations,
    staleTime: 30_000,
    ...options,
  });
};

export const useConversationQuery = <TData = ConversationDetailResponseDto>(
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<ConversationDetailResponseDto, AxiosError<ApiErrorResponse>, TData>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<TData, AxiosError<ApiErrorResponse>> => {
  return useQuery<ConversationDetailResponseDto, AxiosError<ApiErrorResponse>, TData>({
    queryKey: [...CONVERSATIONS_QUERY_KEY, id] as QueryKey,
    queryFn: () => fetchConversationById(id!),
    enabled: Boolean(id),
    ...options,
  });
};

export const useCreateConversationMutation = (
  options?: UseMutationOptions<
    ConversationResponse,
    AxiosError<ApiErrorResponse>,
    CreateConversationRequest & { type: ConversationType }
  >
) => {
  return useMutation<ConversationResponse, AxiosError<ApiErrorResponse>, CreateConversationRequest>(
    {
      mutationKey: ['conversations', 'create'],
      mutationFn: createConversationRequest,
      ...options,
    }
  );
};

export const useDeleteConversationMutation = (
  options?: UseMutationOptions<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>
) => {
  return useMutation<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['conversations', 'delete'],
    mutationFn: deleteConversationRequest,
    ...options,
  });
};

export const useLeaveConversationMutation = (
  options?: UseMutationOptions<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>
) => {
  return useMutation<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['conversations', 'leave'],
    mutationFn: leaveConversationRequest,
    ...options,
  });
};

export const useAddConversationMemberMutation = (
  options?: UseMutationOptions<
    ApiMessageResponse,
    AxiosError<ApiErrorResponse>,
    { id: string; body: ConversationMembershipRequest }
  >
) => {
  return useMutation<
    ApiMessageResponse,
    AxiosError<ApiErrorResponse>,
    { id: string; body: ConversationMembershipRequest }
  >({
    mutationKey: ['conversations', 'members', 'add'],
    mutationFn: addUserToConversationRequest,
    ...options,
  });
};

export const useRemoveConversationMemberMutation = (
  options?: UseMutationOptions<
    ApiMessageResponse,
    AxiosError<ApiErrorResponse>,
    { id: string; body: ConversationMembershipRequest }
  >
) => {
  return useMutation<
    ApiMessageResponse,
    AxiosError<ApiErrorResponse>,
    { id: string; body: ConversationMembershipRequest }
  >({
    mutationKey: ['conversations', 'members', 'remove'],
    mutationFn: removeUserFromConversationRequest,
    ...options,
  });
};

export const markConversationAsReadRequest = async (id: string): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.post<ApiMessageResponse>(`/conversations/${id}/read`, {});
  return data;
};

export const useMarkConversationAsReadMutation = (
  options?: UseMutationOptions<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>
) => {
  return useMutation<ApiMessageResponse, AxiosError<ApiErrorResponse>, string>({
    mutationKey: ['conversations', 'markAsRead'],
    mutationFn: markConversationAsReadRequest,
    ...options,
  });
};

