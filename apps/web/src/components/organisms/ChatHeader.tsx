import { useState, useMemo } from "react";
import { Video, MoreHorizontal, Eye, Trash2, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ViewMembersDialog from "../molecules/ViewMembersDialog";
import {
  useLeaveConversationMutation,
  useDeleteConversationMutation,
} from "@/services/api/conversations";
import { useNavigate } from "react-router-dom";
import { useConversationStore } from "@/store/useConversationStore";
import { useSocketStore } from "@/store/useSocketStore";
import { toast } from "react-toastify";
import GroupChatHeader from "../atoms/GroupChatHeaderItem";
import DirectChatHeader from "../atoms/DirectChatHeaderItem";

interface Member {
  id?: string;
  username?: string;
  email?: string;
  avatar?: string;
}

interface ChatHeaderProps {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  participantCount?: number;
  members?: Member[];
  ownerId?: string;
  currentUserId?: string;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const {
    id,
    name,
    isGroup,
    participantCount = 0,
    members = [],
    ownerId,
    currentUserId,
  } = props;

  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const navigate = useNavigate();
  const { removeConversation } = useConversationStore();
  const { leaveConversation: leaveConversationFromSocket } = useSocketStore();

  const isOwner = currentUserId === ownerId;



  // For 1-1 chats, derive friend's email from members array
  const friendEmail = useMemo(() => {
    if (isGroup || !members.length) return undefined;
    const friend = members.find((m) => m.id !== currentUserId);
    return friend?.email;
  }, [isGroup, members, currentUserId]);



  const leaveConversationMutation = useLeaveConversationMutation({
    onSuccess: () => {
      const conversationType = isGroup ? "group" : "direct";
      removeConversation(id, conversationType);

      try {
        leaveConversationFromSocket(id);
      } catch (error) {
        // Error handled silently
      }

      toast.success("Successfully left the conversation");
      navigate("/messages");
    },
    onError: () => {
      toast.error("Failed to leave conversation. Please try again.");
    },
  });

  const deleteConversationMutation = useDeleteConversationMutation({
    onSuccess: () => {
      const conversationType = isGroup ? "group" : "direct";
      removeConversation(id, conversationType);

      try {
        leaveConversationFromSocket(id);
      } catch (error) {
        // Error handled silently
      }

      toast.success("Conversation deleted successfully");
      navigate("/messages");
    },
    onError: () => {
      toast.error("Failed to delete conversation. Please try again.");
    },
  });

  const handleViewMembers = () => {
    setIsViewMembersOpen(true);
  };

  const handleDeleteConversation = () => {
    const confirmMessage = isGroup
      ? `Are you sure you want to delete the group conversation "#${name}"? This action cannot be undone and all members will lose access to this conversation.`
      : `Are you sure you want to delete the direct message with "${name}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      deleteConversationMutation.mutate(id);
    }
  };

  const handleLeaveConversation = () => {
    if (confirm("Are you sure you want to leave this conversation?")) {
      leaveConversationMutation.mutate(id);
    }
  };

  return (
    <>
      <div className="absolute top-0 w-full h-[64px] z-50 shrink-0 flex items-center justify-between mt-0 px-4 py-2 bg-background border-b border-border/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 hover:bg-transparent focus:bg-transparent"
            >
              <div className="flex items-center gap-3 cursor-pointer hover:bg-accent/5 rounded-lg px-3 py-2 transition-all duration-200">
                {/* Conditional rendering based on conversation type */}
                {isGroup ? (
                  <GroupChatHeader
                    name={name}
                    participantCount={participantCount}
                    onMemberCountClick={handleViewMembers}
                  />
                ) : (
                  <DirectChatHeader
                    name={name}
                    email={friendEmail}
                  />
                )}
                <MoreHorizontal className="w-4 h-4 text-muted-foreground/40 ml-2" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 rounded-xl border-border/50 shadow-lg"
          >
            {isGroup && (
              <>
                <DropdownMenuItem
                  onClick={handleViewMembers}
                  className="rounded-lg py-2.5 gap-3 cursor-pointer"
                >
                  <Eye className="w-[16px] h-[16px] opacity-50" />
                  <span className="font-light text-sm">View members</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
              </>
            )}

            {isOwner ? (
              <DropdownMenuItem
                onClick={handleDeleteConversation}
                className="rounded-lg py-2.5 gap-3 cursor-pointer text-destructive/80 focus:text-destructive hover:bg-destructive/5"
                disabled={deleteConversationMutation.isPending}
              >
                <Trash2 className="w-[16px] h-[16px]" />
                <span className="font-light text-sm">
                  {deleteConversationMutation.isPending
                    ? "Deleting..."
                    : "Delete conversation"}
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleLeaveConversation}
                className="rounded-lg py-2.5 gap-3 cursor-pointer text-accent/80 focus:text-accent hover:bg-accent/5"
                disabled={leaveConversationMutation.isPending}
              >
                <LogOut className="w-[16px] h-[16px]" />
                <span className="font-light text-sm">
                  {leaveConversationMutation.isPending
                    ? "Leaving..."
                    : "Leave conversation"}
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-lg hover:bg-accent/5 transition-all duration-200 cursor-not-allowed"
                >
                  <Video className="w-[18px] h-[18px] text-muted-foreground/40" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg border-border/50 bg-background shadow-lg">
                <p className="text-xs font-light">Upcoming feature</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* View Members Dialog - only for group chats */}
      {isGroup && (
        <ViewMembersDialog
          isOpen={isViewMembersOpen}
          onClose={() => setIsViewMembersOpen(false)}
          members={members}
          channelName={name}
        />
      )}
    </>
  );
}
