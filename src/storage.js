// localStorage save. Every read/write is guarded: private windows and blocked
// storage must never break the game.
const LIFE = "lakshyam.life.v1";
const META = "lakshyam.meta.v1";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep playing in memory */
  }
}

export const DEFAULT_META = { lang: "en", region: "telangana", endings: [], letters: [] };
export const loadLife = () => {
  const life = read(LIFE, null);
  return life && life.v === 1 ? life : null;
};
export const saveLife = (life) => write(LIFE, life);
export const loadMeta = () => ({ ...DEFAULT_META, ...read(META, {}) });
export const saveMeta = (meta) => write(META, meta);
