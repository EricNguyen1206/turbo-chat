import { useState } from 'react';
import { toast } from 'react-toastify';

import { useCreateConversationMutation } from '@/services/api/conversations';
import { useCurrentUserQuery } from '@/services/api/users';
import { CreateConversationRequest, ConversationDto, ConversationType } from '@turbo-chat/types';
import type { UserDto } from '@turbo-chat/types';
import { useConversationStore } from '@/store/useConversationStore';

interface UseCreateConversationOptions {
  onSuccess?: (conversation: ConversationDto) => void;
  onError?: (error: any) => void;
  showToast?: boolean;
  defaultType?: 'group' | 'direct';
}

interface CreateConversationFormData {
  name: string;
  type: 'group' | 'direct';
  selectedUsers: UserDto[];
}

export const useCreateConversation = (options: UseCreateConversationOptions = {}) => {
  const { onSuccess, onError, showToast = true, defaultType = 'group' } = options;

  const { data: user } = useCurrentUserQuery();
  const { addGroupConversation, addDirectConversation } = useConversationStore((state) => state);

  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateConversationFormData>({
    name: '',
    type: defaultType,
    selectedUsers: [],
  });

  const postConversationMutation = useCreateConversationMutation({
    onSuccess: (data) => {
      if (showToast) {
        toast.success('Conversation created successfully');
      }

      // Transform API response to ConversationDto format
      const newConversation: ConversationDto = {
        id: data.id,
        name: data.name,
        ownerId: data.ownerId,
        type: formData.type === 'group' ? ConversationType.GROUP : ConversationType.DIRECT,
        avatar: '',
        createdAt: data.createdAt || new Date(),
      };

      // Add to appropriate conversation list in store
      if (newConversation.type === ConversationType.GROUP) {
        addGroupConversation(newConversation);
      } else {
        addDirectConversation(newConversation);
      }

      // Reset form
      resetForm();
      setLoading(false);

      // Call custom success callback
      onSuccess?.(newConversation);
    },
    onError: (error) => {
      if (showToast) {
        toast.error('Failed to create conversation');
      }
      setLoading(false);
      onError?.(error);
    },
  });

  const validateForm = (data: CreateConversationFormData): string | null => {
    if (!data.name.trim() && data.type === 'group') {
      return 'Please enter a conversation name';
    }

    if (data.name.length > 0 && data.name.length < 2) {
      return 'Conversation name must be at least 2 characters long';
    }

    if (data.name.length > 50) {
      return 'Conversation name cannot exceed 50 characters';
    }

    if (!user?.id) {
      return 'User authentication required';
    }

    // Validate user selection based on conversation type
    if (data.type === 'group') {
      if (data.selectedUsers.length < 2) {
        return 'Please select at least 2 users for the conversation';
      }
      if (data.selectedUsers.length > 4) {
        return 'Cannot select more than 4 users for a conversation';
      }
    } else     if (data.type === 'direct') {
      if (data.selectedUsers.length !== 1) {
        return 'Please select exactly 1 user for direct message';
      }
    }

    return null;
  };

  const createConversation = async (conversationData?: Partial<CreateConversationFormData>) => {
    const dataToSubmit = { ...formData, ...conversationData };

    // Validate form data
    const validationError = validateForm(dataToSubmit);
    if (validationError) {
      if (showToast) {
        toast.error(validationError);
      }
      return { success: false, error: validationError };
    }

    setLoading(true);

    try {
      // Prepare API request body
      const selectedUserIds = dataToSubmit.selectedUsers.map((u) => String(u.id!));
      const requestBody: CreateConversationRequest = {
        ...(dataToSubmit.name.trim() && { name: dataToSubmit.name.trim() }), // Backend will auto-generate name for direct messages
        type: dataToSubmit.type as ConversationType,
        userIds: [...new Set(selectedUserIds)], // Remove duplicates
      };

      const response = await postConversationMutation.mutateAsync(requestBody);

      return { success: true, data: response };
    } catch (error) {
      // Error is handled by the mutation's onError callback
      return { success: false, error };
    }
  };

  const updateFormData = (updates: Partial<CreateConversationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const updateSelectedUsers = (users: UserDto[]) => {
    setFormData((prev) => ({ ...prev, selectedUsers: users }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: defaultType,
      selectedUsers: [],
    });
  };

  return {
    // State
    formData,
    loading,
    user,

    // Actions
    createConversation,
    updateFormData,
    updateSelectedUsers,
    resetForm,

    // Utilities
    validateForm: (data?: CreateConversationFormData) => validateForm(data || formData),

    // Raw mutation for advanced usage
    mutation: postConversationMutation,
  };
};
