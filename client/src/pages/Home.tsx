import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { EmptyState } from "@/components/EmptyState";
import { useChatHistory, useSendMessage, type Message } from "@/hooks/use-chat";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: history, isLoading: isHistoryLoading } = useChatHistory();
  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage();
  const { toast } = useToast();
  
  // Local state to manage conversation optimistically
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync history with local state
  useEffect(() => {
    if (history) {
      // API returns array of messages. Schema: { role, content, sources, createdAt }
      // We map it to our internal Message type if needed, but it should match closely
      setMessages(history.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        sources: msg.sources || undefined,
        createdAt: msg.createdAt || undefined,
      })));
    }
  }, [history]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async (content: string) => {
    // 1. Optimistically add user message
    const userMsg: Message = { role: "user", content };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 2. Send to API
      const response = await sendMessage(content);
      
      // 3. Add AI response
      const aiMsg: Message = {
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };
      setMessages(prev => [...prev, aiMsg]);
      
    } catch (error) {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      // Optionally remove user message on failure, or show error state on message
    }
  };

  if (isHistoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans selection:bg-primary/20">
      <Header />
      
      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col relative">
        <div className="flex-1 px-4 md:px-6 py-6 pb-32">
          {messages.length === 0 ? (
            <div className="h-[60vh] flex items-center justify-center">
              <EmptyState />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <MessageBubble 
                  key={index}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  isLatest={index === messages.length - 1}
                />
              ))}
              
              {isSending && (
                <div className="flex w-full gap-4 p-6 md:p-8 rounded-3xl bg-muted/50 border border-transparent animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-primary/20" />
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-primary/10 rounded w-1/4" />
                    <div className="h-4 bg-primary/10 rounded w-3/4" />
                    <div className="h-4 bg-primary/10 rounded w-1/2" />
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent z-10 pb-8">
          <ChatInput onSend={handleSend} isLoading={isSending} />
        </div>
      </main>
    </div>
  );
}
