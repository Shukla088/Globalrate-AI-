
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

async function fetchWikipedia(query: string): Promise<{ text: string; url: string }> {
  try {
    const formattedQuery = query.trim().replace(/\s+/g, "_");
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedQuery)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json() as any;
      return {
        text: data.extract || "",
        url: data.content_urls?.desktop?.page || ""
      };
    }
  } catch (error) {
    console.error("Wikipedia fetch error:", error);
  }
  return { text: "", url: "" };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message, sessionId: incomingSessionId } = api.chat.send.input.parse(req.body);
      
      const sessionId = incomingSessionId || randomUUID();

      // 1. Get History (Last 5 messages for context)
      const history = await storage.getMessages(sessionId);
      const recentHistory = history.slice(-5);
      
      // 2. Fetch Wikipedia Data
      const wiki = await fetchWikipedia(message);

      // 3. Construct System Prompt
      let historyContext = "";
      recentHistory.forEach(item => {
        historyContext += `Q: ${item.content}\n`;
        // Since we don't store role in content, we'd normally distinguish, 
        // but for this specific pattern we'll just show the user messages 
        // or refine if storage had roles (it does in DB)
      });

      const systemPrompt = `You are Globalrate AI, a source-backed assistant.
Maintain message history per sessionId.
Do NOT mix messages between different sessions.

CONVERSATION CONTEXT:
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).slice(-5).join('\n')}

WIKIPEDIA INFO:
${wiki.text}

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Your detailed answer based on context and Wikipedia",
  "sources": ["${wiki.url || "Live confirmed data is not available right now"}"]
}
`;

      // 4. Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
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
          sources: wiki.url ? [wiki.url] : ["Live confirmed data is not available right now"]
        };
      }

      // 5. Save Messages
      await storage.createMessage({
        sessionId,
        role: "user",
        content: message,
        sources: null
      });

      await storage.createMessage({
        sessionId,
        role: "assistant",
        content: parsedResponse.answer,
        sources: parsedResponse.sources
      });

      // 6. Return Response
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
