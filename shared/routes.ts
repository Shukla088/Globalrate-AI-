
import { z } from 'zod';

export const api = {
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string().min(1),
      }),
      responses: {
        200: z.object({
          answer: z.string(),
          sources: z.array(z.string()),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/chat/history',
      responses: {
        200: z.array(z.object({
          role: z.string(),
          content: z.string(),
          sources: z.array(z.string()).nullable().optional(),
          createdAt: z.string().or(z.date()).nullable().optional(),
        })),
      },
    },
  },
};
