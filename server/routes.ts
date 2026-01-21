
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Helper function to perform web search (mocked or using env vars if available)
async function performSearch(query: string): Promise<{ results: string; sources: string[] }> {
  // In a real production app, you would integrate with Tavily, Google, or Bing API here.
  // Since we don't have a guaranteed key, we will follow the fallback protocol.
  
  // Example of how one might implement it if a key existed:
  // if (process.env.TAVILY_API_KEY) { ... }

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
      const { message } = api.chat.send.input.parse(req.body);

      // 1. Save User Message
      await storage.createMessage({
        role: "user",
        content: message,
        sources: null
      });

      // 2. Perform Search (Real-time data gathering)
      const searchData = await performSearch(message);

      // 3. Construct System Prompt
      const systemPrompt = `You are Globalrate AI, a research-grade AI assistant. Process user queries either typed or converted from voice. Always respond concisely, factually, and in JSON format:

{
  "answer": "<short, accurate answer>",
  "sources": ["domain1.com", "domain2.com"]
}

Rules:
1. Always include sources; if unavailable, return ["Live confirmed data is not available right now"].
2. No HTML, only plain text or markdown.
3. Automatically detect intent: Quick Answer / Deep Research / News / Study / Tech / Market.
4. Voice queries are already converted to text; treat them exactly like typed queries.
5. Only respond in JSON format; do not include explanations outside JSON.
6. If the query is unclear, ask a clarifying question in the "answer" field in JSON.

User Query (typed or converted from voice): "${message}"

Context Data:
${searchData.results}
`;

      // 4. Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1", // Using the latest model
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
        // Fallback if JSON parsing fails (should be rare with json_object mode)
        parsedResponse = {
          answer: responseContent || "Error generating response.",
          sources: ["Internal Error"]
        };
      }

      // Ensure sources is not empty as per rules
      if (!parsedResponse.sources || parsedResponse.sources.length === 0) {
        parsedResponse.sources = ["Live confirmed data is not available right now"];
      }

      // 5. Save Assistant Message
      await storage.createMessage({
        role: "assistant",
        content: parsedResponse.answer,
        sources: parsedResponse.sources
      });

      // 6. Return Response
      res.json(parsedResponse);

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  app.get(api.chat.history.path, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  return httpServer;
}
