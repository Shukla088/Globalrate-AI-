
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

      // 1. Get Wikipedia Data (Real-time data gathering)
      const wikipediaExtract = await getWikipediaData(message);

      // 2. Fail-safe for missing data
      if (!wikipediaExtract) {
        const response = {
          answer: "Live confirmed data is not available right now.",
          sources: ["wikipedia.org"]
        };
        
        await storage.createMessage({
          sessionId,
          role: "user",
          content: message,
          sources: null
        });

        await storage.createMessage({
          sessionId,
          role: "assistant",
          content: response.answer,
          sources: response.sources
        });

        return res.json({
          ...response,
          session_id: sessionId
        });
      }

      // 3. Construct System Prompt (Strict Wikipedia enforcement)
      const systemPrompt = `You are Globalrate AI, a real-time search and answer assistant.

CORE BEHAVIOR:
- Answer ONLY using the provided Wikipedia extract.
- Be concise, factual, and neutral.
- Do not hallucinate, guess, or add outside knowledge.
- Do not repeat the question.

WIKIPEDIA EXTRACT:
${wikipediaExtract}

OUTPUT FORMAT (Respond ONLY in valid JSON):
{
  "answer": "Concise factual answer based strictly on Wikipedia extract",
  "sources": ["wikipedia.org"]
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
          sources: ["wikipedia.org"]
        };
      }

      // 5. Final check on sources as per rules
      parsedResponse.sources = ["wikipedia.org"];

      // 6. Save Messages
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

      // 7. Return Response
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
