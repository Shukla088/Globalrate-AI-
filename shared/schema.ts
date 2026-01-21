
import { pgTable, text, serial, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  sources: jsonb("sources").$type<string[]>(), // Array of URLs
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  createdAt: true 
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ChatRequest = {
  message: string;
  sessionId: string;
};

export type ChatResponse = {
  answer: string;
  sources: string[];
  session_id: string;
};
