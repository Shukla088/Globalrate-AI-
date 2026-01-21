
import { db } from "./db";
import { messages, type Message, type InsertMessage } from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getMessages(sessionId?: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(sessionId?: string): Promise<Message[]> {
    if (sessionId) {
      return await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.createdAt));
    }
    return await db.select().from(messages).orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
