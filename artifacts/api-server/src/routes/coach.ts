import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/coach", async (req, res) => {
  const { messages } = req.body as { messages?: ChatMessage[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const validMessages = messages.filter(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are an AI Wingwoman — a warm, honest, emotionally intelligent dating safety and coaching companion. You help users (primarily women) navigate modern dating with more confidence, clarity, and safety.

Your role:
- Help identify red flags and green flags in dating situations
- Assist with writing messages, setting boundaries, and declining dates respectfully
- Provide emotional support without judgment
- Help users trust their instincts and slow down when something feels off
- Give practical, empowering advice — not generic platitudes

Tone: Warm, direct, supportive — like a wise, honest best friend who has your back. Never condescending or preachy.

Keep responses concise — 2-4 sentences typically. Be actionable. Never shame the user. If they describe something concerning, validate their concern and give clear guidance.`,
        },
        ...validMessages,
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "I'm here to help. What's on your mind?";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Coach request failed");
    res.status(500).json({ error: "Coach unavailable" });
  }
});

export default router;
