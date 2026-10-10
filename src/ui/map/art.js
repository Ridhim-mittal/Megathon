// Pixel art, drawn in code at native resolution (16 px tiles). The canvas is scaled up with
// nearest-neighbour sampling, so every rect here is a crisp "pixel".

import { GRID, H, PLACES, TILE, W, hash } from "./village.js";

const C = {
  grass: "#5da444",
  grassDark: "#4a8a36",
  grassLight: "#79c055",
  tuft: "#3f7a2e",
  path: "#d7a764",
  pathDark: "#b8874a",
  pathLight: "#e8c084",
  plaza: "#e2bf84",
  plazaLine: "#c9a066",
  water: "#3f8fd0",
  waterDeep: "#2f74b3",
  waterLight: "#8cc8f0",
  bank: "#c9a56a",
  soil: "#8a5a34",
  soilDark: "#6e4526",
  leaf: "#5b9c3a",
  cotton: "#f6f3e8",
  wood: "#8a5a2c",
  woodLight: "#b07a42",
  woodDark: "#5e3c1e",
  canopyDark: "#2f6b2a",
  canopy: "#3f8a35",
  canopyLight: "#62ad4a",
  canopyHi: "#8fcf5f",
  trunk: "#6b4423",
  rock: "#8d8d8d",
  rockLight: "#b4b4b4",
  rockDark: "#6a6a6a",
  outline: "#3b2b22",
  shadow: "rgba(30, 40, 20, 0.28)",
};
const FLOWERS = ["#e0504a", "#f2d14a", "#f4f4f4", "#f08ac0", "#a77be0"];

function px(ctx, x, y, w = 1, h = 1, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const tileAt = (x, y) => GRID[y]?.[x] ?? "tree";
const isGround = (t) => t === "path" || t === "plaza";

function grass(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, TILE, TILE, C.grass);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(tx, ty, i) * 15);
    const y = Math.floor(hash(tx, ty, i + 9) * 15);
    px(ctx, ox + x, oy + y, 1, 1, i % 2 ? C.grassLight : C.grassDark);
  }
  if (hash(tx, ty, 3) < 0.45) {
    const x = 2 + Math.floor(hash(tx, ty, 4) * 10);
    const y = 4 + Math.floor(hash(tx, ty, 5) * 9);
    px(ctx, ox + x, oy + y + 1, 1, 2, C.tuft);
    px(ctx, ox + x + 2, oy + y + 1, 1, 2, C.tuft);
    px(ctx, ox + x + 1, oy + y, 1, 3, C.tuft);
  }
}

function ground(ctx, ox, oy, tx, ty, plaza) {
  px(ctx, ox, oy, TILE, TILE, plaza ? C.plaza : C.path);
  if (plaza) {
    // Flagstones.
    px(ctx, ox, oy + 7, TILE, 1, C.plazaLine);
    px(ctx, ox + ((tx + ty) % 2 ? 4 : 11), oy, 1, 7, C.plazaLine);
    px(ctx, ox + ((tx + ty) % 2 ? 11 : 4), oy + 8, 1, 8, C.plazaLine);
  } else {
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(hash(tx, ty, 20 + i) * 15);
      const y = Math.floor(hash(tx, ty, 30 + i) * 15);
      px(ctx, ox + x, oy + y, i < 2 ? 2 : 1, 1, i % 3 ? C.pathDark : C.pathLight);
    }
  }
  // Soft grassy edges where the road meets grass.
  const edge = (nx, ny) => !isGround(tileAt(nx, ny)) && tileAt(nx, ny) !== "building" && tileAt(nx, ny) !== "water";
  for (let i = 0; i < TILE; i++) {
    const wob = hash(tx * 31 + i, ty, 50) < 0.5 ? 1 : 2;
    if (edge(tx, ty - 1)) px(ctx, ox + i, oy, 1, wob, C.grass);
    if (edge(tx, ty + 1)) px(ctx, ox + i, oy + TILE - wob, 1, wob, C.grassDark);
    if (edge(tx - 1, ty)) px(ctx, ox, oy + i, wob, 1, C.grass);
    if (edge(tx + 1, ty)) px(ctx, ox + TILE - wob, oy + i, wob, 1, C.grass);
  }
}

function water(ctx, ox, oy, tx, ty, frame) {
  px(ctx, ox, oy, TILE, TILE, C.water);
  for (let i = 0; i < 3; i++) {
    const y = (Math.floor(hash(tx, ty, 60 + i) * 13) + frame * 2) % 14;
    const x = Math.floor(hash(tx, ty, 70 + i) * 10);
    px(ctx, ox + x, oy + y, 4, 1, i === 0 ? C.waterLight : C.waterDeep);
  }
  if (tileAt(tx, ty - 1) !== "water") px(ctx, ox, oy, TILE, 3, C.bank);
  if (tileAt(tx - 1, ty) !== "water") px(ctx, ox, oy, 2, TILE, C.bank);
  if (tileAt(tx + 1, ty) !== "water") px(ctx, ox + TILE - 2, oy, 2, TILE, C.bank);
  if (tileAt(tx, ty + 1) !== "water") px(ctx, ox, oy + TILE - 2, TILE, 2, C.waterDeep);
}

function crop(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, TILE, TILE, C.soil);
  for (let r = 0; r < 4; r++) px(ctx, ox, oy + r * 4 + 3, TILE, 1, C.soilDark);
  for (let i = 0; i < 4; i++) {
    const x = ox + 2 + i * 4;
    const y = oy + 2 + (i % 2) * 6;
    px(ctx, x, y + 2, 1, 4, C.leaf);
    px(ctx, x - 1, y + 3, 3, 1, C.leaf);
    px(ctx, x - 1, y, 2, 2, C.cotton);
    if (hash(tx, ty, 80 + i) < 0.5) px(ctx, x + 1, y + 1, 2, 2, C.cotton);
  }
}

function fence(ctx, ox, oy, tx, ty) {
  const horiz = tileAt(tx - 1, ty) === "fence" || tileAt(tx + 1, ty) === "fence";
  const vert = tileAt(tx, ty - 1) === "fence" || tileAt(tx, ty + 1) === "fence";
  if (horiz || !vert) {
    px(ctx, ox, oy + 6, TILE, 2, C.woodLight);
    px(ctx, ox, oy + 11, TILE, 2, C.wood);
  }
  if (vert) px(ctx, ox + 6, oy, 3, TILE, C.wood);
  px(ctx, ox + 6, oy + 3, 3, 12, C.woodDark);
  px(ctx, ox + 6, oy + 3, 3, 1, C.woodLight);
}

function flowers(ctx, ox, oy, tx, ty) {
  grass(ctx, ox, oy, tx, ty);
  for (let i = 0; i < 4; i++) {
    const x = 2 + Math.floor(hash(tx, ty, 90 + i) * 11);
    const y = 2 + Math.floor(hash(tx, ty, 95 + i) * 11);
    const c = FLOWERS[Math.floor(hash(tx, ty, 99 + i) * FLOWERS.length)];
    px(ctx, ox + x, oy + y + 2, 1, 2, C.tuft);
    px(ctx, ox + x - 1, oy + y, 3, 2, c);
    px(ctx, ox + x, oy + y, 1, 1, "#fff3b0");
  }
}

function palm(ctx, ox, oy, tx, ty) {
  // A coconut palm: a thin leaning trunk, a crown of fronds and a few coconuts.
  px(ctx, ox + 3, oy + 13, 10, 3, C.shadow);
  const lean = hash(tx, ty, 9) < 0.5 ? -1 : 1;
  for (let i = 0; i < 18; i++) {
    const tx2 = ox + 7 + Math.round((lean * i * i) / 70);
    px(ctx, tx2, oy + 14 - i, 3, 1, i % 3 === 0 ? "#7a5432" : "#9a6e42");
  }
  const cx = ox + 8 + Math.round((lean * 17 * 17) / 70);
  const cy = oy - 4;
  const frond = (dx, dy, len, color) => {
    for (let i = 1; i <= len; i++) px(ctx, cx + Math.round((dx * i) / len), cy + Math.round((dy * i) / len) + Math.round((i * i) / (len * 2)), 2, 1, color);
  };
  frond(-12, -1, 11, C.canopyDark);
  frond(12, -1, 11, C.canopyDark);
  frond(-11, 0, 10, C.canopy);
  frond(11, 0, 10, C.canopy);
  frond(-9, 5, 9, C.canopyDark);
  frond(9, 5, 9, C.canopy);
  frond(-5, -8, 7, C.canopyLight);
  frond(5, -8, 7, C.canopyLight);
  frond(0, -9, 5, C.canopyHi);
  frond(-2, 6, 5, C.canopy);
  px(ctx, cx - 2, cy + 1, 2, 2, "#6b4423");
  px(ctx, cx + 1, cy + 2, 2, 2, "#7a5432");
  px(ctx, cx - 1, cy - 1, 3, 2, C.canopyHi);
}

function tree(ctx, ox, oy, tx, ty) {
  const border = tx === 0 || ty === 0 || tx === W - 1 || ty === H - 1;
  const banyan = tx >= 12 && tx <= 13 && ty >= 11 && ty <= 12;
  if (!border && !banyan && hash(tx, ty, 21) < 0.55) return palm(ctx, ox, oy, tx, ty);
  px(ctx, ox + 2, oy + 13, 12, 3, C.shadow);
  px(ctx, ox + 6, oy + 8, 4, 7, C.trunk);
  px(ctx, ox + 6, oy + 8, 1, 7, "#80562f");
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      px(ctx, ox + cx - w, oy + cy + y, w * 2, 1, color);
    }
  };
  const lift = hash(tx, ty, 5) < 0.5 ? 0 : 1;
  blob(8, 1 - lift, 9, C.canopyDark);
  blob(8, 0 - lift, 8, C.canopy);
  blob(6, -2 - lift, 5, C.canopyLight);
  blob(5, -4 - lift, 2, C.canopyHi);
  if (hash(tx, ty, 6) < 0.3) {
    px(ctx, ox + 11, oy - 1, 2, 2, "#e8743c");
    px(ctx, ox + 4, oy + 3, 2, 2, "#e8743c");
  }
}

function bush(ctx, ox, oy, tx, ty) {
  px(ctx, ox + 2, oy + 12, 12, 3, C.shadow);
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y) * 1.2);
      px(ctx, ox + cx - w, oy + cy + y, w * 2, 1, color);
    }
  };
  blob(8, 9, 5, C.canopyDark);
  blob(8, 8, 4, C.canopy);
  blob(6, 7, 2, C.canopyLight);
  if (hash(tx, ty, 8) < 0.5) {
    px(ctx, ox + 10, oy + 8, 1, 1, "#e0504a");
    px(ctx, ox + 6, oy + 10, 1, 1, "#e0504a");
  }
}

function rock(ctx, ox, oy, tx, ty) {
  px(ctx, ox + 3, oy + 12, 11, 2, C.shadow);
  px(ctx, ox + 3, oy + 7, 10, 6, C.rockDark);
  px(ctx, ox + 4, oy + 6, 8, 6, C.rock);
  px(ctx, ox + 5, oy + 6, 4, 2, C.rockLight);
}

function well(ctx, ox, oy) {
  px(ctx, ox + 1, oy + 6, 14, 9, "#7d7d7d");
  px(ctx, ox + 2, oy + 7, 12, 6, "#a3a3a3");
  px(ctx, ox + 4, oy + 8, 8, 4, C.waterDeep);
  px(ctx, ox + 1, oy - 6, 2, 13, C.woodDark);
  px(ctx, ox + 13, oy - 6, 2, 13, C.woodDark);
  px(ctx, ox, oy - 8, 16, 3, "#b2533b");
  px(ctx, ox + 7, oy - 5, 2, 8, "#6b6b6b");
}

// ---------- buildings ----------
// Telugu village buildings, drawn cosy: soft shading, a warm outline (added for the whole sprite
// layer in renderVillage), gables with round vents, painted shutters, arched doors, torans of mango
// leaves, flower boxes, kolams and tulasi kotas. Footprints and doors stay where village.js puts them.

const OUTLINE = [58, 40, 30];
const TERRACOTTA = { base: "#d4693f", dark: "#a54a2c", light: "#ec9466", ridge: "#8a3a22", under: "#7a3420" };
const BLUE_TIN = { base: "#9fb2c4", dark: "#7890a6", light: "#c6d4e0", ridge: "#5f748a", under: "#4e5f70" };

const STYLES = {
  home: { wall: "#f8e8c4", shade: "#e3cc9a", dado: "#c25a3c", trim: "#2f9a94", door: "#3f8fbf", roof: TERRACOTTA, gable: true },
  school: { wall: "#f7dc84", shade: "#e2c262", dado: "#5a9a4a", trim: "#4f8a3e", door: "#4f8a3e", roof: TERRACOTTA, gable: true },
  bank: { wall: "#fbfaf4", shade: "#e2ded0", dado: "#2f5f9e", trim: "#2f5f9e", door: "#6fb7e0", roof: "flat", band: "#2f5f9e" },
  post: { wall: "#fbeccd", shade: "#e6d2a6", dado: "#c8382e", trim: "#c8382e", door: "#9a3a2c", roof: TERRACOTTA, gable: true },
  shop: { wall: "#a9dbe6", shade: "#86c2d0", dado: "#3f8fa6", trim: "#2f7f96", door: "#7a4a2a", roof: TERRACOTTA },
  hospital: { wall: "#fdfdf8", shade: "#e3e3d8", dado: "#2f9a94", trim: "#2f9a94", door: "#2f9a94", roof: "flat", band: "#2f9a94" },
  sahukar: { wall: "#e2c4ec", shade: "#c9a6d6", dado: "#7a2e58", trim: "#d9a62e", door: "#7a2e38", roof: TERRACOTTA, gable: true },
  panchayat: { wall: "#fbfaf4", shade: "#e2ded0", dado: "#3d9a4a", trim: "#f29a3a", door: "#6b5a4a", roof: "flat", band: "#f29a3a" },
  work: { wall: "#c99a62", shade: "#a87c48", dado: "#7a5432", trim: "#7a5432", door: "#4a3020", roof: BLUE_TIN, tin: true },
};

const roofHeight = (b) => {
  const s = STYLES[b.style];
  const h = b.h * TILE;
  return Math.round(h * (s.roof === "flat" ? 0.34 : 0.5));
};

function hipRoof(ctx, x, y, w, h, pal, tin) {
  // A hipped roof seen from the front: rounded top corners, tile courses (or corrugations),
  // a light top edge and a dark eave.
  for (let r = 0; r < h; r++) {
    const inset = Math.max(0, Math.round((h * 0.34 - r) * 0.9));
    const rx = x - 3 + inset;
    const rw = w + 6 - inset * 2;
    if (rw <= 0) continue;
    let color = pal.base;
    if (r < 2) color = pal.light;
    else if (!tin && r % 4 === 3) color = pal.dark;
    px(ctx, rx, y + r, rw, 1, color);
    if (tin) for (let c = 1; c < rw; c += 4) px(ctx, rx + c, y + r, 1, 1, r < 2 ? pal.base : pal.dark);
    else if (r % 4 === 1) for (let c = (r % 8 === 1 ? 1 : 3); c < rw - 1; c += 4) px(ctx, rx + c, y + r, 2, 1, pal.light);
    // Rounded shoulders.
    px(ctx, rx, y + r, 1, 1, pal.dark);
    px(ctx, rx + rw - 1, y + r, 1, 1, pal.dark);
  }
  px(ctx, x - 3, y + h - 2, w + 6, 2, pal.under);
}

function gable(ctx, cx, baseY, w, h, s) {
  // A front gable over the door: wall-coloured triangle with a roof-coloured edge and a round vent.
  for (let r = 0; r < h; r++) {
    const half = Math.round(((r + 1) / h) * (w / 2));
    px(ctx, cx - half - 1, baseY - h + r, half * 2 + 2, 1, s.roof.dark);
    if (half > 1) px(ctx, cx - half + 1, baseY - h + r, half * 2 - 2, 1, s.wall);
  }
  px(ctx, cx - Math.round(w / 2) - 2, baseY - 1, w + 4, 2, s.roof.under);
  // A round four-pane window.
  const vy = baseY - Math.round(h * 0.5);
  px(ctx, cx - 3, vy - 4, 6, 1, s.trim);
  px(ctx, cx - 4, vy - 3, 8, 6, s.trim);
  px(ctx, cx - 3, vy + 3, 6, 1, s.trim);
  px(ctx, cx - 3, vy - 3, 6, 6, "#9fd3ef");
  px(ctx, cx - 2, vy - 4, 4, 1, s.trim);
  px(ctx, cx - 3, vy - 3, 2, 2, "#d8f0fb");
  px(ctx, cx, vy - 3, 1, 6, s.trim);
  px(ctx, cx - 3, vy, 6, 1, s.trim);
}

function flatRoof(ctx, x, y, w, h, s, tank = true) {
  px(ctx, x - 2, y, w + 4, h, "#d9d3c4");
  px(ctx, x, y + 2, w, h - 5, "#f0ece2");
  for (let c = 8; c < w - 2; c += 12) px(ctx, x + c, y + 3, 1, h - 7, "#e4dfd2");
  px(ctx, x - 2, y, w + 4, 1, "#ffffff");
  if (s.band) px(ctx, x - 2, y + h - 4, w + 4, 3, s.band);
  px(ctx, x - 2, y + h - 1, w + 4, 1, "#9f998a");
  if (tank) {
    const tx = x + w - 15;
    px(ctx, tx, y + 3, 10, 9, "#2b2b30");
    px(ctx, tx + 1, y + 3, 3, 8, "#4a4a52");
    px(ctx, tx + 2, y + 2, 6, 1, "#2b2b30");
  }
}

function wall(ctx, x, y, w, h, s, b) {
  px(ctx, x, y, w, h, s.wall);
  for (let i = 0; i < Math.floor(w / 6); i++) {
    const sx = x + Math.floor(hash(b.x + i, b.y, 31) * w);
    const sy = y + 3 + Math.floor(hash(b.x, b.y + i, 32) * (h - 9));
    px(ctx, sx, sy, 1, 1, s.shade);
  }
  px(ctx, x, y, w, 3, "rgba(80,40,20,0.22)");
  px(ctx, x, y + h - 5, w, 5, s.dado);
  px(ctx, x, y + h - 5, w, 1, "rgba(255,255,255,0.25)");
  px(ctx, x, y, 1, h, "rgba(255,255,255,0.35)");
  px(ctx, x + w - 2, y, 2, h, "rgba(80,40,20,0.15)");
}

function windowAt(ctx, x, y, s, { box = false, grille = true } = {}) {
  // A painted window: arched top, dark glass with a glint, shutters, a sill (and a flower box).
  const w = 10;
  const h = 10;
  px(ctx, x - 4, y + 1, 3, h - 1, s.trim);
  px(ctx, x + w + 1, y + 1, 3, h - 1, s.trim);
  px(ctx, x - 4, y + 1, 1, h - 1, "rgba(255,255,255,0.3)");
  px(ctx, x - 1, y, w + 2, h + 1, "#6e4526");
  px(ctx, x, y + 1, w, h - 1, "#3a4048");
  px(ctx, x + 1, y, w - 2, 1, "#3a4048");
  px(ctx, x + 1, y + 2, 2, 3, "#9fd3ef");
  if (grille) for (let c = 3; c < w; c += 3) px(ctx, x + c, y + 1, 1, h - 1, "#7d8590");
  px(ctx, x - 2, y + h, w + 4, 2, "#fff3d6");
  if (box) {
    px(ctx, x - 1, y + h + 2, w + 2, 3, "#a5552f");
    const flowers = ["#ff6f91", "#ffd84a", "#ff6f91", "#ffffff", "#ff9a3c"];
    for (let i = 0; i < 5; i++) px(ctx, x + i * 2, y + h + 1, 2, 1, flowers[i]);
    px(ctx, x, y + h + 2, w, 1, "#4f9a3a");
  }
}

function doorAt(ctx, cx, bottom, color, { w = 10, h = 15, toran = false } = {}) {
  const x = cx - Math.floor(w / 2);
  // Frame with an arched top.
  px(ctx, x - 2, bottom - h, w + 4, h, "#6e4526");
  px(ctx, x - 1, bottom - h - 1, w + 2, 1, "#6e4526");
  px(ctx, x, bottom - h + 1, w, h - 1, color);
  px(ctx, x + 1, bottom - h, w - 2, 1, color);
  px(ctx, x + Math.floor(w / 2), bottom - h + 1, 1, h - 1, "rgba(0,0,0,0.25)");
  px(ctx, x + 1, bottom - h + 3, 2, h - 5, "rgba(255,255,255,0.22)");
  px(ctx, x + w - 3, bottom - Math.floor(h / 2), 1, 2, "#ffd84a");
  px(ctx, x + 2, bottom - Math.floor(h / 2), 1, 2, "#ffd84a");
  if (toran) {
    // Mango leaves with marigolds over the door.
    for (let i = -1; i <= w; i += 3) {
      px(ctx, x + i, bottom - h - 2, 2, 1, "#3f8a35");
      px(ctx, x + i, bottom - h - 1, 2, 2, "#5da444");
      px(ctx, x + i + 1, bottom - h + 1, 1, 1, "#3f8a35");
    }
    for (let i = 0; i < w; i += 3) px(ctx, x + i, bottom - h - 2, 1, 1, "#ff9a3c");
  }
  // Two stone steps.
  px(ctx, x - 3, bottom, w + 6, 2, "#c8bfae");
  px(ctx, x - 3, bottom, w + 6, 1, "#e2dacb");
  px(ctx, x - 1, bottom + 2, w + 2, 2, "#b3aa9a");
}

function signboard(ctx, cx, y, color, ink, draw) {
  px(ctx, cx - 11, y, 22, 9, "#6e4526");
  px(ctx, cx - 10, y + 1, 20, 7, color);
  px(ctx, cx - 10, y + 1, 20, 1, "rgba(255,255,255,0.35)");
  draw?.(cx, y + 1, ink);
}

const SIGNS = {
  school: (ctx) => (cx, y, ink) => {
    px(ctx, cx - 7, y + 2, 5, 1, ink);
    px(ctx, cx - 7, y + 4, 8, 1, ink);
    px(ctx, cx + 3, y + 1, 4, 4, "#ffd84a");
  },
  bank: (ctx) => (cx, y, ink) => {
    px(ctx, cx - 3, y + 1, 6, 1, ink);
    px(ctx, cx - 3, y + 3, 6, 1, ink);
    px(ctx, cx - 1, y + 2, 2, 1, ink);
    px(ctx, cx - 2, y + 4, 2, 1, ink);
    px(ctx, cx, y + 5, 2, 1, ink);
  },
  post: (ctx) => (cx, y, ink) => {
    px(ctx, cx - 5, y + 1, 10, 5, "#fffaf0");
    px(ctx, cx - 4, y + 2, 2, 1, ink);
    px(ctx, cx + 2, y + 2, 2, 1, ink);
    px(ctx, cx - 2, y + 3, 4, 1, ink);
  },
  shop: (ctx) => (cx, y, ink) => {
    for (let i = -8; i < 8; i += 3) px(ctx, cx + i, y + 2, 2, 3, ["#e0504a", "#3d9a4a", "#3b6ea5", "#ff9a3c", "#e04a8a", "#7a4ab0"][(i + 8) / 3]);
  },
  hospital: (ctx) => (cx, y) => {
    px(ctx, cx - 1, y, 3, 7, "#e04a3a");
    px(ctx, cx - 3, y + 2, 7, 3, "#e04a3a");
  },
  sahukar: (ctx) => (cx, y) => {
    for (const dx of [-6, -1, 4]) {
      px(ctx, cx + dx, y + 1, 3, 4, "#ffe58a");
      px(ctx, cx + dx + 1, y + 2, 1, 2, "#c99b2e");
    }
  },
  panchayat: (ctx) => (cx, y, ink) => {
    px(ctx, cx - 8, y + 2, 16, 1, ink);
    px(ctx, cx - 8, y + 4, 11, 1, ink);
  },
  work: (ctx) => (cx, y) => {
    px(ctx, cx - 4, y + 1, 8, 5, "#fff3d6");
    px(ctx, cx - 3, y + 1, 6, 1, "#e3d3a8");
    px(ctx, cx - 1, y + 3, 2, 1, "#c99b2e");
  },
};

function sack(ctx, x, y, c = "#efe2bd") {
  px(ctx, x, y + 2, 7, 6, c);
  px(ctx, x + 1, y + 1, 5, 2, c);
  px(ctx, x + 2, y, 3, 1, "#c9b68a");
  px(ctx, x + 1, y + 7, 6, 1, "rgba(80,50,20,0.25)");
  px(ctx, x + 1, y + 3, 1, 3, "rgba(255,255,255,0.5)");
}

function barrel(ctx, x, y) {
  px(ctx, x, y + 1, 8, 9, "#a8683a");
  px(ctx, x + 1, y, 6, 1, "#c88a52");
  px(ctx, x + 1, y + 1, 2, 8, "#c88a52");
  px(ctx, x, y + 3, 8, 1, "#5e3c1e");
  px(ctx, x, y + 7, 8, 1, "#5e3c1e");
}

function pot(ctx, x, y, plant = true) {
  px(ctx, x, y + 3, 6, 5, "#c25a3c");
  px(ctx, x - 1, y + 3, 8, 1, "#e07a52");
  px(ctx, x + 1, y + 8, 4, 1, "#a5452c");
  if (plant) {
    px(ctx, x + 1, y, 4, 3, "#4f9a3a");
    px(ctx, x, y + 1, 1, 2, "#3f8a35");
    px(ctx, x + 5, y + 1, 1, 2, "#3f8a35");
    px(ctx, x + 2, y - 1, 2, 1, "#ff6f91");
  }
}

function tulasi(ctx, x, y) {
  // The tulasi kota: a little painted pedestal with the holy basil on top.
  px(ctx, x, y + 6, 10, 9, "#f8e8c4");
  px(ctx, x, y + 6, 10, 2, "#c25a3c");
  px(ctx, x + 3, y + 9, 4, 4, "#ffd84a");
  px(ctx, x + 4, y + 10, 2, 2, "#c25a3c");
  px(ctx, x - 1, y + 14, 12, 2, "#c25a3c");
  px(ctx, x + 2, y + 1, 6, 5, "#4f9a3a");
  px(ctx, x + 1, y + 2, 1, 3, "#3f8a35");
  px(ctx, x + 8, y + 2, 1, 3, "#3f8a35");
  px(ctx, x + 4, y, 2, 1, "#6fb84f");
}

function bench(ctx, x, y) {
  px(ctx, x, y, 16, 3, "#b07a42");
  px(ctx, x, y, 16, 1, "#d39a5a");
  px(ctx, x + 1, y + 3, 2, 4, "#6e4526");
  px(ctx, x + 13, y + 3, 2, 4, "#6e4526");
}

function cart(ctx, x, y) {
  // A bullock cart with a big spoked wheel.
  px(ctx, x + 2, y, 22, 7, "#b07a42");
  px(ctx, x + 2, y, 22, 1, "#d39a5a");
  for (let c = 5; c < 24; c += 5) px(ctx, x + c, y + 1, 1, 6, "#8a5a2c");
  px(ctx, x + 24, y + 4, 10, 2, "#8a5a2c");
  const wx = x + 6;
  const wy = y + 6;
  for (let r = -5; r <= 5; r++) {
    const half = Math.round(Math.sqrt(25 - r * r));
    px(ctx, wx - half, wy + r, 1, 1, "#5e3c1e");
    px(ctx, wx + half, wy + r, 1, 1, "#5e3c1e");
  }
  px(ctx, wx - 4, wy - 5, 9, 1, "#5e3c1e");
  px(ctx, wx - 4, wy + 5, 9, 1, "#5e3c1e");
  px(ctx, wx - 4, wy, 9, 1, "#8a5a2c");
  px(ctx, wx, wy - 4, 1, 9, "#8a5a2c");
  px(ctx, wx - 1, wy - 1, 3, 3, "#c88a52");
}

// Where the moving bits go (smoke, flags), in map pixels. Filled by building().
export const ANCHORS = { smoke: [], flags: [] };

function building(ctx, b) {
  const s = STYLES[b.style];
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const roofH = roofHeight(b);
  const wallY = y + roofH;
  const bottom = y + h - 3;
  const wallH = bottom - wallY;
  const doorX = b.door.x * TILE + 8;

  // Plinth, walls.
  px(ctx, x - 1, bottom, w + 2, 3, "#bdb3a0");
  px(ctx, x - 1, bottom, w + 2, 1, "#d8cfbd");
  wall(ctx, x + 1, wallY, w - 2, wallH, s, b);

  // Windows either side of the door.
  const open = b.style === "shop" || b.style === "work";
  if (!open) {
    const winY = wallY + Math.max(7, Math.floor(wallH / 2) - 6);
    const slots = [];
    for (const off of [-1, 1]) for (let k = 1; k <= 3; k++) slots.push(doorX + off * (k * 20) - 5);
    for (const wx of slots) {
      if (wx < x + 7 || wx + 14 > x + w - 2) continue;
      windowAt(ctx, wx, winY, s, { box: b.style === "home" || b.style === "post" || b.style === "sahukar", grille: b.style !== "bank" });
    }
  }

  // Style details on the walls.
  if (b.style === "home" || b.style === "sahukar") {
    for (const cx of [x + 3, x + w - 6]) {
      px(ctx, cx, wallY, 3, wallH, b.style === "sahukar" ? "#fffaf0" : "#9a6a3a");
      px(ctx, cx, wallY, 1, wallH, b.style === "sahukar" ? "#ffffff" : "#c08a52");
      px(ctx, cx - 1, bottom - 2, 5, 2, "#d8cfbd");
    }
  }
  if (b.style === "sahukar") {
    px(ctx, x + 1, wallY + 4, w - 2, 2, s.trim);
    for (let c = 4; c < w - 4; c += 4) px(ctx, x + c, wallY + 6, 1, 2, s.trim);
  }
  if (b.style === "bank") {
    for (let i = 0; i < 4; i++) {
      const cx = x + 7 + Math.round((i * (w - 20)) / 3);
      if (Math.abs(cx + 2 - doorX) < 10) continue;
      px(ctx, cx, wallY + 6, 5, wallH - 6, "#ffffff");
      px(ctx, cx + 4, wallY + 6, 1, wallH - 6, "#d9d3c4");
      px(ctx, cx - 1, wallY + 5, 7, 2, "#e2ded0");
    }
  }
  if (b.style === "shop") {
    // Open stall under a striped scalloped awning: packets, candy jars, a counter.
    const sx = x + 6;
    const sw = w - 12;
    const sy = wallY + 8;
    const sh = wallH - 12;
    px(ctx, sx, sy, sw, sh, "#4a3428");
    px(ctx, sx, sy, sw, 2, "#2f2018");
    const packets = ["#ff6f61", "#ffd84a", "#57b85a", "#4f8fe0", "#ff9a3c", "#e05aa0"];
    for (let r = 0; r < 2; r++)
      for (let c = 1; c < sw - 2; c += 3) {
        if (Math.abs(sx + c - doorX) < 7) continue;
        px(ctx, sx + c, sy + 3 + r * 6, 2, 4, packets[(Math.floor(c / 3) + r * 3) % packets.length]);
        px(ctx, sx + c, sy + 3 + r * 6, 2, 1, "rgba(255,255,255,0.45)");
      }
    px(ctx, sx - 2, sy + sh - 4, sw + 4, 4, "#c88a52");
    px(ctx, sx - 2, sy + sh - 4, sw + 4, 1, "#e8b070");
    for (let c = 3; c < sw - 6; c += 7) {
      if (Math.abs(sx + c + 2 - doorX) < 9) continue;
      px(ctx, sx + c, sy + sh - 9, 5, 5, "#cfeaf2");
      px(ctx, sx + c, sy + sh - 10, 5, 1, "#e07a52");
      px(ctx, sx + c + 1, sy + sh - 7, 3, 3, ["#ff6f91", "#ffd84a", "#57b85a"][Math.floor(c / 7) % 3]);
    }
    // Awning.
    for (let c = 0; c < w + 4; c++) {
      const stripe = Math.floor(c / 5) % 2 ? "#fff6e6" : "#e8503a";
      px(ctx, x - 2 + c, wallY + 1, 1, 6, stripe);
      if (c % 5 === 2) px(ctx, x - 2 + c - 1, wallY + 7, 3, 1, stripe);
    }
    px(ctx, x - 2, wallY + 1, w + 4, 1, "#b8402e");
    sack(ctx, x + 1, bottom - 8);
    sack(ctx, x + 7, bottom - 7, "#f6eccd");
    barrel(ctx, x + w - 10, bottom - 9);
  }
  if (b.style === "hospital") {
    const cx = x + 14;
    px(ctx, cx - 6, wallY + 6, 13, 13, "#ffffff");
    px(ctx, cx - 5, wallY + 5, 11, 15, "#ffffff");
    px(ctx, cx - 1, wallY + 8, 3, 9, "#e04a3a");
    px(ctx, cx - 4, wallY + 11, 9, 3, "#e04a3a");
    pot(ctx, doorX - 18, bottom - 8);
    pot(ctx, doorX + 13, bottom - 8);
    bench(ctx, x + w - 22, bottom - 6);
  }
  if (b.style === "panchayat") {
    px(ctx, x + 6, wallY + 2, w - 12, 8, "#3f4c55");
    px(ctx, x + 7, wallY + 3, w - 14, 1, "#56646e");
    px(ctx, x + 9, wallY + 5, w - 18, 1, "#f0ece2");
    px(ctx, x + 9, wallY + 7, w - 30, 1, "#c9c4b6");
    px(ctx, x + 1, bottom - 7, w - 2, 2, "#ffffff");
    px(ctx, x + 1, bottom - 9, w - 2, 2, "#f29a3a");
    pot(ctx, doorX + 13, bottom - 8);
  }
  if (b.style === "post") {
    px(ctx, x + 1, wallY + 6, w - 2, 3, "#c8382e");
    px(ctx, x + 1, wallY + 9, w - 2, 1, "#ffd84a");
  }
  if (b.style === "work") {
    // Plank walls, the open mill door with the huller, sacks, and the bullock cart.
    for (let c = 4; c < w - 2; c += 6) px(ctx, x + c, wallY + 2, 1, wallH - 7, s.shade);
    px(ctx, x + 6, wallY + 4, 26, wallH - 9, "#3a2c22");
    px(ctx, x + 11, wallY + 6, 14, 7, "#57a050");
    px(ctx, x + 11, wallY + 6, 14, 1, "#7cc070");
    px(ctx, x + 14, wallY + 13, 8, 9, "#3f7f3c");
    px(ctx, x + 9, wallY + 22, 18, 3, "#8d8d8d");
    px(ctx, x + 16, wallY + 25, 3, 3, "#f6eccd");
    sack(ctx, x + w - 34, bottom - 9);
    sack(ctx, x + w - 27, bottom - 9, "#f6eccd");
    sack(ctx, x + w - 31, bottom - 16);
  }

  // Roof.
  if (s.roof === "flat") flatRoof(ctx, x, y, w, roofH, s, b.style !== "bank");
  else hipRoof(ctx, x, y, w, roofH, s.roof, s.tin);
  if (s.gable) gable(ctx, doorX, wallY, Math.min(34, w - 26), Math.round(roofH * 0.62), s);
  if (b.style === "work") {
    for (let i = 0; i < 7; i++) {
      const rx = x + Math.floor(hash(b.x + i, b.y, 11) * (w - 10));
      const ry = y + 3 + Math.floor(hash(b.x, b.y + i, 12) * (roofH - 9));
      px(ctx, rx, ry, 4 + (i % 3), 2, i % 2 ? "#c47a46" : "#d9925a");
    }
  }

  // Chimneys and flagpoles (smoke and flags move in drawAmbient).
  if (b.style === "home") {
    const cx = x + 10;
    px(ctx, cx, y - 6, 7, 12, "#b5523b");
    px(ctx, cx - 1, y - 7, 9, 2, "#8a3a22");
    px(ctx, cx + 1, y - 5, 2, 10, "#d4693f");
    ANCHORS.smoke.push({ x: cx + 3, y: y - 8 });
  }
  if (b.style === "work") {
    const cx = x + w - 14;
    px(ctx, cx, y - 16, 7, roofH + 4, "#b5523b");
    px(ctx, cx - 1, y - 18, 9, 3, "#8a3a22");
    px(ctx, cx + 1, y - 14, 2, roofH + 2, "#d4693f");
    ANCHORS.smoke.push({ x: cx + 3, y: y - 19 });
  }
  if (b.style === "school") {
    // A round clock in the gable's place above the sign, and the flagpole.
    px(ctx, x + w - 9, y - 22, 1, 26, "#e2e2e2");
    px(ctx, x + w - 10, y + 3, 3, 1, "#9a9a9a");
    ANCHORS.flags.push({ x: x + w - 8, y: y - 22 });
  }
  if (b.style === "panchayat") {
    px(ctx, x + 6, y - 20, 1, 28, "#e2e2e2");
    px(ctx, x + 5, y + 7, 3, 1, "#9a9a9a");
    ANCHORS.flags.push({ x: x + 7, y: y - 20 });
  }

  // Sign, door, and what sits in front.
  const sign = { school: "#2f4f3a", bank: "#ffd84a", post: "#c8382e", shop: "#ffd84a", hospital: "#ffffff", sahukar: "#7a2e58", panchayat: "#fff6dc", work: "#e8b070" }[b.style];
  const ink = { school: "#f4f4f0", bank: "#5e3c1e", post: "#c8382e", shop: "#5e3c1e", panchayat: "#3f4c55" }[b.style] ?? "#5e3c1e";
  if (sign) {
    const sy = b.style === "shop" ? y + roofH - 14 : wallY + (b.style === "panchayat" ? 11 : 5);
    signboard(ctx, doorX, sy, sign, ink, SIGNS[b.style]?.(ctx));
  }
  doorAt(ctx, doorX, bottom, s.door, { w: b.style === "work" ? 14 : b.style === "bank" ? 12 : 10, h: b.style === "shop" ? 12 : 15, toran: b.style === "home" || b.style === "sahukar" || b.style === "shop" });
  if (b.style === "home") {
    tulasi(ctx, x + 6, bottom + 2);
    pot(ctx, x + w - 12, bottom - 7);
  }
  if (b.style === "sahukar") {
    pot(ctx, doorX - 16, bottom - 8);
    pot(ctx, doorX + 11, bottom - 8);
  }
  if (b.style === "post") {
    px(ctx, doorX + 11, bottom - 13, 7, 12, "#d63a2e");
    px(ctx, doorX + 10, bottom - 15, 9, 3, "#a82a20");
    px(ctx, doorX + 12, bottom - 11, 5, 1, "#3b2b22");
    px(ctx, doorX + 12, bottom - 7, 5, 2, "#ffd84a");
    px(ctx, doorX + 12, bottom - 1, 5, 2, "#7a2a20");
  }
  if (b.style === "work") cart(ctx, x + w + 2, bottom - 8);
}

function notice(ctx, o) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  px(ctx, x + 2, y + 3, 2, 13, C.woodDark);
  px(ctx, x + 12, y + 3, 2, 13, C.woodDark);
  px(ctx, x - 1, y - 5, 18, 12, C.wood);
  px(ctx, x, y - 4, 16, 10, C.woodLight);
  px(ctx, x - 1, y - 6, 18, 2, "#c25a3c");
  px(ctx, x + 1, y - 3, 6, 5, "#fff8e0");
  px(ctx, x + 8, y - 2, 6, 6, "#ffe58a");
  px(ctx, x + 2, y + 3, 5, 2, "#ffc4d8");
  px(ctx, x + 3, y - 3, 1, 1, "#e04a3a");
  px(ctx, x + 10, y - 2, 1, 1, "#3b6ea5");
}

function gate(ctx, o) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  px(ctx, x, y + 4, 2, 12, C.woodDark);
  px(ctx, x + 14, y + 4, 2, 12, C.woodDark);
  for (let i = 0; i < 3; i++) px(ctx, x + 2, y + 5 + i * 4, 12, 2, C.woodLight);
  // A scarecrow in the field behind, with a pot head and a bright shirt.
  px(ctx, x + 7, y - 18, 2, 16, C.woodDark);
  px(ctx, x + 1, y - 14, 14, 2, C.woodDark);
  px(ctx, x + 4, y - 25, 8, 7, "#c25a3c");
  px(ctx, x + 5, y - 24, 6, 1, "#e07a52");
  px(ctx, x + 5, y - 22, 1, 1, "#fff6dc");
  px(ctx, x + 10, y - 22, 1, 1, "#fff6dc");
  px(ctx, x + 6, y - 20, 4, 1, "#fff6dc");
  px(ctx, x + 3, y - 13, 10, 8, "#3f8fbf");
  px(ctx, x + 3, y - 13, 10, 2, "#ffd84a");
}

// Things painted on the ground (no outline): kolams, lotus pads, pebbles.
function groundDecals(ctx) {
  for (const p of PLACES) {
    if (!["home", "sahukar", "school", "panchayat"].includes(p.style)) continue;
    const cx = p.door.x * TILE + 8;
    const cy = (p.y + p.h) * TILE + 7;
    const colors = ["#ffffff", "#ff6f91", "#ffd84a", "#57b8e0"];
    for (let r = 0; r < 4; r++) {
      const rad = 6 - r;
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        px(ctx, cx + Math.round(Math.cos(ang) * rad * 1.3), cy + Math.round(Math.sin(ang) * rad * 0.7), 1, 1, colors[r]);
      }
    }
    px(ctx, cx - 1, cy, 3, 1, "#ff9a3c");
  }
  // Lotus pads on the pond.
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      if (GRID[ty][tx] !== "water" || hash(tx, ty, 41) > 0.6) continue;
      const lx = tx * TILE + 3 + Math.floor(hash(tx, ty, 42) * 8);
      const ly = ty * TILE + 4 + Math.floor(hash(tx, ty, 43) * 8);
      px(ctx, lx, ly, 5, 3, "#4f9a3a");
      px(ctx, lx + 1, ly - 1, 3, 1, "#4f9a3a");
      px(ctx, lx + 2, ly, 1, 1, "#3f7a2e");
      if (hash(tx, ty, 44) < 0.5) {
        px(ctx, lx + 1, ly - 2, 3, 2, "#ff9ac0");
        px(ctx, lx + 2, ly - 3, 1, 1, "#ffc4d8");
      }
    }
}

// The outline pass: every transparent pixel touching an opaque one becomes the warm outline.
function outline(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const solid = (i) => d[i * 4 + 3] >= 200;
  const out = new Uint8Array(width * height);
  for (let yy = 0; yy < height; yy++)
    for (let xx = 0; xx < width; xx++) {
      const i = yy * width + xx;
      if (solid(i)) continue;
      if ((xx > 0 && solid(i - 1)) || (xx < width - 1 && solid(i + 1)) || (yy > 0 && solid(i - width)) || (yy < height - 1 && solid(i + width))) out[i] = 1;
    }
  for (let i = 0; i < out.length; i++)
    if (out[i]) {
      d[i * 4] = OUTLINE[0];
      d[i * 4 + 1] = OUTLINE[1];
      d[i * 4 + 2] = OUTLINE[2];
      d[i * 4 + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

function shadowFor(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(30, 50, 20, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 3, y + h, w / 2 + 2, Math.max(3, h / 7), 0, 0, Math.PI * 2);
  ctx.fill();
}

let spriteLayer = null;

function renderSprites() {
  // Raised things on their own layer so they can share one outline.
  const canvas = document.createElement("canvas");
  canvas.width = W * TILE;
  canvas.height = H * TILE;
  const ctx = canvas.getContext("2d");
  ANCHORS.smoke.length = 0;
  ANCHORS.flags.length = 0;
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const t = GRID[ty][tx];
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (t === "fence") fence(ctx, ox, oy, tx, ty);
      else if (t === "bush") bush(ctx, ox, oy, tx, ty);
      else if (t === "rock") rock(ctx, ox, oy, tx, ty);
      else if (t === "well") well(ctx, ox, oy);
    }
    for (const p of PLACES) {
      if (p.y + p.h - 1 !== ty) continue;
      if (p.style === "notice") notice(ctx, p);
      else if (p.style === "gate") gate(ctx, p);
      else building(ctx, p);
    }
    for (let tx = 0; tx < W; tx++) if (GRID[ty][tx] === "tree" && !(tx >= 12 && tx <= 13 && ty >= 11 && ty <= 12)) tree(ctx, tx * TILE, ty * TILE, tx, ty);
    if (ty === 12) banyan(ctx);
  }
  outline(canvas);
  return canvas;
}

function banyan(ctx) {
  // The banyan over the rachabanda: a raised stone platform where the elders sit.
  const bx = 12 * TILE;
  const by = 11 * TILE;
  px(ctx, bx - 2, by + 14, 36, 16, "#a39c8c");
  px(ctx, bx - 1, by + 13, 34, 14, "#cfc8b6");
  px(ctx, bx, by + 14, 32, 2, "#e6dfcd");
  for (let c = 3; c < 32; c += 7) px(ctx, bx + c, by + 17, 1, 9, "#b9b2a2");
  px(ctx, bx + 9, by + 29, 14, 3, "#b9b2a2");
  px(ctx, bx + 9, by + 29, 14, 1, "#e2dacb");
  px(ctx, bx + 12, by + 2, 9, 20, C.trunk);
  px(ctx, bx + 13, by + 2, 2, 20, "#8a5e34");
  px(ctx, bx + 8, by + 12, 4, 10, C.trunk);
  px(ctx, bx + 21, by + 10, 4, 12, C.trunk);
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y) * 1.3);
      px(ctx, bx + cx - w, by + cy + y, w * 2, 1, color);
    }
  };
  blob(16, -6, 19, C.canopyDark);
  blob(1, -1, 9, C.canopyDark);
  blob(31, -1, 9, C.canopyDark);
  blob(16, -8, 17, C.canopy);
  blob(3, -2, 7, C.canopy);
  blob(29, -2, 7, C.canopy);
  blob(10, -14, 9, C.canopyLight);
  blob(24, -11, 6, C.canopyLight);
  blob(8, -17, 3, C.canopyHi);
  blob(23, -13, 2, C.canopyHi);
  for (const [rx, len] of [[-4, 12], [1, 16], [6, 12], [26, 15], [31, 17], [35, 11]]) px(ctx, bx + rx, by + 6, 1, len, "#7a5432");
}

// The whole static map at native resolution. Two frames (the water moves).
export function renderVillage(frame = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = W * TILE;
  canvas.height = H * TILE;
  const ctx = canvas.getContext("2d");
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const t = GRID[ty][tx];
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (t === "path" || t === "plaza") ground(ctx, ox, oy, tx, ty, t === "plaza");
      else if (t === "water") water(ctx, ox, oy, tx, ty, frame);
      else if (t === "crop") crop(ctx, ox, oy, tx, ty);
      else if (t === "well") px(ctx, ox, oy, TILE, TILE, C.plaza);
      else if (t === "flowers") flowers(ctx, ox, oy, tx, ty);
      else if (t === "building") {
        const obj = PLACES.find((p) => p.style === "notice" && p.x === tx && p.y === ty);
        if (obj) px(ctx, ox, oy, TILE, TILE, C.plaza);
        else grass(ctx, ox, oy, tx, ty);
      } else grass(ctx, ox, oy, tx, ty);
    }
  }
  px(ctx, 12 * TILE, 11 * TILE, 32, 32, C.plaza);
  groundDecals(ctx);
  // Soft shadows under buildings and trees.
  for (const p of PLACES) if (p.style !== "notice" && p.style !== "gate") shadowFor(ctx, p.x * TILE, p.y * TILE + 2, p.w * TILE, p.h * TILE);
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) if (GRID[ty][tx] === "tree") shadowFor(ctx, tx * TILE + 1, ty * TILE + 2, 12, 12);
  if (!spriteLayer) spriteLayer = renderSprites();
  ctx.drawImage(spriteLayer, 0, 0);
  return canvas;
}

// Moving details drawn every frame over the map (camera-relative): chimney smoke, flags,
// butterflies, birds, chickens and a duck.
export function drawAmbient(ctx, now, camX, camY) {
  const t = now / 1000;
  const P = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x - camX), Math.round(y - camY), w, h);
  };
  for (const s of ANCHORS.smoke) {
    for (let i = 0; i < 4; i++) {
      const life = (t * 0.45 + i / 4) % 1;
      const r = 2 + Math.round(life * 4);
      const a = 0.55 * (1 - life);
      const sx = s.x + Math.sin(t * 1.5 + i) * 3 + life * 6;
      const sy = s.y - life * 26;
      P(sx - r, sy - r + 1, r * 2, r * 2 - 2, `rgba(240,240,236,${a})`);
      P(sx - r + 1, sy - r, r * 2 - 2, r * 2, `rgba(240,240,236,${a})`);
    }
  }
  for (const f of ANCHORS.flags) {
    const colors = ["#f29a3a", "#ffffff", "#3d9a4a"];
    for (let c = 0; c < 10; c++) {
      const wave = Math.round(Math.sin(t * 5 - c * 0.7) * (c / 6));
      for (let r = 0; r < 3; r++) P(f.x + c, f.y + r * 2 + wave, 1, 2, colors[r]);
    }
    P(f.x + 4, f.y + 2 + Math.round(Math.sin(t * 5 - 2.8) * 0.6), 2, 2, "#2f4f9e");
  }
  // Butterflies around the flower beds.
  const flies = [
    [7, 9, "#ffd84a"],
    [10, 8, "#ff9ac0"],
    [22, 10, "#ffffff"],
    [30, 9, "#9fd3ef"],
    [9, 18, "#ff9a3c"],
    [33, 19, "#ffd84a"],
  ];
  flies.forEach(([tx, ty, c], i) => {
    const bx = tx * TILE + Math.sin(t * 0.7 + i) * 22 + Math.sin(t * 1.9 + i * 2) * 6;
    const by = ty * TILE + Math.cos(t * 0.9 + i * 1.3) * 10;
    const flap = Math.floor(t * 10 + i) % 2;
    P(bx, by, 1, 2, "#3b2b22");
    if (flap) {
      P(bx - 2, by - 1, 2, 2, c);
      P(bx + 1, by - 1, 2, 2, c);
    } else {
      P(bx - 1, by - 1, 1, 2, c);
      P(bx + 1, by - 1, 1, 2, c);
    }
  });
  // A few birds crossing the sky every 20 seconds.
  const cross = (t % 20) / 20;
  if (cross < 0.6) {
    const bx0 = -40 + (cross / 0.6) * (W * TILE + 80);
    const by0 = 70 + Math.sin(t) * 6;
    for (const [dx, dy] of [[0, 0], [-9, -5], [-9, 5], [-18, -9]]) {
      const flap = Math.floor(t * 6 + dx) % 2;
      P(bx0 + dx - 2, by0 + dy + (flap ? -1 : 0), 2, 1, "#3b2b22");
      P(bx0 + dx + 1, by0 + dy + (flap ? -1 : 0), 2, 1, "#3b2b22");
      P(bx0 + dx, by0 + dy, 1, 1, "#3b2b22");
    }
  }
  // Two chickens pecking in the home yard.
  for (const [hx, hy, i] of [[3 * TILE + 4, 8 * TILE + 2, 0], [7 * TILE + 6, 8 * TILE + 4, 1]]) {
    const walk = Math.sin(t * 0.5 + i * 3) * 6;
    const peck = Math.floor(t * 3 + i) % 3 === 0 ? 1 : 0;
    const x0 = hx + walk;
    P(x0, hy + 2, 6, 4, "#fffaf0");
    P(x0 + 1, hy + 6, 1, 2, "#e8a03a");
    P(x0 + 4, hy + 6, 1, 2, "#e8a03a");
    P(x0 + 5, hy + peck, 3, 3, "#fffaf0");
    P(x0 + 6, hy - 1 + peck, 1, 1, "#e04a3a");
    P(x0 + 8, hy + 1 + peck, 1, 1, "#e8a03a");
    P(x0 + 6, hy + 1 + peck, 1, 1, "#3b2b22");
    P(x0, hy + 2, 1, 2, "#e3d6c0");
  }
  // A duck on the pond.
  const dx0 = 21 * TILE + 14 + Math.sin(t * 0.4) * 10;
  const dy0 = 13 * TILE + 2 + Math.round(Math.sin(t * 2));
  P(dx0, dy0 + 2, 7, 3, "#fffaf0");
  P(dx0 + 5, dy0, 3, 3, "#fffaf0");
  P(dx0 + 8, dy0 + 1, 2, 1, "#f2a03a");
  P(dx0 + 6, dy0 + 1, 1, 1, "#3b2b22");
  P(dx0 - 1, dy0 + 5, 9, 1, "rgba(255,255,255,0.5)");
}

// ---------- characters ----------
// A 16×24 sprite with its feet on the bottom rows. dir: down | up | left | right; frame 0–2.

const SKIN = { warm: "#c98b5e", light: "#d9a072", deep: "#a86f45" };

// The player (see the reference sheet): a curly-haired boy in a striped polo who grows into
// plaid shirts, a beard and finally a lungi; a girl in a pattu langa with bows who grows into a
// half-saree with jasmine in her braid. Teammates and NPCs keep the plain looks.
const plainBoy = (stage) => ({
  skin: SKIN.warm,
  hair: "#2b2420",
  top: { child: "#f08a3c", teen: "#3c8fd0", young: "#f4f4f0", adult: "#6b8f4f", settle: "#a0522d" }[stage] ?? "#f08a3c",
  bottom: stage === "child" ? "#3b4a7a" : "#4a4f5c",
  shoes: "#4a3020",
  size: stage === "child" ? "child" : stage === "teen" ? "teen" : "adult",
});
const plainGirl = (stage) => ({
  skin: SKIN.warm,
  hair: "#2b2420",
  braid: true,
  top: { child: "#e0508a", teen: "#2fa59a", young: "#f2c14e", adult: "#9b59b6", settle: "#d35400" }[stage] ?? "#e0508a",
  bottom: { child: "#f4e3c3", teen: "#f4e3c3", young: "#3b4a7a", adult: "#f4e3c3", settle: "#f4e3c3" }[stage] ?? "#f4e3c3",
  shoes: "#7a3b2e",
  size: stage === "child" ? "child" : stage === "teen" ? "teen" : "adult",
});
const sizeOf = (stage) => (stage === "child" ? "child" : stage === "teen" ? "teen" : "adult");

const BOY = {
  child: { top: "#eef3ea", top2: "#2f8f8a", pattern: "stripes", collar: "#2f8f8a", shortSleeves: true, bottom: "#34446e", shorts: true, socks: "#f4f4f0", shoes: "#3a5a9e" },
  teen: { top: "#e9f1f6", top2: "#3a6fb0", pattern: "stripes", collar: "#3a6fb0", shortSleeves: true, bottom: "#4a6f9e", shoes: "#3a5a9e", socks: "#f4f4f0" },
  young: { top: "#d9772e", top2: "#f2b06a", pattern: "plaid", collar: "#b85e20", bottom: "#4a6f9e", shoes: "#3a5a9e", socks: "#f4f4f0" },
  adult: { top: "#4a78c8", top2: "#9fbde8", pattern: "plaid", collar: "#33589a", bottom: "#4a6f9e", shoes: "#3a5a9e", beard: true },
  settle: { top: "#f1ead2", top2: "#d9cfae", collar: "#d9cfae", skirt: { color: "#4f6fb0", check: "#86a2d8" }, shoes: "#8a5a2c", beard: true },
};
const GIRL = {
  child: { top: "#b8357a", shortSleeves: true, skirt: { color: "#2a9db0", band: "#f2b233", border: "#f08a2c", flare: true }, braid: true, bows: "#d8304a", bindi: true, shoes: "#8a5a2c" },
  teen: { top: "#2a9d8f", shortSleeves: true, skirt: { color: "#2f8f5a", band: "#f2b233", border: "#f08a2c", flare: true }, dupatta: "#e2405e", braid: true, bows: "#d8304a", bindi: true, shoes: "#8a5a2c" },
  young: { top: "#2a9d8f", shortSleeves: true, skirt: { color: "#2fa07a", band: "#f2b233", border: "#f08a2c", flare: true }, dupatta: "#e2405e", longBraid: true, jasmine: true, bindi: true, bangles: true, shoes: "#8a5a2c" },
  adult: { top: "#2a8fb0", shortSleeves: true, skirt: { color: "#2f62b0", band: "#f2b233", border: "#f08a2c", flare: true }, dupatta: "#e2405e", longBraid: true, jasmine: true, bindi: true, bangles: true, shoes: "#8a5a2c" },
  settle: { top: "#2a9d8f", shortSleeves: true, skirt: { color: "#2f9a5a", band: "#f2b233", border: "#f08a2c", flare: true }, dupatta: "#d8304a", longBraid: true, jasmine: true, bindi: true, bangles: true, shoes: "#8a5a2c" },
};

export const LOOKS = {
  boy: (stage) => ({ skin: SKIN.warm, hair: "#241c18", curly: true, smile: true, size: sizeOf(stage), ...(BOY[stage] ?? BOY.child) }),
  girl: (stage) => ({ skin: SKIN.warm, hair: "#241c18", smile: true, size: sizeOf(stage), ...(GIRL[stage] ?? GIRL.child) }),
  granny: () => ({ skin: SKIN.light, hair: "#e8e8e8", bun: true, glasses: "#c0609a", top: "#f07ab4", bottom: "#6b84d8", border: "#f2d14a", saree: true, shoes: "#b8453a", size: "adult" }),
  banker: () => ({ skin: SKIN.warm, hair: "#2b2420", bun: true, top: "#3d9a4a", bottom: "#2f7a3a", saree: true, shoes: "#4a3020", size: "adult" }),
  teacher: () => ({ skin: SKIN.light, hair: "#2b2420", bun: true, glasses: "#5e3c1e", top: "#f2d14a", bottom: "#d35400", saree: true, shoes: "#4a3020", size: "adult" }),
  doctor: () => ({ skin: SKIN.deep, hair: "#2b2420", top: "#ffffff", bottom: "#4a6fa5", shoes: "#3b2b22", coat: true, size: "adult" }),
  shopkeeper: () => ({ skin: SKIN.warm, hair: "#2b2420", bun: true, top: "#e8743c", bottom: "#b8453a", saree: true, shoes: "#4a3020", size: "adult" }),
  lender: () => ({ skin: SKIN.light, hair: "#d8d4cc", top: "#fbf8ef", bottom: "#fbf8ef", shoes: "#c99b2e", mustache: true, gold: true, size: "adult" }),
  clerk: () => ({ skin: SKIN.deep, hair: "#2b2420", top: "#c9e0f2", bottom: "#4a4f5c", shoes: "#3b2b22", mustache: true, size: "adult" }),
  farmer: () => ({ skin: SKIN.deep, hair: "#2b2420", top: "#f4f4f0", bottom: "#f4f4f0", shoes: "#4a3020", turban: "#e7c46d", size: "adult" }),
  worker: () => ({ skin: SKIN.warm, hair: "#2b2420", top: "#5b7fa8", bottom: "#3b4a7a", shoes: "#3b2b22", cap: "#f2d14a", size: "adult" }),
  tempter: () => ({ skin: SKIN.warm, hair: "#1f1a17", top: "#f2d14a", bottom: "#2b2e3a", shoes: "#f4f4f0", sunglasses: true, gold: true, size: "adult" }),
  friend: (stage = "child") => ({ ...plainBoy(stage), top: "#5fb0a5", cap: "#d9824f" }),
  sibling: (stage = "child") => ({ ...plainGirl(stage), top: "#f4a3c0", size: "child" }),
  agent: () => ({ skin: SKIN.light, hair: "#2b2420", top: "#55657d", bottom: "#2b2e3a", shoes: "#1f1a17", tie: "#b9523f", size: "adult" }),
  father: () => ({ skin: SKIN.deep, hair: "#2b2420", top: "#efe9d9", bottom: "#efe9d9", shoes: "#4a3020", turban: "#e7c46d", mustache: true, size: "adult" }),
  mother: () => ({ skin: SKIN.warm, hair: "#1f1a17", bun: true, top: "#7aa37f", bottom: "#c0563b", border: "#f2d14a", saree: true, shoes: "#7a3b2e", size: "adult" }),
  postman: () => ({ skin: SKIN.warm, hair: "#2b2420", top: "#c9a56a", bottom: "#8a6a3e", shoes: "#3b2b22", cap: "#8a6a3e", size: "adult" }),
};

const SIZES = {
  child: { leg: 3, body: 5 },
  teen: { leg: 4, body: 6 },
  adult: { leg: 4, body: 7 },
};

export function drawCharacter(ctx, ox, oy, look, dir = "down", frame = 0) {
  const flip = dir === "right";
  const d = dir === "right" ? "left" : dir;
  const p = (x, y, w, h, color) => {
    if (!color) return;
    const rx = flip ? 16 - x - w : x;
    ctx.fillStyle = color;
    ctx.fillRect(ox + rx, oy + y, w, h);
  };
  const { leg, body } = SIZES[look.size];
  const feet = 21;
  const legTop = feet - leg;
  const bodyTop = legTop - body;
  const head = bodyTop - 8;
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const sk = look.skirt;

  p(4, 22, 8, 2, "rgba(30,40,20,0.3)");
  // Legs, saree or skirt (a skirt keeps the feet stepping).
  if (look.saree) {
    p(4, bodyTop + 3, 8, feet - bodyTop - 3, look.bottom);
    p(4, feet - 1, 8, 1, look.border ?? look.bottom);
    p(5, feet, 2, 1, look.shoes);
    p(9, feet, 2, 1, look.shoes);
  } else if (sk) {
    if (d === "left") {
      p(5 - step, feet, 3, 1, look.shoes);
      p(8 + step, feet, 3, 1, look.shoes);
    } else {
      p(5, feet - (step === 1 ? 1 : 0), 2, 1, look.shoes);
      p(9, feet - (step === -1 ? 1 : 0), 2, 1, look.shoes);
    }
  } else if (d === "left") {
    const front = step === 0 ? 6 : 5 - step;
    const back = step === 0 ? 8 : 9 + step;
    const legColor = look.shorts ? look.skin : look.bottom;
    p(back, legTop, 2, leg, legColor);
    p(front, legTop, 2, leg, legColor);
    if (look.shorts) {
      p(back, legTop, 2, 1, look.bottom);
      p(front, legTop, 2, 1, look.bottom);
    }
    if (look.socks) {
      p(back, feet - 1, 2, 1, look.socks);
      p(front, feet - 1, 2, 1, look.socks);
    }
    p(back, feet, 3, 1, look.shoes);
    p(front - 1, feet, 3, 1, look.shoes);
  } else {
    const l = leg - (step === 1 ? 1 : 0);
    const r = leg - (step === -1 ? 1 : 0);
    const legColor = look.shorts ? look.skin : look.bottom;
    p(5, legTop, 2, l, legColor);
    p(9, legTop, 2, r, legColor);
    if (look.shorts) p(5, legTop, 6, 1, look.bottom);
    if (look.socks) {
      p(5, legTop + l - 1, 2, 1, look.socks);
      p(9, legTop + r - 1, 2, 1, look.socks);
    }
    p(5, feet - (step === 1 ? 1 : 0), 2, 1, look.shoes);
    p(9, feet - (step === -1 ? 1 : 0), 2, 1, look.shoes);
  }
  // Body and arms.
  const bw = d === "left" ? 6 : 8;
  const bx = d === "left" ? 5 : 4;
  p(bx, bodyTop, bw, body + (look.saree ? 0 : 0), look.top);
  if (look.coat) p(bx, bodyTop, bw, body + 2, look.top);
  if (look.pattern === "stripes") for (let y = bodyTop + 1; y < bodyTop + body; y += 2) p(bx, y, bw, 1, look.top2);
  if (look.pattern === "plaid") {
    for (let y = bodyTop + 2; y < bodyTop + body; y += 3) p(bx, y, bw, 1, look.top2);
    for (let x = bx + 1; x < bx + bw; x += 3) p(x, bodyTop, 1, body, look.top2);
  }
  if (look.collar) {
    if (d === "down") {
      p(6, bodyTop, 1, 1, look.collar);
      p(9, bodyTop, 1, 1, look.collar);
      p(7, bodyTop, 2, 1, look.skin);
    } else if (d === "left") p(5, bodyTop, 2, 1, look.collar);
    else p(5, bodyTop, 6, 1, look.collar);
  }
  if (sk) {
    // Langa, half-saree skirt or lungi from the waist down; a langa flares at the hem.
    const waist = bodyTop + 3;
    p(4, waist, 8, feet - waist, sk.color);
    if (sk.flare) p(3, feet - 2, 10, 2, sk.color);
    if (sk.check) {
      for (let x = 5; x < 12; x += 3) p(x, waist, 1, feet - waist, sk.check);
      p(4, waist + 3, 8, 1, sk.check);
    }
    if (sk.band) p(4, waist, 8, 1, sk.band);
    if (sk.border) p(sk.flare ? 3 : 4, feet - 1, sk.flare ? 10 : 8, 1, sk.border);
  }
  if (look.saree) p(d === "left" ? 9 : 10, bodyTop, 2, body, look.bottom);
  if (look.dupatta) {
    if (d === "down") {
      for (let r = 0; r < 4; r++) p(10 - r * 2, bodyTop + r, 3, 1, look.dupatta);
      p(11, bodyTop, 1, 2, look.dupatta);
    } else if (d === "up") p(4, bodyTop, 3, body, look.dupatta);
    else p(9, bodyTop, 2, body + 1, look.dupatta);
  }
  if (look.gold) p(bx + 1, bodyTop + 1, bw - 2, 1, "#e5bf4f");
  const sleeve = look.shortSleeves ? 1 : 4;
  if (d === "left") {
    p(7 + step, bodyTop + 1, 2, 4, look.top);
    if (look.shortSleeves) p(7 + step, bodyTop + 2, 2, 3, look.skin);
    p(7 + step, bodyTop + 5, 2, 1, look.skin);
    if (look.bangles) p(7 + step, bodyTop + 4, 2, 1, "#e5bf4f");
  } else {
    const ly = bodyTop + 1 + (step > 0 ? 1 : 0);
    const ry = bodyTop + 1 + (step < 0 ? 1 : 0);
    p(3, ly, 1, 4, look.skin);
    p(12, ry, 1, 4, look.skin);
    p(3, ly, 1, sleeve, look.top);
    p(12, ry, 1, sleeve, look.top);
    p(3, ly + 4, 1, 1, look.skin);
    p(12, ry + 4, 1, 1, look.skin);
    if (look.bangles) {
      p(3, ly + 3, 1, 1, "#e5bf4f");
      p(12, ry + 3, 1, 1, "#e5bf4f");
    }
    if (look.dupatta && d === "down") p(12, ry, 1, 2, look.dupatta);
  }
  // Head.
  const hx = d === "left" ? 4 : 4;
  p(hx, head, 8, 8, look.skin);
  p(hx - 1, head + 1, 1, 6, "rgba(0,0,0,0.12)");
  if (d === "up") {
    p(3, head - 1, 10, 7, look.hair);
    p(4, head + 6, 8, 1, look.hair);
  } else if (d === "left") {
    p(3, head - 1, 10, 3, look.hair);
    p(8, head + 2, 5, 4, look.hair);
    p(5, head + 4, 1, 2, "#2b2420");
    p(4, head + 6, 1, 1, "#e08a7a");
    if (look.smile) p(4, head + 6, 2, 1, "#9a4a3a");
  } else {
    p(3, head - 1, 10, 3, look.hair);
    p(3, head + 2, 1, 3, look.hair);
    p(12, head + 2, 1, 3, look.hair);
    p(6, head + 4, 1, 2, "#2b2420");
    p(9, head + 4, 1, 2, "#2b2420");
    p(5, head + 6, 1, 1, "#e08a7a");
    p(10, head + 6, 1, 1, "#e08a7a");
    if (look.smile) p(7, head + 6, 2, 1, "#9a4a3a");
    if (look.mustache) p(6, head + 6, 4, 1, look.hair === "#d8d4cc" ? "#f0eee8" : "#2b2420");
  }
  if (look.curly) {
    // Bumpy curls on top and over the ears.
    p(4, head - 2, 2, 1, look.hair);
    p(7, head - 2, 3, 1, look.hair);
    p(11, head - 2, 1, 1, look.hair);
    if (d === "left") {
      p(2, head, 1, 2, look.hair);
      p(13, head + 1, 1, 3, look.hair);
    } else {
      p(2, head, 1, 3, look.hair);
      p(13, head, 1, 3, look.hair);
      if (d === "down") p(5, head + 2, 1, 1, look.hair);
    }
  }
  if (look.beard && d !== "up") {
    if (d === "left") {
      p(5, head + 7, 4, 1, look.hair);
      p(7, head + 6, 1, 1, look.hair);
    } else {
      p(4, head + 5, 1, 3, look.hair);
      p(11, head + 5, 1, 3, look.hair);
      p(5, head + 7, 6, 1, look.hair);
      p(6, head + 6, 1, 1, look.hair);
      p(9, head + 6, 1, 1, look.hair);
    }
  }
  if (look.bindi && d === "down") p(7, head + 3, 1, 1, "#d0302a");
  if (look.bindi && d === "left") p(4, head + 3, 1, 1, "#d0302a");
  if (look.bun) p(d === "left" ? 9 : 6, head - 3, 4, 3, look.hair);
  if (look.braid && d !== "left") {
    p(3, head + 5, 1, 6, look.hair);
    p(12, head + 5, 1, 6, look.hair);
    if (look.bows) {
      p(3, head + 10, 1, 1, look.bows);
      p(12, head + 10, 1, 1, look.bows);
    }
  }
  if (look.braid && d === "left") {
    p(11, head + 5, 2, 7, look.hair);
    if (look.bows) p(11, head + 11, 2, 1, look.bows);
  }
  if (look.longBraid) {
    // One long braid down the back, with jasmine where it starts.
    if (d === "up") {
      p(7, head + 6, 2, body + 4, look.hair);
      if (look.jasmine) {
        p(6, head + 5, 1, 1, "#fbf6e6");
        p(7, head + 4, 2, 1, "#fbf6e6");
        p(9, head + 5, 1, 1, "#fbf6e6");
      }
    } else if (d === "left") {
      p(12, head + 4, 2, body + 4, look.hair);
      if (look.jasmine) {
        p(12, head + 2, 1, 1, "#fbf6e6");
        p(13, head + 3, 1, 1, "#fbf6e6");
      }
    } else {
      p(12, head + 5, 1, 4, look.hair);
      if (look.jasmine) {
        p(12, head + 1, 1, 1, "#fbf6e6");
        p(13, head + 2, 1, 2, "#fbf6e6");
      }
    }
  }
  if (look.turban) p(3, head - 2, 10, 3, look.turban);
  if (look.cap) {
    p(3, head - 2, 10, 2, look.cap);
    if (d === "down") p(4, head, 8, 1, look.cap);
    if (d === "left") p(1, head, 4, 1, look.cap);
  }
  if (look.tie && d === "down") p(7, bodyTop + 1, 2, body - 2, look.tie);
  if (look.sunglasses && d !== "up") {
    if (d === "left") p(3, head + 3, 4, 2, "#141418");
    else {
      p(4, head + 3, 8, 1, "#141418");
      p(4, head + 4, 3, 2, "#141418");
      p(9, head + 4, 3, 2, "#141418");
      p(5, head + 4, 1, 1, "#6c7a8c");
    }
  }
  if (look.glasses && d !== "up") {
    if (d === "left") {
      p(4, head + 3, 3, 3, look.glasses);
      p(5, head + 4, 1, 1, "#2b2420");
    } else {
      p(5, head + 3, 3, 3, look.glasses);
      p(8, head + 3, 3, 3, look.glasses);
      p(6, head + 4, 1, 1, "#2b2420");
      p(9, head + 4, 1, 1, "#2b2420");
    }
  }
}

// A "!" bubble (or a star for the mini-game, a house for "finish the chapter") over a place.
export function drawMarker(ctx, x, y, kind, t) {
  const bob = Math.round(Math.sin(t / 220) * 2);
  const yy = y + bob;
  const fill = kind === "required" ? "#ffd84a" : kind === "special" ? "#c9a7ff" : kind === "home" ? "#9fe08a" : "#fff8e0";
  ctx.fillStyle = "#3b2b22";
  ctx.fillRect(x - 6, yy - 1, 12, 13);
  ctx.fillRect(x - 7, yy, 14, 11);
  ctx.fillStyle = fill;
  ctx.fillRect(x - 5, yy, 10, 11);
  ctx.fillRect(x - 6, yy + 1, 12, 9);
  ctx.fillStyle = "#3b2b22";
  ctx.fillRect(x - 1, yy + 12, 2, 2);
  if (kind === "special") {
    ctx.fillRect(x - 1, yy + 2, 2, 7);
    ctx.fillRect(x - 3, yy + 4, 6, 2);
    ctx.fillRect(x - 2, yy + 7, 1, 2);
    ctx.fillRect(x + 1, yy + 7, 1, 2);
  } else if (kind === "home") {
    ctx.fillRect(x - 3, yy + 5, 6, 4);
    ctx.fillRect(x - 4, yy + 4, 8, 1);
    ctx.fillRect(x - 2, yy + 3, 4, 1);
    ctx.fillRect(x - 1, yy + 2, 2, 1);
  } else {
    ctx.fillRect(x - 1, yy + 2, 2, 5);
    ctx.fillRect(x - 1, yy + 8, 2, 2);
  }
}
