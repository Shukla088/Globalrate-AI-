
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { randomUUID } from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function performSearch(query: string): Promise<{ results: string; sources: string[] }> {
  return {
    results: "Live confirmed data is not available right now.",
    sources: ["Live confirmed data is not available right now"]
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message, sessionId: incomingSessionId } = api.chat.send.input.parse(req.body);
      
      // SESSION HANDLING: Auto-generate if missing
      const sessionId = incomingSessionId || randomUUID();

      // 1. Get Session History (Follow-up within session)
      const history = await storage.getMessages(sessionId);
      const chatHistory = history.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // 2. Save User Message
      await storage.createMessage({
        sessionId,
        role: "user",
        content: message,
        sources: null
      });

      // 3. Perform Search
      const searchData = await performSearch(message);

      // 4. Construct System Prompt
      const systemPrompt = `You are Globalrate AI, a real-time AI search and chat assistant. 

SESSION RULES:
- Every chat message MUST belong to a session.
- Maintain full conversation context inside the same session.
- Do NOT share context across different sessions.
- If asked who created you, reply exactly: "I was created by Shreesh Shukla."

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Your answer here",
  "sources": ["domain1.com", "domain2.com"]
}

Context Data:
${searchData.results}
`;

      // 5. Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content;
      let parsedResponse: { answer: string; sources: string[] };
      
      try {
        parsedResponse = JSON.parse(responseContent || "{}");
      } catch (e) {
        parsedResponse = {
          answer: responseContent || "Error generating response.",
          sources: ["Internal Error"]
        };
      }

      if (!parsedResponse.sources || parsedResponse.sources.length === 0) {
        parsedResponse.sources = ["Live confirmed data is not available right now"];
      }

      // 6. Save Assistant Message
      await storage.createMessage({
        sessionId,
        role: "assistant",
        content: parsedResponse.answer,
        sources: parsedResponse.sources
      });

      // Include session_id in JSON response for client
      res.json({
        ...parsedResponse,
        session_id: sessionId
      });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  app.get(api.chat.history.path, async (req, res) => {
    try {
      const { sessionId } = req.query as { sessionId?: string };
      const messages = await storage.getMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  return httpServer;
}
