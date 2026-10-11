// SIP Garden's pixel art. Everything is built pixel by pixel from simple shapes, gets a dark
// outline, and is cached as a tiny canvas; the game draws it 3× bigger with smoothing off. The yard
// is painted once at 320×180 and scaled to the 960×540 field.
import { DEF_X, FIELD, GRID, LANES, laneY } from "./sipGarden.js";

export const PX = 3; // field units per art pixel
export const LANE_COLOR = { equity: "#3f9b3a", debt: "#d84a3a", gold: "#e0a100", fd: "#7d8aa0" };
export const feetY = (lane) => laneY(lane) + 22;

// ---------- a tiny pixel toolkit ----------
function grid(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const px = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
  };
  const rect = (x, y, rw, rh, c) => {
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) px(x + i, y + j, c);
  };
  const ell = (cx, cy, rx, ry, c) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g[y][x] = c;
  };
  return { g, px, rect, ell };
}

function toCanvas(g, outline) {
  const h = g.length;
  const w = g[0].length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let col = g[y][x];
      if (!col && outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) col = outline;
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

const cache = new Map();
function sprite(key, w, h, paint, outline = "#1a1220") {
  if (!cache.has(key)) {
    const api = grid(w, h);
    paint(api);
    cache.set(key, toCanvas(api.g, outline));
  }
  return cache.get(key);
}

// Draws a sprite with its anchor (ax, ay in art pixels) at field point (x, y).
export function put(ctx, spr, x, y, ax, ay, flip = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(spr, -ax * PX, -ay * PX, spr.width * PX, spr.height * PX);
  ctx.restore();
}

// ---------- the yard (painted once at 320×180) ----------
export function paintYard(c) {
  const W = FIELD.w / PX;
  const H = FIELD.h / PX;
  const g = c.getContext("2d");
  let seed = 11;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const fill = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Sky and grass.
  fill(0, 0, W, H, "#5fb043");
  fill(0, 0, W, 16, "#8fd3ff");
  fill(0, 12, W, 4, "#b8e6ff");
  for (let i = 0; i < 1400; i++) fill(R() * W, 16 + R() * (H - 16), 1, 1, R() < 0.5 ? "#6cc04f" : "#4f9a36");
  // Trees and bushes at the corners.
  const tree = (cx, cy, r) => {
    fill(cx - 2, cy, 5, r + 6, "#6b4423");
    for (const [dx, dy, rr, col] of [[0, 0, r, "#2f7a32"], [-r / 2, -2, r * 0.7, "#3a8f3a"], [r / 2, -3, r * 0.6, "#3a8f3a"], [-1, -r / 2, r * 0.5, "#4caa44"]]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(Math.round(cx + dx), Math.round(cy + dy), Math.round(rr), 0, Math.PI * 2);
      g.fill();
    }
  };
  tree(14, 8, 14);
  tree(46, 4, 12);
  tree(300, 6, 14);
  tree(270, 2, 10);
  // Picket fences, top and bottom.
  const fence = (y0) => {
    fill(0, y0 + 3, W, 2, "#8a5a2e");
    fill(0, y0 + 8, W, 2, "#8a5a2e");
    for (let x = 2; x < W; x += 5) {
      fill(x, y0 + 1, 3, 11, "#c98d4f");
      fill(x + 1, y0, 1, 1, "#c98d4f");
      fill(x + 2, y0 + 1, 1, 11, "#9c6a36");
    }
  };
  fence(17);
  fence(H - 12);
  // Flower bushes on the left.
  for (const [bx, by] of [[8, 38], [6, 150], [26, 160]]) {
    g.fillStyle = "#3a8f3a";
    g.beginPath();
    g.arc(bx, by, 9, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 6; i++) fill(bx - 6 + R() * 12, by - 6 + R() * 10, 2, 2, R() < 0.5 ? "#ff8a3d" : "#ffd54f");
  }
  // The lanes: brick paths (cash/FD is stone).
  const x0 = GRID.x0 / PX;
  LANES.forEach((kind, i) => {
    const cy = laneY(i) / PX;
    const top = Math.round(cy - 11);
    const fd = kind === "fd";
    fill(x0 - 1, top - 1, W - x0 + 1, 24, "#2e2014");
    for (let r = 0; r < 22; r += 4) {
      const off = (r / 4) % 2 ? 4 : 0;
      for (let x = x0 - off; x < W; x += 8) {
        const col = fd ? (R() < 0.5 ? "#cbb69a" : "#c2ad90") : R() < 0.5 ? "#b8613f" : "#a9563a";
        fill(Math.max(x0, x), top + r, Math.min(7, x + 7 - Math.max(x0, x)), 3, col);
        fill(Math.max(x0, x), top + r, Math.min(7, x + 7 - Math.max(x0, x)), 1, fd ? "#d9c6ab" : "#c8744f");
      }
      fill(x0, top + r + 3, W - x0, 1, fd ? "#9c876c" : "#7d3a26");
    }
    fill(x0, top + 22, W - x0, 1, "rgba(0,0,0,0.25)");
  });
  // The tree-diagram line from the vault to every lane button.
  const sx = 58;
  const first = laneY(0) / PX;
  const last = laneY(3) / PX;
  fill(sx, first, 2, last - first + 2, "#f2ead0");
  fill(46, (first + last) / 2, 12, 2, "#f2ead0");
  for (let i = 0; i < 4; i++) fill(sx, laneY(i) / PX, 8, 2, "#f2ead0");
}

// ---------- the vault ----------
export const piggy = () =>
  sprite("piggy", 36, 30, ({ rect, ell, px }) => {
    // Crown.
    rect(14, 1, 9, 4, "#ffd23f");
    for (const x of [14, 18, 22]) px(x, 0, "#ffd23f");
    px(16, 2, "#e53935");
    px(20, 2, "#42a5f5");
    // Ears, body, belly, snout.
    rect(23, 6, 3, 3, "#f48fb1");
    rect(10, 6, 3, 3, "#f48fb1");
    ell(17, 16, 14, 10, "#f6a6c1");
    ell(14, 19, 8, 5, "#ffc9db");
    ell(31, 16, 4, 4.5, "#f48fb1");
    px(30, 15, "#a8466c");
    px(32, 15, "#a8466c");
    // Eye, slot, cheeks, legs, tail.
    rect(25, 12, 2, 2, "#1a1220");
    px(25, 12, "#fff");
    rect(13, 7, 7, 1, "#7a2d4b");
    rect(26, 17, 2, 1, "#ff7aa0");
    for (const x of [8, 13, 20, 25]) rect(x, 25, 3, 4, "#f48fb1");
    px(2, 14, "#f48fb1");
    px(3, 13, "#f48fb1");
    px(2, 12, "#f48fb1");
  });

// ---------- defenders (face right) ----------
export function defenderSprite(kind, { lv = 1, wilt = false, broke = false } = {}) {
  const key = `def-${kind}-${Math.min(lv, 5)}-${wilt}-${broke}`;
  if (kind === "equity")
    return sprite(key, 20, 22, ({ rect, ell, px }) => {
      const leaf = broke ? "#8c8c7a" : wilt ? "#a89a3a" : "#6cd04a";
      const dark = broke ? "#6a6a5a" : wilt ? "#7a6a2a" : "#3f9b3a";
      ell(10, 19, 9, 3, "#7a4b2a");
      rect(4, 17, 12, 1, "#9c6a3c");
      rect(9, wilt ? 9 : 6, 2, wilt ? 9 : 12, dark);
      if (wilt) {
        ell(5, 13, 4, 2, leaf);
        ell(15, 13, 4, 2, leaf);
      } else {
        ell(5, 9, 4.5, 2.5, leaf);
        ell(15, 7, 4.5, 2.5, leaf);
        rect(3, 9, 5, 1, dark);
        rect(13, 7, 5, 1, dark);
        if (lv >= 3) ell(10, 4, 3, 3, leaf);
        if (lv >= 5) {
          px(10, 1, "#ff5a6e");
          px(9, 2, "#ff5a6e");
          px(11, 2, "#ff5a6e");
        }
      }
    });
  if (kind === "debt")
    return sprite(key, 24, 20, ({ rect, ell, px }) => {
      const steel = broke ? "#6a6a72" : "#5a6474";
      ell(8, 15, 5, 5, "#4a3a2a");
      ell(8, 15, 2, 2, "#8a7a5a");
      rect(2, 5, 14, 10, steel);
      rect(2, 5, 14, 2, "#7d8798");
      rect(15, 6, 7, 6, "#3e4652");
      rect(21, 5, 2, 8, "#2a3038");
      rect(16, 7, 5, 1, "#5a6474");
      // Shield emblem.
      const blue = broke ? "#7a8aa0" : "#3f8fd8";
      rect(5, 7, 7, 5, blue);
      rect(6, 12, 5, 1, blue);
      px(8, 13, blue);
      rect(6, 8, 1, 3, "#9fd0ff");
      if (lv >= 3) rect(2, 3, 14, 2, "#ffd23f");
    });
  if (kind === "gold")
    return sprite(key, 24, 20, ({ rect, ell }) => {
      const body = broke ? "#9a9a9a" : "#c9ced6";
      const band = broke ? "#8a8a7a" : "#e8b830";
      ell(8, 15, 5, 5, "#5a4a3a");
      ell(8, 15, 2, 2, band);
      ell(8, 9, 7, 6, body);
      rect(10, 6, 11, 6, body);
      rect(10, 6, 11, 1, "#eef1f5");
      rect(20, 5, 3, 8, band);
      rect(12, 6, 2, 6, band);
      ell(6, 8, 2, 2, "#eef1f5");
      if (lv >= 3) rect(4, 3, 8, 1, band);
    });
  // Cash / FD: a brick safe.
  return sprite(key, 22, 22, ({ rect, ell }) => {
    for (let r = 0; r < 18; r += 3) {
      const off = (r / 3) % 2 ? 2 : 0;
      for (let x = -off; x < 22; x += 5) rect(Math.max(0, x), 4 + r, Math.min(4, x + 4 - Math.max(0, x)), 2, broke ? "#8a7a72" : "#b5563a");
      rect(0, 6 + r, 22, 1, "#7a3424");
    }
    rect(10, 7, 10, 12, broke ? "#7a7a7a" : "#7d8798");
    rect(10, 7, 10, 1, "#aab4c3");
    ell(15, 13, 2.5, 2.5, "#c9d2de");
    rect(15, 12, 1, 2, "#2b2f36");
    rect(18, 12, 1, 3, "#2b2f36");
    if (lv >= 3) rect(0, 2, 22, 2, "#ffd23f");
  });
}

// ---------- thieves (face left; walk frames 0–3) ----------
const GOBLIN = "#6cc04a";
const GOBLIN_D = "#4a8f32";
export function thiefSprite(kind, frame = 0, stealing = false) {
  const f = frame % 4;
  const key = `thief-${kind}-${f}-${stealing}`;
  const leg = [0, 1, 0, -1][f];
  if (kind === "inflation" || kind === "debt")
    return sprite(key, 24, 26, ({ rect, ell, px }) => {
      const cloak = kind === "debt" ? "#7a2a2a" : "#7a4b2a";
      // Legs.
      rect(8 + leg, 21, 2, 4, "#3b2a1e");
      rect(12 - leg, 21, 2, 4, "#3b2a1e");
      // Sack on its back.
      ell(17, 15, 5.5, 6, "#c49a6c");
      rect(15, 8, 4, 2, "#8a6a3c");
      if (kind === "inflation") {
        // A red up-arrow on the sack: prices going up.
        rect(17, 13, 1, 5, "#d32f2f");
        rect(16, 13, 3, 1, "#d32f2f");
        rect(15, 14, 1, 1, "#d32f2f");
        rect(19, 14, 1, 1, "#d32f2f");
        px(17, 12, "#d32f2f");
      } else {
        // ₹ on the sack, and a ball and chain: debt you drag along.
        rect(15, 12, 5, 1, "#2e5e2a");
        rect(15, 14, 5, 1, "#2e5e2a");
        rect(16, 12, 1, 6, "#2e5e2a");
        px(17, 16, "#2e5e2a");
        px(18, 17, "#2e5e2a");
        for (const [x, y] of [[20, 22], [21, 23]]) px(x, y, "#5a5a5a");
        ell(22.5, 24, 2, 2, "#3a3a3a");
      }
      // Body and hood.
      ell(10, 16, 5.5, 6, cloak);
      rect(8, 20, 5, 1, "#5e3920");
      // Head: big ears, long nose, yellow eyes.
      ell(9, 8, 5, 4.5, GOBLIN);
      rect(3, 6, 2, 2, GOBLIN);
      px(2, 5, GOBLIN);
      rect(14, 6, 2, 2, GOBLIN);
      px(15, 5, GOBLIN);
      px(4, 9, GOBLIN);
      rect(6, 7, 2, 1, "#ffeb3b");
      rect(10, 7, 2, 1, "#ffeb3b");
      px(6, 7, "#1a1220");
      px(10, 7, "#1a1220");
      rect(6, 10, 4, 1, GOBLIN_D);
      px(7, 10, "#fff");
      // Arm: reaching forward while it steals.
      if (stealing) rect(2, 14 + (f % 2), 5, 2, GOBLIN);
      else rect(5, 15, 3, 2, GOBLIN);
    });
  if (kind === "raccoon")
    return sprite(key, 26, 24, ({ rect, ell, px }) => {
      // Striped tail.
      for (let i = 0; i < 5; i++) rect(18 + i, 11 - i + (f % 2), 2, 3, i % 2 ? "#3a3a44" : "#9a9aa6");
      rect(7 + leg, 19, 2, 4, "#3a3a44");
      rect(12 - leg, 19, 2, 4, "#3a3a44");
      ell(12, 15, 7, 5.5, "#8f8f9a");
      ell(11, 17, 4, 3, "#c9c9d2");
      // Head with the bandit mask.
      ell(7, 8, 5, 4.5, "#9a9aa6");
      rect(4, 2, 2, 3, "#5a5a66");
      rect(9, 2, 2, 3, "#5a5a66");
      ell(4, 10, 3, 2, "#e8e8ee");
      rect(3, 6, 9, 2, "#1a1a1a");
      px(5, 6, "#fff");
      px(9, 6, "#fff");
      px(1, 10, "#1a1220");
      // A red down-arrow flag: the market drop.
      rect(16, 2, 1, 10, "#6b4423");
      rect(17, 2, 5, 5, "#e53935");
      rect(19, 3, 1, 3, "#fff");
      px(18, 5, "#fff");
      px(20, 5, "#fff");
      if (stealing) rect(1, 14 + (f % 2), 4, 2, "#9a9aa6");
    });
  // Scam: a black hooded shadow with yellow eyes.
  return sprite(
    key,
    18,
    28,
    ({ rect, ell, px }) => {
      ell(9, 8, 6, 6.5, "#141020");
      ell(9, 18, 7, 9, "#141020");
      for (let x = 2; x < 17; x += 3) rect(x, 25 + ((x + f) % 2), 2, 2, "#141020");
      rect(5, 7, 3, 1, "#ffeb3b");
      rect(10, 7, 3, 1, "#ffeb3b");
      px(5, 6, "#ffeb3b");
      px(12, 6, "#ffeb3b");
      // A glowing phone.
      rect(1, 15, 3, 5, "#4fc3f7");
      px(2, 16, "#e1f5fe");
    },
    "#2a2440",
  );
}

// ---------- shots, coins, notes ----------
export function shotSprite(kind) {
  if (kind === "rocket")
    return sprite("shot-rocket", 10, 5, ({ rect, px }) => {
      rect(1, 1, 7, 3, "#f2f2f2");
      rect(8, 1, 1, 3, "#e53935");
      px(9, 2, "#e53935");
      rect(1, 0, 2, 1, "#42a5f5");
      rect(1, 4, 2, 1, "#42a5f5");
    });
  if (kind === "bolt")
    return sprite(
      "shot-bolt",
      9,
      5,
      ({ rect }) => {
        rect(0, 1, 9, 3, "#7fe0ff");
        rect(2, 2, 6, 1, "#ffffff");
      },
      "#2a7fd0",
    );
  if (kind === "nugget")
    return sprite("shot-nugget", 6, 5, ({ rect, px }) => {
      rect(1, 1, 4, 3, "#ffd23f");
      px(0, 2, "#ffd23f");
      px(5, 2, "#e0a100");
      px(2, 1, "#fff6c2");
    });
  return coinSprite(4);
}

export const coinSprite = (r = 5) =>
  sprite(
    `coin-${r}`,
    r * 2 + 1,
    r * 2 + 1,
    ({ ell, rect }) => {
      ell(r + 0.5, r + 0.5, r, r, "#ffc928");
      ell(r + 0.5, r + 0.5, r - 1.5, r - 1.5, "#ffdd55");
      if (r >= 5) {
        rect(r, 2, 1, r * 2 - 3, "#c98a00");
        rect(r - 1, 3, 3, 1, "#c98a00");
      }
      rect(r - 2, 1, 2, 1, "#fff6c2");
    },
    "#8a5a00",
  );

export const noteSprite = () =>
  sprite(
    "note",
    14,
    8,
    ({ rect, ell }) => {
      rect(0, 0, 14, 8, "#7cc576");
      rect(1, 1, 12, 6, "#9ad98f");
      ell(7, 4, 2.5, 2.5, "#5aa055");
      rect(1, 1, 2, 1, "#c8f0c0");
    },
    "#2e6a2a",
  );

// Pixel puff for a defeated thief.
export function puff(ctx, x, y, k, color = "#f2f2f2") {
  ctx.fillStyle = color;
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 6 + k * 26;
    const s = Math.max(PX, Math.round((1 - k) * 4) * PX);
    ctx.fillRect(Math.round((x + Math.cos(a) * r) / PX) * PX, Math.round((y + Math.sin(a) * r * 0.7) / PX) * PX, s, s);
  }
  ctx.globalAlpha = 1;
}

export { DEF_X };
