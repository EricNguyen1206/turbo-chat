import { ConversationDto } from '@turbo-chat/types';
import { useConversationStore } from '@/store/useConversationStore';
import { Hash } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type GroupMessageCardProps = {
  convo: ConversationDto;
  isActive: boolean;
};

const GroupMessageCard = ({ convo, isActive }: GroupMessageCardProps) => {
  const unreadCount = useConversationStore((state) => state.unreadCounts[convo.id] ?? 0);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={convo.name}
        className={cn(
          "h-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5",
          isActive && "bg-sidebar-accent/10 hover:bg-sidebar-accent/10"
        )}
      >
        <Link to={`/messages/${convo.id}`} className="flex items-center gap-3">
          <Hash className="w-[16px] h-[16px] opacity-50 font-light text-sidebar-foreground" />
          <span className="text-sm font-light text-sidebar-foreground flex-1 truncate">{convo.name}</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export default GroupMessageCard;
