interface DirectChatHeaderProps {
  name: string;
  email?: string;
}

export default function DirectChatHeader({
  name,
  email,
}: DirectChatHeaderProps) {
  return (
    <div>
      <h2 className="font-light text-base text-foreground tracking-wide">
        {name}
      </h2>
      <div className="flex items-center gap-2 text-xs mt-0.5">
        {email && (
          <>
            <span className="text-muted-foreground/30">•</span>
            <span className="font-light text-muted-foreground/60 truncate max-w-[200px]">
              {email}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
