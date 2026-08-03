import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/analyze", async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are LoopIn, an expert dating safety analyst. Analyze the provided text (which may be dating app messages, a profile description, or a date scenario) and return a structured JSON safety analysis.

Return ONLY valid JSON with this exact structure:
{
  "riskLevel": "low" | "medium" | "high",
  "summary": "A 1-2 sentence overall assessment",
  "greenFlags": ["list of positive behaviors or signals"],
  "yellowFlags": ["list of things worth noting or monitoring"],
  "redFlags": ["list of concerning behaviors or warning signs"],
  "recommendations": ["actionable safety recommendations"]
}

Guidelines:
- Be honest but not alarmist. Not every yellow flag is a red flag.
- greenFlags: genuine positive signs like respectful communication, transparency, patience
- yellowFlags: things to watch but not immediately concerning (moving fast, vague about details)
- redFlags: clear warning signs like love bombing, isolation attempts, pressure, inconsistencies, financial requests, requests for private address on first meeting
- recommendations: practical, empowering advice (not just "don't go")
- If the input is very positive with no concerns, say so clearly
- Keep all lists concise — 2-5 items each, only what's relevant
- If a list has no items, return an empty array []`,
        },
        {
          role: "user",
          content: text.trim(),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
