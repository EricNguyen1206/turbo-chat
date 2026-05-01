import { Plus } from 'lucide-react';
import { SidebarGroup, SidebarGroupAction, SidebarGroupLabel, SidebarMenu } from '../ui/sidebar';
import ChannelsSkeleton from './ChannelsSkeleton';
import CreateNewDirectMessageDialog from '../organisms/CreateNewDirectMessageDialog';
import { useState } from 'react';
import DirectMessageCard from '../atoms/DirectMessageCard';
import { ConversationDto } from '@turbo-chat/types';
import { ConversationState, useConversationStore } from '@/store/useConversationStore';

type SidebarDirectMessagesProps = {
  items: ConversationDto[];
  loading: boolean;
};

const SidebarDirectMessages = ({ items, loading }: SidebarDirectMessagesProps) => {
  const [openDirectMessage, setOpenDirectMessage] = useState(false);
  const activeConversationId = useConversationStore(
    (state: ConversationState) => state.activeConversationId
  );

  return (
    <SidebarGroup className="mb-8">
      <div className="flex items-center justify-between px-3 mb-3">
        <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 flex-1">
          Direct Messages
        </SidebarGroupLabel>
        <CreateNewDirectMessageDialog
          openDirectMessage={openDirectMessage}
          setOpenDirectMessage={setOpenDirectMessage}
        >
          <SidebarGroupAction
            onClick={() => setOpenDirectMessage(true)}
            className="h-5 w-5 rounded-md hover:bg-sidebar-accent/5 transition-all duration-200 opacity-60 hover:opacity-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="sr-only">Direct Message</span>
          </SidebarGroupAction>
        </CreateNewDirectMessageDialog>
      </div>
      <SidebarMenu className="gap-0.5">
        {loading ? (
          <ChannelsSkeleton />
        ) : (
          items.map((item) => {
            return (
              <DirectMessageCard
                key={item.id}
                convo={item}
                isActive={item.id === activeConversationId}
              />
            );
          })
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default SidebarDirectMessages;
