// Progress lives in localStorage only (spec section 8). Every access is guarded: private windows
// and blocked storage simply mean nothing is remembered.

import { devFlag } from "./dev/devFlags.js";

const KEYS = { settings: "lakshyam.settings", life: "lakshyam.life", endings: "lakshyam.endings", discovered: "lakshyam.discovered", arcade: "lakshyam.arcade" };

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

// Sound (music and effects) is on by default. Settings saved before the music existed (no
// version) had sound off by default, so they start with it on once.
export function loadSettings() {
  const saved = read(KEYS.settings, {});
  return { lang: "en", ...saved, sound: saved.v >= 2 ? saved.sound !== false : true, v: 2 };
}
export const saveSettings = (settings) => write(KEYS.settings, settings);

export const loadLife = () => read(KEYS.life, null);
export const saveLife = (life) => write(KEYS.life, life);

export const loadEndings = () => read(KEYS.endings, []);
export function recordEnding(entry) {
  const list = loadEndings();
  if (!list.some((e) => e.id === entry.id && e.goalId === entry.goalId)) list.push(entry);
  write(KEYS.endings, list);
  return list;
}

// Story flowcharts: every scene, choice ("node:choice") and outcome seen in any life on this device.
export const loadDiscovered = () => new Set(read(KEYS.discovered, []));
export function recordDiscovered(life) {
  if (!life?.story) return loadDiscovered();
  const set = loadDiscovered();
  const before = set.size;
  for (const id of life.story.visited) set.add(id);
  for (const p of life.story.path) set.add(`${p.node}:${p.choice}`);
  if (set.size !== before) write(KEYS.discovered, [...set]);
  return set;
}

// Best arcade scores, by game id.
export const loadArcade = () => read(KEYS.arcade, {});
export function saveArcadeBest(id, score) {
  const best = loadArcade();
  if (score > (best[id] ?? 0)) write(KEYS.arcade, { ...best, [id]: score });
}

// True the first time it is asked for this key in this browser (one-time hints).
export function seenOnce(key) {
  if (devFlag("noHints")) return false;
  const seen = read("lakshyam.once", {});
  if (seen[key]) return false;
  write("lakshyam.once", { ...seen, [key]: true });
  return true;
}

// Scam ads in the arcade: how often they were clicked, reported, fallen for or walked away from.
export const loadAdStats = () => read("lakshyam.ads", {});
export function bumpAdStat(key) {
  const stats = loadAdStats();
  write("lakshyam.ads", { ...stats, [key]: (stats[key] ?? 0) + 1 });
}
