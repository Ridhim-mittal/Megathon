#!/usr/bin/env node
// Fails (exit 1) if any card breaks the event-card rules:
//  - 2–3 options; every option previews money + at least one of health/family/peace/gyaan
//  - no dominant option (best or tied-best on every meter, strictly better somewhere)
//  - every text has en/hi/te; consequence/seed ids exist
import { readFileSync } from "node:fs";
import { dominantOption } from "./card-rules.js";

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8"));
const cards = load("cards.json");
const crossroads = load("crossroads.json");
const messages = load("messages.json");
const finance = load("finance.json");
const LANGS = ["en", "hi", "te"];
const SOFT = ["health", "family", "peace", "gyaan"];
const errors = [];
const ids = new Set(cards.map((c) => c.id));

function checkText(where, obj) {
  if (!obj || typeof obj !== "object") return errors.push(`${where}: missing text`);
  for (const l of LANGS) if (!obj[l] || !String(obj[l]).trim()) errors.push(`${where}: missing "${l}"`);
}

function checkCard(c, kind) {
  checkText(`${c.id}.title`, c.title);
  checkText(`${c.id}.text`, c.text);
  const n = c.options?.length || 0;
  if (n < 2 || n > 3) errors.push(`${c.id}: has ${n} options (needs 2–3)`);
  for (const o of c.options || []) {
    const where = `${c.id}.${o.id}`;
    checkText(`${where}.label`, o.label);
    if (kind === "crossroads") checkText(`${where}.desc`, o.desc);
    if (!o.effects || !("money" in o.effects)) errors.push(`${where}: must preview money`);
    if (!SOFT.some((k) => o.effects?.[k])) errors.push(`${where}: must preview health/family/peace/gyaan`);
    if (!["careful", "bold", "generous"].includes(o.style)) errors.push(`${where}: bad style`);
    if (o.loan && !finance.loans[o.loan.source]) errors.push(`${where}: unknown loan source`);
    const seeds = o.hidden ? (o.hidden.outcomes ? o.hidden.outcomes.map((x) => x.seed) : [o.hidden.seed]) : [];
    for (const sd of seeds) if (!ids.has(sd)) errors.push(`${where}: unknown consequence ${sd}`);
  }
  if (n >= 2) {
    const d = dominantOption(c.options);
    if (d) errors.push(`${c.id}: option "${d.id}" is best on every meter (dominant)`);
  }
}

cards.forEach((c) => checkCard(c, "card"));
crossroads.forEach((c) => checkCard(c, "crossroads"));
for (const m of messages) {
  for (const f of ["sender", "text", "hint", "fact"]) checkText(`${m.id}.${f}`, m[f]);
  if (m.scam && !ids.has(m.reply.seed)) errors.push(`${m.id}: unknown consequence ${m.reply.seed}`);
  if (!m.scam && !m.flag) errors.push(`${m.id}: legit message needs flag effects`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} card problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`✓ ${cards.length} cards, ${crossroads.length} crossroads, ${messages.length} messages valid — no dominant options.`);
