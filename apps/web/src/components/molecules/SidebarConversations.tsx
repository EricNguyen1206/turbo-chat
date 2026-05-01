import { Plus } from 'lucide-react';
import { useState } from 'react';

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar';
import CreateNewConversationDialog from '../organisms/CreateNewConversationDialog';
import ConversationsSkeleton from './ConversationsSkeleton';
import GroupMessageCard from '../atoms/GroupMessageCard';
import { ConversationDto } from '@turbo-chat/types';
import { ConversationState, useConversationStore } from '@/store/useConversationStore';

type SidebarGroupMessagesProps = {
  items: ConversationDto[];
  loading: boolean;
};

export const SidebarConversations = ({ items, loading }: SidebarGroupMessagesProps) => {
  const [openCreateConversation, setOpenCreateConversation] = useState(false);
  const activeConversationId = useConversationStore(
    (state: ConversationState) => state.activeConversationId
  );

  return (
    <SidebarGroup className="mb-8">
      <div className="flex items-center justify-between px-3 mb-3">
        <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 flex-1">
          Groups
        </SidebarGroupLabel>
        <CreateNewConversationDialog
          openCreateConversation={openCreateConversation}
          setOpenCreateConversation={setOpenCreateConversation}
        >
          <SidebarGroupAction
            onClick={() => setOpenCreateConversation(true)}
            className="h-5 w-5 rounded-md hover:bg-sidebar-accent/5 transition-all duration-200 opacity-60 hover:opacity-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="sr-only">Add Conversation</span>
          </SidebarGroupAction>
        </CreateNewConversationDialog>
      </div>

      <SidebarMenu className="gap-0.5">
        {loading ? (
          <ConversationsSkeleton />
        ) : (
          items.map((convo) => (
            <GroupMessageCard
              key={convo.id}
              convo={convo}
              isActive={convo.id === activeConversationId}
            />
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default SidebarConversations;
