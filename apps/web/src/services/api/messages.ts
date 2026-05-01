import { ApiErrorResponse, MessageDto, PaginatedApiResponse } from '@turbo-chat/types';
import { useInfiniteQuery, useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import apiClient from '@/lib/axios-client';

export interface ConversationMessagesParams {
  limit?: number;
  before?: string;
}

const fetchConversationMessages = async (
  conversationId: string,
  params?: ConversationMessagesParams
): Promise<PaginatedApiResponse<MessageDto[]>> => {
  const { data } = await apiClient.get<PaginatedApiResponse<MessageDto[]>>(
    `/messages/conversation/${conversationId}`,
    {
      params,
    }
  );
  return data;
};

export const useConversationMessagesQuery = <TData = PaginatedApiResponse<MessageDto[]>>(
  conversationId: string | undefined,
  params?: ConversationMessagesParams,
  options?: UseQueryOptions<PaginatedApiResponse<MessageDto[]>, AxiosError<ApiErrorResponse>, TData>
): UseQueryResult<TData, AxiosError<ApiErrorResponse>> => {
  return useQuery<PaginatedApiResponse<MessageDto[]>, AxiosError<ApiErrorResponse>, TData>({
    queryKey: ['messages', conversationId, params],
    queryFn: () => fetchConversationMessages(conversationId!, params),
    enabled: Boolean(conversationId),
    ...options,
  });
};

export const useConversationMessagesInfiniteQuery = (
  conversationId: string | undefined,
  limit: number = 20
) => {
  return useInfiniteQuery<PaginatedApiResponse<MessageDto[]>, AxiosError<ApiErrorResponse>>({
    queryKey: ['messages', 'infinite', conversationId],
    queryFn: ({ pageParam }) => {
      // pageParam will be the 'before' cursor (message ID)
      const params: ConversationMessagesParams = {
        limit,
        // If pageParam is undefined, it's the first page (newest messages)
        before: pageParam as string | undefined,
      };
      return fetchConversationMessages(conversationId!, params);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: PaginatedApiResponse<MessageDto[]>) => {
      // If the backend returns pagination metadata with 'before', enable next page
      // Assuming backend returns { data: [...], pagination: { before: "last_msg_id", hasMore: true } }
      // Based on controller code:
      // pagination: { before: beforeStr, hasMore: messages.length === limitNum }
      // The backend returns 'before' as the INPUT param. It doesn't auto-calculate the next cursor in the response 'pagination.before' field in a way that points to the NEXT page directly,
      // actually, the controller does: before: beforeStr. This is just echoing the input.
      // We need to calculate the next cursor from the LAST message in the data array.

      if (!lastPage.data || lastPage.data.length === 0) {
        return undefined;
      }

      const lastMessage = lastPage.data[lastPage.data.length - 1];
      // If we received fewer messages than limit, we're likely done
      if (lastPage.data.length < limit) {
        return undefined;
      }

      // The cursor for the next page is the ID of the last message we received
      return lastMessage.id;
    },
    enabled: Boolean(conversationId),
  });
};
