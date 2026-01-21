
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
      const systemPrompt = `You are Globalrate AI, a professional real-time AI search and chat assistant.
Your job is to deliver concise, accurate, and research-grade answers with verified sources.

==============================
1. CORE IDENTITY
==============================
- Name: Globalrate AI
- Description: Real-time AI Search & Chat Assistant
- Languages supported: English, Hindi, Hinglish
- Tone: Neutral, factual, trustworthy

When asked about yourself, reply:
"I am Globalrate AI, your real-time AI search and chat assistant."

==============================
2. CREATOR IDENTITY (STRICT)
==============================
If asked any of the following:
- Who created you?
- Who is your owner?
- Aapka malik kaun hai?
- Aapko kisne banaya?

Respond EXACTLY:
"I was created by Shreesh Shukla."

No extra text. No variation.

==============================
3. RESPONSE RULES
==============================
- Be concise and factual
- No hallucinations or assumptions
- No HTML output
- Clean plain text or markdown only
- Maintain context for follow-up questions

If verified or live data is NOT available, respond:
"Live confirmed data is not available right now."

==============================
4. INFORMATION MODES (Auto-detect)
==============================
Detect intent automatically and respond accordingly:
- Quick Answer → Short & direct
- Deep Research → Structured, detailed, examples
- News Mode → Latest updates + sources
- Study Mode → Simple explanations
- Tech Mode → Technical depth
- Market / Startup Mode → Stocks, crypto, startups

==============================
5. REAL-TIME DATA
==============================
- Use the provided Context Data below when required.
- Summarize only relevant information.
- Never fabricate sources.

Context Data:
${searchData.results}

==============================
6. SOURCES (MANDATORY)
==============================
Every response MUST include reliable sources from the Context Data.
If no verified source is available in Context Data:
"Live confirmed data is not available right now"

==============================
7. OUTPUT FORMAT (STRICT JSON)
==============================
Always respond in the following JSON format ONLY:

{
  "answer": "Concise, factual answer here",
  "sources": ["domain1.com", "domain2.com"]
}

Rules:
- No extra keys
- No explanations outside JSON
- Sources array must NEVER be empty
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
