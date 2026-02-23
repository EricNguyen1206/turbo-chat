import { Paperclip, Send, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { useUpload } from "@/hooks/useUpload";
import { toast } from "react-toastify";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { cn } from "@/lib/utils";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface MessageInputProps {
  onSendMessage: (message: string, url?: string, fileName?: string) => void;
  isConnected?: boolean;
  disabled?: boolean;
}

export default function MessageInput({
  onSendMessage,
  isConnected = true,
  disabled = false,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();
  const keyboardHeight = useKeyboardHeight();
  const [message, setMessage] = useState("");
  const { isRecording, isTranscribing, startRecording, stopRecordingAndTranscribe } = useVoiceRecorder();

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const text = await stopRecordingAndTranscribe();
      if (text) {
        setMessage(prev => (prev ? prev + ' ' + text : text));
      }
    } else {
      startRecording();
    }
  };

  const handleSend = () => {
    if (message.trim() && isConnected && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      //   setHasTyped(false);

      // // Stop typing indicator when sending
      // if (onStopTyping) {
      //     onStopTyping()
      // }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Validate file size/type here

    try {
      const result = await uploadFile(file, "chat-images");
      if (result) {
        // Send message with image immediately
        // For now, we send an empty text message with the image
        // Or we could prompt user to add text.
        // Assuming sending immediately:
        onSendMessage("", result.publicUrl, file.name);
        toast.success("Image sent");
      }
    } catch (error) {
      // Error handled in useUpload
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  //   // Auto-stop typing after 3 seconds of inactivity
  //   useEffect(() => {
  //     if (hasTyped && onStopTyping) {
  //       const timer = setTimeout(() => {
  //         onStopTyping();
  //         setHasTyped(false);
  //       }, 3000);

  //       return () => clearTimeout(timer);
  //     }
  //   }, [hasTyped, onStopTyping]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 md:bottom-0 w-full h-16 px-4 py-2 bg-background border-t border-border/30 transition-transform duration-300 ease-out md:relative md:transform-none z-40",
      )}
      style={{
        transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight - 64}px)` : 'translateY(0)',
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={disabled || !isConnected || isUploading}
      />

      {/* Connection status indicator - Nordic minimalism: subtle inline warning */}
      {!isConnected ? (
        <div className="mb-3 text-xs font-light text-accent/70 bg-accent/5 border border-accent/10 rounded-lg px-4 py-2 tracking-wide">
          Not connected
        </div>)
        : (
          <div className="w-full h-full flex items-center gap-3">
            <div className="h-full flex-1">
              <div className="h-full flex items-center gap-2 bg-background border border-border/30 rounded-xl px-4 py-3 focus-within:border-primary/30 transition-all duration-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-11 w-11 shrink-0 rounded-lg hover:bg-accent/5 transition-all duration-200 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                  onClick={handleFileSelect}
                  disabled={disabled || !isConnected || isUploading}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <input
                  type="text"
                  value={message}
                  placeholder={disabled ? "Disconnected" : !isConnected ? "Connecting..." : isUploading ? "Uploading..." : "Type a message"}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  disabled={disabled || !isConnected || isUploading}
                  className="h-full flex-1 bg-transparent outline-none resize-none disabled:cursor-not-allowed disabled:opacity-40 font-light text-sm tracking-wide placeholder:text-muted-foreground/40"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceToggle}
                  disabled={disabled || !isConnected || isUploading || isTranscribing}
                  className={`h-11 w-11 shrink-0 rounded-lg hover:bg-accent/5 transition-all duration-200 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={(!message.trim() && !isUploading) || disabled || !isConnected}
              size="icon"
              className="h-12 w-12 shrink-0 bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:text-primary/30 rounded-xl transition-all duration-200 shadow-none"
            >
              <Send className="w-[16px] h-[16px]" />
            </Button>
          </div>)
      }


    </div>
  );
}
