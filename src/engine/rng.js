// Seeded randomness. Luck is a hash of (seed, age, tag), so it never depends
// on earlier choices: a parallel life with the same seed meets the same luck.
export function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (seed, ...keys) => mulberry32(hash32([seed, ...keys].join("|")));
export const luck = (seed, ...keys) => rngFor(seed, ...keys)();

// Roughly normal value (sum of uniforms), clamped to [min, max].
export function luckNormal(seed, mean, sd, min, max, ...keys) {
  const r = rngFor(seed, ...keys);
  const z = r() + r() + r() + r() + r() + r() - 3; // variance 0.5
  return Math.min(max, Math.max(min, mean + z * sd * Math.SQRT2));
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
