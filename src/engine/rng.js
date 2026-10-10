// A small seeded RNG (mulberry32). The whole generator state is one uint32, so it can live in
// the game state: the same seed and the same choices always give the same life.

// Hash any mix of strings and numbers into a uint32 (FNV-1a over the joined text, then mixed).
export function hashSeed(...parts) {
  const text = parts.map(String).join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// One step: returns [value in [0, 1), next state].
export function nextRandom(state) {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

// A stateful view for code that owns a cloned state: `holder.rng` is read and advanced.
export function makeRandom(holder, key = "rng") {
  const random = () => {
    const [value, next] = nextRandom(holder[key]);
    holder[key] = next;
    return value;
  };
  random.int = (min, max) => min + Math.floor(random() * (max - min + 1));
  random.range = (min, max) => min + random() * (max - min);
  random.pick = (list) => list[Math.floor(random() * list.length)];
  // Items with `weight` (default 1); weights <= 0 are never picked unless all are.
  random.weighted = (list, weightOf = (x) => x.weight ?? 1) => {
    const weights = list.map((x) => Math.max(0, Number(weightOf(x)) || 0));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return random.pick(list);
    let roll = random() * total;
    for (let i = 0; i < list.length; i++) {
      roll -= weights[i];
      if (roll < 0) return list[i];
    }
    return list[list.length - 1];
  };
  random.normal = (mean, sd) => {
    const u = Math.max(random(), 1e-12);
    const v = random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  random.shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return random;
}

// A throwaway generator for a named stream, e.g. the world's market returns.
export function streamRandom(...parts) {
  return makeRandom({ rng: hashSeed(...parts) });
}
