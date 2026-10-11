// The only file the UI uses to reach the game engine and content.
// Screens import from here, never from src/engine or src/content directly, so swapping the
// engine (or a mock) is a one-file change.
//
// The real engine (src/engine) has landed, so this adapter forwards to it. The engine reads
// src/content/index.js; until that exists, Vite gives it the engine's fixture content.

import {
  ASSUMPTIONS,
  checkBudget,
  createLife,
  engine,
  quoteLoan,
  replay,
  select,
  step,
} from "../engine/index.js";

export { ASSUMPTIONS, checkBudget, createLife, quoteLoan, replay, select, step };

// The content object (lessons, glossary, goals, wants, documents, quiz, faq, minigames, storylines).
export const content = engine.content ?? {};

export const storylines = () =>
  Object.values(content.storylines ?? {}).map((s) => ({
    id: s.id,
    playable: Boolean(s.playable),
    title: s.title,
    tagline: s.tagline,
    persona: s.persona,
  }));

export const storyline = (id) => content.storylines?.[id] ?? null;
export const goals = () => content.goals ?? [];
export const goalCost = (goalId) => ASSUMPTIONS.goals?.[goalId] ?? 0;
export const glossary = () => content.glossary ?? {};
export const lessonInfo = (id) => (content.lessons ?? []).find((l) => l.id === id) ?? null;

// ---------- Ask Ammamma ----------

const words = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

// Closest offline answer from faq.json: word overlap, nudged toward the current lesson.
export function offlineAnswer(question, { lesson = null } = {}) {
  const q = new Set(words(question));
  let best = null;
  let bestScore = 0;
  for (const f of content.faq ?? []) {
    const text = Object.values(f.q ?? {}).join(" ") + " " + Object.values(f.a ?? {}).join(" ");
    let score = 0;
    for (const w of words(text)) if (q.has(w)) score += 1;
    if (lesson && f.lesson === lesson) score += 1.5;
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

export function suggestedQuestions(lesson, limit = 3) {
  const faq = content.faq ?? [];
  const forLesson = faq.filter((f) => f.lesson === lesson);
  return (forLesson.length ? forLesson : faq).slice(0, limit);
}

// Sends only game state (never the player's name) to /api/ask. Falls back to the offline FAQ
// if the endpoint is missing, fails, or takes longer than 8 seconds.
export async function askMentor({ question, language, state }) {
  const hud = state ? select.hud(state) : null;
  const card = state ? select.currentCard(state) : null;
  const summary = hud
    ? {
        age: hud.age,
        stage: hud.stage,
        cash: hud.cash,
        savings: hud.savings,
        investments: hud.investments,
        debt: hud.debt,
        dream: { goalId: hud.dream.goalId, pct: hud.dream.pct },
        lesson: card?.lesson ?? null,
      }
    : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language, summary }),
      signal: controller.signal,
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("json")) throw new Error(`ask ${res.status}`);
    const data = await res.json();
    if (!data?.answer) throw new Error("empty answer");
    return { source: "ai", answer: data.answer };
  } catch {
    const faq = offlineAnswer(question, { lesson: summary?.lesson });
    return { source: "offline", answer: faq?.a ?? null, faq };
  } finally {
    clearTimeout(timer);
  }
}
