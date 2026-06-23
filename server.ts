import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Initialize the Express application
const app = express();
const PORT = 3000;

// Body parser middleware
app.use(express.json());

// Helper function to lazily initialize the Gemini API client safely
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not set or has placeholder value.");
  }
  return new GoogleGenAI({ apiKey });
}

// 1. API: Generate educational flashcards
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { topic, content, count = 8 } = req.body;

    if (!topic) {
      res.status(400).json({ error: "Topic is required" });
      return;
    }

    const ai = getAIClient();

    let prompt = `Create a list of exactly ${count} professional educational flashcards for studying the topic: "${topic}". \n`;
    if (content) {
      prompt += `Base the questions and answers strictly or primarily on this reference material: \n"""\n${content}\n"""\n\n`;
    }
    prompt += `Each flashcard must have a concise, clear 'question' (for the front of the card) and a detailed, clear, comprehensive but digestible 'answer' (for the back of the card). High-quality explanations only.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            cards: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  answer: { type: "STRING" }
                },
                required: ["question", "answer"]
              }
            }
          },
          required: ["cards"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI Model");
    }

    const parsed = JSON.parse(text);
    res.json(parsed);

  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    res.status(500).json({
      error: "Failed to generate flashcards",
      details: error.message || error
    });
  }
});

// 2. API: Generate personalized study schedules
app.post("/api/generate-schedule", async (req, res) => {
  try {
    const { title, subject, objective, totalDays = 7 } = req.body;

    if (!subject || !objective) {
      res.status(400).json({ error: "Subject and Objective are required" });
      return;
    }

    const ai = getAIClient();

    const prompt = `Create a highly structured day-by-day study schedule for learning: "${subject}". 
Goal/Objective: "${objective}"
Timeline: Prepare this for exactly ${totalDays} days.
Provide a clear, detailed list of daily tasks to cover the entire curriculum over ${totalDays} days.
Each day's schedule item must provide:
- dayNumber: integer (1 to ${totalDays})
- topic: short action-oriented subtitle (e.g. "Basic Selectors & Flexbox")
- description: clear explanation of what to learn, practice, and solidify.
- durationMinutes: average study time (integer from 30 to 180 minutes)
- suggestedResources: 2 to 3 very practical, actionable recommendations or study activities for this day (e.g. 'Recreate a standard Google search header using CSS flexbox', 'Read Mozilla Developer Network docs on flexbox-wrap').`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            objective: { type: "STRING" },
            totalDays: { type: "INTEGER" },
            dailySchedules: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  dayNumber: { type: "INTEGER" },
                  topic: { type: "STRING" },
                  description: { type: "STRING" },
                  durationMinutes: { type: "INTEGER" },
                  suggestedResources: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["dayNumber", "topic", "description", "durationMinutes"]
              }
            }
          },
          required: ["title", "objective", "totalDays", "dailySchedules"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI Model");
    }

    const parsed = JSON.parse(text);
    res.json(parsed);

  } catch (error: any) {
    console.error("Error generating study schedule:", error);
    res.status(500).json({
      error: "Failed to generate study schedule",
      details: error.message || error
    });
  }
});

// Configure Vite middleware and static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start the server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Failed to boot Vite server middleware:", err);
});
