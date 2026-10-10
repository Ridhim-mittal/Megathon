// Vercel serverless function: POST /api/mentor { question, lang, state }.
// Only a small game-state summary is sent — never names or free text from the player.
// The browser falls back to canned answers in src/data/mentor.json when this fails.
import Anthropic from "@anthropic-ai/sdk";

const LANGS = { en: "English", hi: "Hindi", te: "Telugu" };
const STATE_KEYS = ["age", "wallet", "debt", "goalPct", "health", "family", "peace", "gyaan", "debtRate", "insured", "loans", "region"];

const SYSTEM = `You are Ammamma, a warm grandmother mentor inside "Lakshyam", a financial-literacy game for Indian students aged 16-18.
Answer the student's question about their game year in 2-3 short sentences, in plain words.
Use the game state given. Never recommend real companies, apps, stocks or funds; the game's index ("Banyan 50") and companies are fictional.
Never promise returns. Mention 1930 / cybercrime.gov.in only for fraud questions. No markdown.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "mentor offline" });
  const { question, lang = "en", state = {} } = req.body || {};
  if (typeof question !== "string" || question.length > 200) return res.status(400).json({ error: "bad question" });
  const summary = Object.fromEntries(STATE_KEYS.filter((k) => k in state).map((k) => [k, state[k]]));

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Reply in ${LANGS[lang] || "English"}.\nGame state: ${JSON.stringify(summary)}\nQuestion: ${question}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return res.status(502).json({ error: "declined" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!text) return res.status(502).json({ error: "empty" });
    return res.status(200).json({ answer: text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "busy" });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: `api ${error.status}` });
    return res.status(500).json({ error: "mentor failed" });
  }
}
