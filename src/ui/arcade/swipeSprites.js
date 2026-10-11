// Pixel art for Swipe Bazaar's items: one 16×16 drawing per item, a letter per pixel ("." is
// empty). Each sprite has its own palette; "k" is always the dark outline. spriteFor() turns a
// drawing into a small canvas (cached) that the game scales up with smoothing off, and
// spriteUrl() gives the same picture as an image for the HUD and the summaries.

const K = "#2b2238";

export const SPRITES = {
  // A bowl of rice, steaming.
  food: {
    pal: { s: "#c9d6e0", w: "#fffaf0", W: "#e9e1cf", b: "#e8573f", B: "#c8423b", d: "#8f2a25", y: "#ffd24a" },
    px: [
      "................",
      ".....s....s.....",
      "......s....s....",
      ".....s....s.....",
      ".....kkkkkk.....",
      "...kkwwwwwwkk...",
      "..kwwwwwwwWwwk..",
      "kbbbbbbbbbbbbbbk",
      "kBBBBBBBBBBBBBBk",
      "kByyBByyBByyBBBk",
      ".kBBBBBBBBBBBBk.",
      ".kddddddddddddk.",
      "..kBBBBBBBBBBk..",
      "...kkBBBBBBkk...",
      ".....kkkkkk.....",
      "................",
    ],
  },
  // Three school books.
  fees: {
    pal: { r: "#d9473f", R: "#a8322c", b: "#3f7fd1", B: "#2c5ea3", g: "#4f9a43", G: "#367030", p: "#fffaf0", y: "#ffd24a" },
    px: [
      "................",
      "................",
      "...kkkkkkkkkk...",
      "..krrrrrrrrrrk..",
      "..krryyyyrrrrk..",
      "..kRRRRRRRRRppk.",
      "..kkkkkkkkkkkkk.",
      ".kbbbbbbbbbbbbk.",
      ".kbbbbyyyybbbbk.",
      ".kBBBBBBBBBBBppk",
      ".kkkkkkkkkkkkkkk",
      "kgggggggggggggk.",
      "kggggyyyygggggk.",
      "kGGGGGGGGGGGGppk",
      "kkkkkkkkkkkkkkkk",
      "................",
    ],
  },
  // The town bus.
  bus: {
    pal: { y: "#ffc93c", Y: "#e0a21c", w: "#bfe6f5", o: "#e8573f", d: "#3a3a46", g: "#9aa0a8", l: "#fff6b0" },
    px: [
      "................",
      "................",
      "................",
      ".kkkkkkkkkkkkkk.",
      "kyyyyyyyyyyyyyyk",
      "kywwkwwkwwkwwwyk",
      "kywwkwwkwwkwwwyk",
      "kyyyyyyyyyyyyyyk",
      "kooooooooooooook",
      "kyyyyyyyyyyyyyyl",
      "kYYYYYYYYYYYYYYk",
      "kkkkkkkkkkkkkkkk",
      "..kddk....kddk..",
      "..kdgk....kdgk..",
      "...kk......kk...",
      "................",
    ],
  },
  // Phone signal bars: a recharge.
  recharge: {
    pal: { g: "#18a6b8", G: "#0b7584" },
    px: [
      "................",
      "............kkkk",
      "............kggk",
      "............kgGk",
      "........kkkkkgGk",
      "........kggkkgGk",
      "........kgGkkgGk",
      "....kkkkkgGkkgGk",
      "....kggkkgGkkgGk",
      "....kgGkkgGkkgGk",
      "kkkkkgGkkgGkkgGk",
      "kggkkgGkkgGkkgGk",
      "kgGkkgGkkgGkkgGk",
      "kgGkkgGkkgGkkgGk",
      "kkkkkkkkkkkkkkkk",
      "................",
    ],
  },
  // Red sneakers with a white stripe.
  sneakers: {
    pal: { r: "#e2483d", R: "#b23128", w: "#ffffff", g: "#c9c4bd" },
    px: [
      "................",
      "................",
      "................",
      "................",
      "...kkkkk........",
      "..krrrrrk.......",
      "..krwwrrrk......",
      "..krrwwrrrkk....",
      "..krrrwwrrrrkk..",
      ".krrrrrwwrrrrrk.",
      ".kRRRRRRRRRRRRRk",
      ".kwwwwwwwwwwwwwk",
      ".kgggggggggggggk",
      "..kkkkkkkkkkkkk.",
      "................",
      "................",
    ],
  },
  // A slice of pizza: an outing with friends.
  outing: {
    pal: { c: "#d68a3a", C: "#a8642a", y: "#ffd25e", r: "#d9473f", g: "#5aa84a" },
    px: [
      "................",
      "..kkkkkkkkkkkk..",
      ".kccccccccccccck",
      ".kCCCCCCCCCCCCk.",
      "..kyyryyyygyyk..",
      "..kyrrryyyyyyk..",
      "...kyryyyrryk...",
      "...kyyyyyrryk...",
      "....kygyyyyk....",
      "....kyyyryyk....",
      ".....kyrrrk.....",
      ".....kyyyyk.....",
      "......kyyk......",
      "......kyyk......",
      ".......kk.......",
      "................",
    ],
  },
  // Headphones.
  earphones: {
    pal: { b: "#4a4a5c", p: "#8a5cd6", P: "#6a3fb5", l: "#c3a8f0" },
    px: [
      "................",
      "....kkkkkkkk....",
      "...kbbbbbbbbk...",
      "..kbkkkkkkkkbk..",
      ".kbk........kbk.",
      ".kbk........kbk.",
      ".kbk........kbk.",
      "kkbkk......kkbkk",
      "kpplk......kpplk",
      "kpplk......kpplk",
      "kPPpk......kPPpk",
      "kPPpk......kPPpk",
      "kkkkk......kkkkk",
      "................",
      "................",
      "................",
    ],
  },
  // A clapperboard: movie night.
  movie: {
    pal: { d: "#3a3a46", w: "#ffffff", g: "#c9c4bd", y: "#ffd24a" },
    px: [
      "................",
      "................",
      ".kkkkkkkkkkkkkk.",
      ".kwwddwwddwwddk.",
      ".kkkkkkkkkkkkkk.",
      ".kddddddddddddk.",
      ".kkkkkkkkkkkkkk.",
      ".kddddddddddddk.",
      ".kdwwwwwwwwwwdk.",
      ".kddddddddddddk.",
      ".kdwwwwwwdyydk..",
      ".kddddddddyydk..",
      ".kddddddddddddk.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................",
    ],
  },
  // A shiny new smartphone.
  phone: {
    pal: { d: "#3a3a46", s: "#4fb7e8", S: "#2b86c2", w: "#e8f7ff", y: "#ffd24a" },
    px: [
      "....kkkkkkkk....",
      "...kddddddddk...",
      "...kddkkkkddk...",
      "...kssssssssk...",
      "...kswwssssSk...",
      "...kswsssssSk...",
      "...ksssssssSk...",
      "...kssssssSSk...",
      "...kssssSSSSk...",
      "...ksssSSSSSk...",
      "...kssSSSSSSk...",
      "...kSSSSSSSSk...",
      "...kddddddddk...",
      "...kdddyydddk...",
      "....kkkkkkkk....",
      "................",
    ],
  },
  // A scooter.
  bike: {
    pal: { r: "#e2483d", R: "#b23128", d: "#3a3a46", g: "#9aa0a8", s: "#5a4636", l: "#fff6b0" },
    px: [
      "................",
      "................",
      ".........kkk....",
      "..........kk....",
      "..kkkkk...kd....",
      "..kssssk..kdk...",
      "...kkkkk..krkl..",
      "....krrrrrrrRk..",
      "...krrrrrrrrRk..",
      "..krrrrrrrrRRRk.",
      "..kkkkkkkkkkkkk.",
      ".kddk......kddk.",
      "kdggdk....kdggdk",
      "kdggdk....kdggdk",
      ".kddk......kddk.",
      "................",
    ],
  },
  // A branded T-shirt.
  clothes: {
    pal: { b: "#3f7fd1", B: "#2c5ea3", w: "#ffffff", y: "#ffd24a" },
    px: [
      "................",
      "................",
      "....kkk..kkk....",
      "..kkbbbkkbbbkk..",
      ".kbbbbbbbbbbbbk.",
      "kbbbbbbbbbbbbbbk",
      "kBbbbbbbbbbbbbBk",
      ".kkkbbbyybbbkkk.",
      "...kbbyyyybbk...",
      "...kbbbyybbbk...",
      "...kbbbbbbbbk...",
      "...kbbbbbbbbk...",
      "...kBBBBBBBBk...",
      "...kkkkkkkkkk...",
      "................",
      "................",
    ],
  },
  // A loan app: a banknote with wings, flying off.
  loan: {
    pal: { g: "#6fbf5a", G: "#3f8a35", w: "#ffffff", W: "#d6dde3", r: "#d9473f" },
    px: [
      "................",
      "kk............kk",
      "kwkk........kkwk",
      "kwwwk......kwwwk",
      ".kwWwkkkkkkwWwk.",
      "..kkkggggggkkk..",
      "...kgGggggGgk...",
      "...kggrrrrggk...",
      "...kggrggggggk..",
      "...kggrrrrggk...",
      "...kggggggrgk...",
      "...kggrrrrggk...",
      "...kgGggggGgk...",
      "...kkkkkkkkkk...",
      "................",
      "................",
    ],
  },
  // A gold coin with a rupee sign.
  coin: {
    pal: { y: "#ffd24a", Y: "#e0a21c", l: "#fff3a8", o: "#8a5a08" },
    px: [
      "................",
      ".....kkkkkk.....",
      "...kkyyyyyykk...",
      "..kyllyyyyyyYk..",
      "..kylyyyyyyyYk..",
      ".kyyyooooooyYYk.",
      ".kyyyyyyyoyyYYk.",
      ".kyyyooooooyYYk.",
      ".kyyyyyyoyyyYYk.",
      ".kyyyyooyyyyYYk.",
      ".kyyyyyooyyyYYk.",
      "..kyyyyyooyYYk..",
      "..kYyyyyyoYYYk..",
      "...kkYYYYYYkk...",
      ".....kkkkkk.....",
      "................",
    ],
  },
};

const SIZE = 16;
const cache = {};

// The sprite for an item: coins and loan apps by kind, everything else by its id.
export const spriteId = (kind, def) => (kind === "coin" || kind === "loan" ? kind : def?.id);

// A 16×16 canvas of the sprite (draw it with imageSmoothingEnabled = false), or null.
export function spriteFor(id) {
  if (cache[id] !== undefined) return cache[id];
  const sp = SPRITES[id];
  if (!sp || typeof document === "undefined") return (cache[id] = null);
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d");
  sp.px.forEach((row, y) => {
    for (let x = 0; x < SIZE; x++) {
      const ch = row[x];
      if (!ch || ch === ".") continue;
      ctx.fillStyle = ch === "k" ? K : sp.pal[ch] ?? K;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return (cache[id] = c);
}

const urls = {};
export function spriteUrl(id) {
  if (urls[id] === undefined) urls[id] = spriteFor(id)?.toDataURL() ?? null;
  return urls[id];
}
