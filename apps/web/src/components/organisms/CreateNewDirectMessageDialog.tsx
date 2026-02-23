import { Dispatch, FormEvent, SetStateAction, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserSearchInput } from '@/components/molecules/UserSearchInput';
import { useCreateConversation } from '@/hooks/useCreateConversation';
import type { UserDto } from '@raven/types';
import { useConversationStore } from '@/store/useConversationStore';

interface CreateNewDirectMessageDialogProps {
  openDirectMessage: boolean;
  setOpenDirectMessage: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}

const CreateNewDirectMessageDialog = (props: CreateNewDirectMessageDialogProps) => {
  const { openDirectMessage, setOpenDirectMessage, children } = props;
  const navigate = useNavigate();

  const { directConversations } = useConversationStore((state) => state);



  const { formData, loading, createConversation, updateSelectedUsers, resetForm } =
    useCreateConversation({
      defaultType: 'direct',
      onSuccess: (conversation) => {
        // Navigate to the newly created conversation
        navigate(`/messages/${conversation.id}`);
        setOpenDirectMessage(false);
      },
    });



  // Check if selected users already have a direct conversation
  const existingDirectConversation = useMemo(() => {
    if (formData.selectedUsers.length !== 1) return null;

    const selectedUser = formData.selectedUsers[0];
    if (!selectedUser) return null;

    // Find existing direct conversation between current user and selected user
    // Now using email for uniqueness since backend returns email as conversation name for direct conversations
    return directConversations.find((conversation) => {
      if (conversation.type !== 'direct') return false;

      // Check if conversation name matches the selected user's email
      const selectedUserEmail = selectedUser.email?.toLowerCase() || '';
      const conversationName = conversation.name.toLowerCase();

      return conversationName === selectedUserEmail;
    });
  }, [formData.selectedUsers, directConversations]);

  const handleCreateDirectMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If there's an existing direct conversation, navigate to it
    if (existingDirectConversation) {
      navigate(`/messages/${existingDirectConversation.id}`);
      setOpenDirectMessage(false);
      return;
    }

    // Create the direct conversation
    await createConversation();
  };

  const handleDialogChange = (open: boolean) => {
    setOpenDirectMessage(open);
    if (!open) {
      // Reset form when dialog is closed
      resetForm();
    }
  };

  const handleUserSelection = (users: UserDto[]) => {
    updateSelectedUsers(users);
  };

  return (
    <Dialog open={openDirectMessage} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <div>{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-6" onSubmit={handleCreateDirectMessage}>
          <div className="flex flex-col gap-3">
            <Label className="text-[12px] font-bold text-left">SELECT USER</Label>
            <UserSearchInput
              selectedUsers={formData.selectedUsers}
              onUsersChange={handleUserSelection}
              maxUsers={1}
              minUsers={1}
              disabled={loading}
            />
          </div>

          {existingDirectConversation && formData.selectedUsers.length === 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Direct message conversation already exists with {formData.selectedUsers[0]?.email}.
                Click "Open Conversation" to join.
              </p>
            </div>
          )}



          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="default"
              disabled={
                loading ||
                formData.selectedUsers.length !== 1
              }
            >
              {loading
                ? 'Sending...'
                : existingDirectConversation
                  ? 'Open Conversation'
                  : 'Create Direct Message'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNewDirectMessageDialog;

