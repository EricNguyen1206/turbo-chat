import ChatHeader from "@/components/organisms/ChatHeader";
import MessageBubble from "@/components/molecules/MessageBubble";
import MessagesSkeleton from "@/components/molecules/MessagesSkeleton";
import MessageInput from "@/components/organisms/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatPage } from "@/hooks/useChatPage";
import { ConnectionState } from "@/store/useSocketStore";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import VirtualAvatar from "@/components/organisms/VirtualAvatar";

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

      {/* Context Window Usage */}
      <div className="w-full bg-secondary/10 px-4 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground flex justify-between items-center border-b border-border/5">
        <span>Context Window</span>
        <span>Tokens: {currentConversation?.totalTokensUsed ?? 0} / {currentConversation?.maxContextWindow ?? 8000}</span>
      </div>

      {/* 3D Avatar Background / Split View */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Avatar Section */}
        <div className="w-full md:w-1/2 h-64 md:h-full relative overflow-hidden bg-gradient-to-b from-transparent to-background/5 border-b md:border-b-0 md:border-r border-border/10">
          <VirtualAvatar isSpeaking={connectionState === ConnectionState.CONNECTED /* Dummy flag for now */} />
        </div>

        {/* ScrollArea with dynamic padding for keyboard + tab bar */}
        <ScrollArea
          ref={containerRef}
          viewportRef={viewportRef}
          className="flex-1 min-h-0 pt-4 px-4 transition-all duration-300 ease-out"
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 80}px` : (window.innerWidth < 768 ? '4rem' : '1rem')
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
