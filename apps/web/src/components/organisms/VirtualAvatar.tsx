type VirtualAvatarProps = {
  isSpeaking?: boolean;
};

const VirtualAvatar = ({ isSpeaking = false }: VirtualAvatarProps) => {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_65%)]" />
      <div
        className={`relative h-36 w-36 rounded-full border border-emerald-400/40 bg-emerald-500/15 transition-all duration-300 md:h-48 md:w-48 ${
          isSpeaking ? 'scale-105 shadow-[0_0_60px_rgba(16,185,129,0.45)]' : 'scale-100'
        }`}
      >
        <div className="absolute inset-3 rounded-full border border-emerald-300/35" />
        <div className="absolute inset-8 rounded-full bg-emerald-200/20" />
      </div>
      <span className="absolute bottom-6 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        {isSpeaking ? 'AI is speaking' : 'AI is listening'}
      </span>
    </div>
  );
};

export default VirtualAvatar;
