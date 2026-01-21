
import { z } from 'zod';

export const api = {
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string().min(1),
        sessionId: z.string(),
      }),
      responses: {
        200: z.object({
          answer: z.string(),
          sources: z.array(z.string()),
          session_id: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/chat/history',
      input: z.object({
        sessionId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          sessionId: z.string(),
          role: z.string(),
          content: z.string(),
          sources: z.array(z.string()).nullable().optional(),
          createdAt: z.string().or(z.date()).nullable().optional(),
        })),
      },
    },
  },
};
