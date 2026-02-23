import { UserDto } from "./user.js";

// Conversation Types
export enum ConversationType {
  DIRECT = "direct",
  GROUP = "group",
}

export interface ConversationDto {
  id: string;
  name: string;
  avatar?: string;
  type: ConversationType;
  ownerId: string;
  otherUserId?: string; // For direct messages: the ID of the other user (friend)
  createdAt: Date;
  unreadCount?: number;
  lastReadAt?: Date;
  totalTokensUsed?: number;
  maxContextWindow?: number;
}
export interface ConversationDetailDto extends ConversationDto {
  members: UserDto[];
}

export interface ConversationListDto {
  direct: ConversationDto[];
  group: ConversationDto[];
}

// API Request/Response Types
export interface CreateConversationRequest {
  name?: string;
  type: ConversationType;
  userIds: string[];
}

export interface ConversationMembershipRequest {
  userId: string;
}

export interface ConversationResponse extends ConversationDto {
  // Extended response from API
}

export interface ConversationMutationResponse {
  success: boolean;
  message: string;
  data: ConversationResponse;
}

export interface ConversationListResponseDto extends ConversationListDto { }

export interface ConversationDetailResponseDto extends ConversationDetailDto { }

export interface ConversationListApiResponse {
  success: boolean;
  message: string;
  data: ConversationListResponseDto;
}

export interface ConversationDetailApiResponse {
  success: boolean;
  message: string;
  data: ConversationDetailResponseDto;
}

