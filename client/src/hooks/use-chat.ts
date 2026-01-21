import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type ChatResponse } from "@shared/schema";

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[] | null;
  createdAt?: string | Date | null;
};

// GET /api/chat/history
export function useChatHistory() {
  return useQuery({
    queryKey: [api.chat.history.path],
    queryFn: async () => {
      const res = await fetch(api.chat.history.path);
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return api.chat.history.responses[200].parse(await res.json());
    },
  });
}

// POST /api/chat
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      const payload = { message };
      const validatedInput = api.chat.send.input.parse(payload);
      
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
      });

      if (!res.ok) {
        if (res.status === 500) {
           const error = api.chat.send.responses[500].parse(await res.json());
           throw new Error(error.message);
        }
        throw new Error("Failed to send message");
      }

      return api.chat.send.responses[200].parse(await res.json());
    },
    // Optimistic updates could go here, but since it's an AI response, 
    // we'll invalidate to refetch history or handle the response directly in the UI component
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.history.path] });
    },
  });
}
