import { ConversationDto } from '@raven/types';
import { useConversationStore } from '@/store/useConversationStore';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Link } from 'react-router-dom';
import { SidebarMenuItem } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type DirectMessageCardProps = {
  convo: ConversationDto;
  isActive: boolean;
};

const DirectMessageCard = ({ convo, isActive }: DirectMessageCardProps) => {
  const unreadCount = useConversationStore((state) => state.unreadCounts[convo.id] ?? 0);
  const displayName = convo.name.split('@')[0];

  return (
    <SidebarMenuItem>
      <Link
        to={`/messages/${convo.id}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5",
          isActive && "bg-sidebar-accent/10 hover:bg-sidebar-accent/10"
        )}
      >
        <div className="relative">
          <Avatar className="w-7 h-7 rounded-lg transition-all duration-200">
            <AvatarImage src={convo.avatar} className="object-cover" />
            <AvatarFallback className="rounded-lg bg-sidebar-accent/20 text-sidebar-foreground/60 text-xs font-light">
              {convo.name
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <h4 className="font-light text-sidebar-foreground text-sm truncate">{displayName}</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
      </Link>
    </SidebarMenuItem>
  );
};

export default DirectMessageCard;
