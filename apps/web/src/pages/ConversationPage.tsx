import ChatHeader from "@/components/organisms/ChatHeader";
import MessageBubble from "@/components/molecules/MessageBubble";
import MessagesSkeleton from "@/components/molecules/MessagesSkeleton";
import MessageInput from "@/components/organisms/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatPage } from "@/hooks/useChatPage";
import { ConnectionState } from "@/store/useSocketStore";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

const ConversationPage = () => {
  const {
    sessionUser,
    currentConversation,
    conversationData,
    memberCount,
    containerRef,
    mainRef,
    chats,
    chatsLoading,
    handleSendMessage,
    isConnected,
    connectionState,
    isFetchingNextPage,
    viewportRef,
  } = useChatPage();

  const keyboardHeight = useKeyboardHeight();

  return (
    <div className="w-full flex-1 min-h-0 relative flex flex-col overflow-hidden bg-background">
      <ChatHeader
        id={String(currentConversation?.id)}
        name={String(currentConversation?.name)}
        isGroup={currentConversation?.type === "group"}
        avatar={currentConversation?.avatar ?? ""}
        participantCount={memberCount}
        members={conversationData?.members as any}
        {...(sessionUser?.id !== undefined && { currentUserId: sessionUser.id })}
      />

      <div className="flex-1 min-h-0 relative">
        <ScrollArea
          ref={containerRef}
          viewportRef={viewportRef}
          className="h-full min-h-0 pt-4 px-4 transition-all duration-300 ease-out"
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : window.innerWidth < 768 ? "4rem" : "1rem",
          }}
        >
          {chatsLoading ? (
            <MessagesSkeleton isGroup={true} />
          ) : (
            <div className="flex flex-col w-full">
              {isFetchingNextPage && (
                <div className="flex justify-center p-2">
                  <span className="text-xs text-muted-foreground animate-pulse">Loading previous messages...</span>
                </div>
              )}
              {sessionUser?.id &&
                chats.map((message) => (
                  <MessageBubble key={message.id} content={message.text ?? ""} image={message.url ?? undefined} variant={message.senderId === sessionUser.id ? "sent" : "received"} timestamp={message.createdAt} avatarUrl={message.senderAvatar ?? ""} avatarFallback={message.senderName?.[0]?.toUpperCase() ?? "A"} />
                ))}
              <div ref={mainRef} className="h-0" />
            </div>
          )}
        </ScrollArea>
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
        disabled={connectionState === ConnectionState.ERROR}
      />
    </div>
  );
};

export default ConversationPage;
