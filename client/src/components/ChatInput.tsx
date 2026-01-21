import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Command } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <div className={cn(
        "relative rounded-2xl border transition-all duration-300 bg-background shadow-lg",
        isLoading ? "border-muted opacity-80" : "border-primary/20 hover:border-primary/40 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 focus-within:shadow-xl"
      )}>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Globalrate AI anything..."
          className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 pr-14 text-base focus-visible:ring-0 border-0 placeholder:text-muted-foreground/60 custom-scrollbar rounded-2xl"
          disabled={isLoading}
        />
        
        <div className="absolute right-2 bottom-2">
          <Button
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl transition-all duration-200",
              message.trim() 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? (
              <Sparkles className="h-5 w-5 animate-pulse" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-mono text-[10px]">↵ Enter</span> to send
        </span>
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-mono text-[10px]">Shift + Enter</span> for new line
        </span>
        <span className="hidden sm:flex items-center gap-1.5">
          Globalrate AI verifies facts in real-time
        </span>
      </div>
    </div>
  );
}
