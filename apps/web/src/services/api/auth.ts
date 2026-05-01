/**
 * Auth API Hooks
 * React Query hooks for authentication operations
 */

import {
  UserDto,
  ApiErrorResponse,
  ApiMessageResponse,
  ApiResponse,
} from '@turbo-chat/types';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import apiClient from '@/lib/axios-client';
import { SigninRequestDto, SignupRequestDto } from '@/lib/validators';

const signin = async (payload: SigninRequestDto): Promise<ApiResponse<UserDto>> => {
  const { data } = await apiClient.post<ApiResponse<UserDto>>('/auth/signin', payload);
  return data;
};

const signup = async (payload: SignupRequestDto): Promise<ApiResponse<UserDto>> => {
  const { data } = await apiClient.post<ApiResponse<UserDto>>('/auth/signup', payload);
  return data;
};

const signout = async (): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.post<ApiMessageResponse>('/auth/signout');
  return data;
};

const refresh = async (): Promise<ApiMessageResponse> => {
  const { data } = await apiClient.post<ApiMessageResponse>('/auth/refresh');
  return data;
};

export const useSigninMutation = (
  options?: UseMutationOptions<ApiResponse<UserDto>, AxiosError<ApiErrorResponse>, SigninRequestDto>
) => {
  return useMutation<ApiResponse<UserDto>, AxiosError<ApiErrorResponse>, SigninRequestDto>({
    mutationKey: ['auth', 'signin'],
    mutationFn: signin,
    ...options,
  });
};

export const useSignupMutation = (
  options?: UseMutationOptions<ApiResponse<UserDto>, AxiosError<ApiErrorResponse>, SignupRequestDto>
) => {
  return useMutation<ApiResponse<UserDto>, AxiosError<ApiErrorResponse>, SignupRequestDto>({
    mutationKey: ['auth', 'signup'],
    mutationFn: signup,
    ...options,
  });
};

export const useSignoutMutation = (
  options?: UseMutationOptions<ApiMessageResponse, AxiosError<ApiErrorResponse>, void>
) => {
  return useMutation<ApiMessageResponse, AxiosError<ApiErrorResponse>, void>({
    mutationKey: ['auth', 'signout'],
    mutationFn: signout,
    ...options,
  });
};

export const useRefreshMutation = (
  options?: UseMutationOptions<ApiMessageResponse, AxiosError<ApiErrorResponse>, void>
) => {
  return useMutation<ApiMessageResponse, AxiosError<ApiErrorResponse>, void>({
    mutationKey: ['auth', 'refresh'],
    mutationFn: refresh,
    ...options,
  });
};

// Backward compatibility aliases (deprecated)
export const useLoginMutation = useSigninMutation;
export const useRegisterMutation = useSignupMutation;
