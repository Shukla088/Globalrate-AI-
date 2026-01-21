import ReactMarkdown from 'react-markdown';
import { Bot, User, Globe, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: string[] | null;
  isLatest?: boolean;
}

export function MessageBubble({ role, content, sources, isLatest }: MessageBubbleProps) {
  const isAI = role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-4 p-6 md:p-8 rounded-3xl mb-4 transition-all",
        isAI 
          ? "bg-muted/50 dark:bg-muted/10 border border-transparent" 
          : "bg-background border border-border/50 shadow-sm"
      )}
    >
      <div className="shrink-0 flex flex-col gap-2">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
          isAI 
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20" 
            : "bg-gradient-to-br from-slate-700 to-slate-900 text-white dark:from-slate-200 dark:to-slate-400 dark:text-slate-900"
        )}>
          {isAI ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
        </div>
      </div>

      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {isAI ? "Globalrate AI" : "You"}
          </span>
          {isAI && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none break-words text-foreground/90 leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {sources && sources.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-4 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Globe className="h-3.5 w-3.5" />
              Verified Sources
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sources.map((source, i) => (
                <div 
                  key={i} 
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all cursor-default"
                >
                  <div className="h-6 w-6 shrink-0 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground truncate flex-1 font-medium">{source}</span>
                  {/* Since these are just domains in the mock, we simulate a link feel */}
                  <ExternalLink className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
