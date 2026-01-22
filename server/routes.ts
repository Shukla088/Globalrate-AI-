
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

async function getWikipediaData(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(query)}&origin=*`;
    const response = await fetch(searchUrl);
    const data = await response.json() as any;
    
    const pages = data.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") return null;
    
    const extract = pages[pageId].extract;
    return extract || null;
  } catch (error) {
    console.error("Wikipedia API error:", error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { message, sessionId: incomingSessionId } = api.chat.send.input.parse(req.body);
      
      const sessionId = incomingSessionId || randomUUID();

      // 1. Get Wikipedia Data
      const wikipediaExtract = await getWikipediaData(message);

      // 2. Construct System Prompt
      let systemPrompt = "";
      let defaultSource = "";

      if (wikipediaExtract) {
        defaultSource = "wikipedia.org";
        systemPrompt = `You are Globalrate AI, a reliable AI search and chat assistant.

CORE GOAL:
You must ALWAYS return a helpful answer based strictly on the provided Wikipedia extract.
You are NOT allowed to return an empty answer.

DATA PRIORITY:
Use the provided Wikipedia extract to generate a concise, factual answer.

WIKIPEDIA EXTRACT:
${wikipediaExtract}

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Clear, helpful answer based on Wikipedia",
  "sources": ["wikipedia.org"]
}
`;
      } else {
        defaultSource = "Live confirmed data is not available right now";
        systemPrompt = `You are Globalrate AI, a reliable AI search and chat assistant.

CORE GOAL:
You must ALWAYS return a helpful answer using your general knowledge in a neutral, factual way.
You are NOT allowed to return an empty answer.

STRICT RULES:
- Never stay silent.
- Never return an empty string.
- Never say "I cannot answer" or similar.
- State that the information may not be live-confirmed.
- Start your answer with "Based on general knowledge, here is a reliable explanation."

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Clear, helpful answer based on general knowledge",
  "sources": ["Live confirmed data is not available right now"]
}
`;
      }

      // 3. Call OpenAI
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
          answer: responseContent || "Based on general knowledge, here is a reliable explanation.",
          sources: [defaultSource]
        };
      }

      // 4. Force source consistency
      if (wikipediaExtract) {
        parsedResponse.sources = ["wikipedia.org"];
      } else {
        parsedResponse.sources = ["Live confirmed data is not available right now"];
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
