// Progress lives in localStorage only (spec section 8). Every access is guarded: private windows
// and blocked storage simply mean nothing is remembered.

const KEYS = { settings: "lakshyam.settings", life: "lakshyam.life", endings: "lakshyam.endings" };

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
