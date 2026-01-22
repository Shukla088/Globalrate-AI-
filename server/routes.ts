
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

async function getDuckDuckGoData(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(searchUrl);
    const data = await response.json() as any;
    
    if (data.AbstractText) {
      return data.AbstractText;
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      // Find the first topic with a text property (some might be nested categories)
      const firstTopic = data.RelatedTopics.find((t: any) => t.Text);
      return firstTopic ? firstTopic.Text : null;
    }
    
    return null;
  } catch (error) {
    console.error("DuckDuckGo API error:", error);
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

      // 1. Get DuckDuckGo Data
      const ddgData = await getDuckDuckGoData(message);

      // 2. Construct System Prompt
      let systemPrompt = "";
      let defaultSource = "";

      if (ddgData) {
        defaultSource = "duckduckgo.com";
        systemPrompt = `You are Globalrate AI, a reliable AI search and chat assistant.

CORE GOAL:
You must ALWAYS return a helpful answer based on the provided data.
You are NOT allowed to return an empty answer.

DATA SOURCE:
DuckDuckGo Instant Answer: ${ddgData}

STRICT RULES:
- Answer ONLY using the provided data if possible.
- Be concise, factual, and neutral.
- Do not repeat the question.

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Clear factual answer based on DuckDuckGo data",
  "sources": ["duckduckgo.com"]
}
`;
      } else {
        defaultSource = "Live confirmed data is not available right now";
        systemPrompt = `You are Globalrate AI, a reliable AI search and chat assistant.

CORE GOAL:
You must ALWAYS return a helpful answer using your general knowledge.
You are NOT allowed to return an empty answer.

STRICT RULES:
- Start the answer with: "Based on general knowledge,"
- State that live confirmed data may not be available.
- Be concise, factual, and neutral.

OUTPUT FORMAT (Respond ONLY in JSON):
{
  "answer": "Clear helpful answer based on general knowledge",
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
          answer: responseContent || (ddgData ? "Processed answer based on search." : "Based on general knowledge, here is a reliable explanation."),
          sources: [defaultSource]
        };
      }

      // 4. Force source consistency
      if (ddgData) {
        parsedResponse.sources = ["duckduckgo.com"];
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
