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
  grass(ctx, ox, oy, tx, ty);
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
  grass(ctx, ox, oy, tx, ty);
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
  grass(ctx, ox, oy, tx, ty);
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
  grass(ctx, ox, oy, tx, ty);
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
  grass(ctx, ox, oy, tx, ty);
  px(ctx, ox + 3, oy + 12, 11, 2, C.shadow);
  px(ctx, ox + 3, oy + 7, 10, 6, C.rockDark);
  px(ctx, ox + 4, oy + 6, 8, 6, C.rock);
  px(ctx, ox + 5, oy + 6, 4, 2, C.rockLight);
}

function well(ctx, ox, oy) {
  px(ctx, ox, oy, TILE, TILE, C.plaza);
  px(ctx, ox + 1, oy + 6, 14, 9, "#7d7d7d");
  px(ctx, ox + 2, oy + 7, 12, 6, "#a3a3a3");
  px(ctx, ox + 4, oy + 8, 8, 4, C.waterDeep);
  px(ctx, ox + 1, oy - 6, 2, 13, C.woodDark);
  px(ctx, ox + 13, oy - 6, 2, 13, C.woodDark);
  px(ctx, ox, oy - 8, 16, 3, "#b2533b");
  px(ctx, ox + 7, oy - 5, 2, 8, "#6b6b6b");
}

// ---------- buildings ----------
// Telugu village buildings (see the reference sheet): Mangalore-tile roofs on homes and the shop,
// flat white roofs with parapets (and a black water tank) on the clinic, bank and panchayat, a tin
// roof on the rice mill. Footprints and doors stay where village.js puts them.

const STYLES = {
  home: { wall: "#f3e2b8", wallDark: "#d9c08a", dado: "#b5523b", roof: "tile", sign: null },
  school: { wall: "#f4e7c4", wallDark: "#dccb9c", dado: "#b5523b", roof: "tile", sign: "#2f4f3a" },
  bank: { wall: "#f6f3ea", wallDark: "#d9d3c4", band: "#2f5f9e", roof: "flat", sign: "#e5bf4f" },
  post: { wall: "#f6ead0", wallDark: "#dccaa2", band: "#c8382e", roof: "tile", sign: "#c8382e" },
  shop: { wall: "#e9cf98", wallDark: "#c9a86a", roof: "tile", sign: "#f2c45a" },
  hospital: { wall: "#fbfbf6", wallDark: "#dcdcd2", band: "#2f8f8a", roof: "flat", sign: "#ffffff" },
  sahukar: { wall: "#e8c66a", wallDark: "#c9a44a", dado: "#7a2e38", band: "#7a2e38", roof: "tile", sign: "#e5bf4f" },
  panchayat: { wall: "#f8f6ee", wallDark: "#dad6c8", band: "#5d6b73", roof: "flat", sign: "#fff3d0" },
  work: { wall: "#b9a888", wallDark: "#9a8a6c", roof: "tin", sign: "#f2d14a" },
};
const TILE_ROOF = { base: "#c9643f", dark: "#9a452b", light: "#e08a5a", ridge: "#7e3622" };

function tileRoof(ctx, x, y, w, h) {
  // Rows of half-round tiles with a dark ridge; the top rows step in (a hip roof).
  for (let r = 0; r < h; r++) {
    const inset = Math.max(0, Math.floor((h - r) / 3) - 1);
    const rx = x - 3 + inset;
    const rw = w + 6 - inset * 2;
    px(ctx, rx, y + r, rw, 1, r % 3 === 2 ? TILE_ROOF.dark : TILE_ROOF.base);
    if (r % 3 === 1) for (let c = (r % 6 === 1 ? 0 : 2); c < rw; c += 4) px(ctx, rx + c, y + r, 1, 1, TILE_ROOF.light);
  }
  px(ctx, x + Math.floor(h / 3) + 1, y, w - Math.floor(h / 3) * 2 - 2, 2, TILE_ROOF.ridge);
  px(ctx, x - 3, y + h - 1, w + 6, 2, TILE_ROOF.dark);
  px(ctx, x - 3, y + h + 1, w + 6, 1, "rgba(0,0,0,0.2)");
}

function flatRoof(ctx, x, y, w, h, tank = true) {
  // Concrete roof seen from above: a parapet rim, a lighter deck, and the black water tank.
  px(ctx, x - 2, y, w + 4, h, "#cfc9bb");
  px(ctx, x, y + 2, w, h - 4, "#e9e5da");
  for (let c = 6; c < w; c += 10) px(ctx, x + c, y + 2, 1, h - 4, "#ddd8cb");
  px(ctx, x - 2, y + h - 2, w + 4, 2, "#b9b2a2");
  px(ctx, x - 2, y + h, w + 4, 1, "rgba(0,0,0,0.2)");
  if (tank) {
    const tx = x + w - 14;
    px(ctx, tx, y + 3, 9, 8, "#2b2b2e");
    px(ctx, tx + 1, y + 3, 7, 2, "#4a4a50");
    px(ctx, tx + 3, y + 2, 3, 1, "#2b2b2e");
  }
}

function tinRoof(ctx, x, y, w, h, b) {
  // Corrugated sheets: ridges every 3 px, a few rust patches.
  for (let c = 0; c < w + 6; c++) px(ctx, x - 3 + c, y, 1, h, c % 3 === 0 ? "#8e979f" : c % 3 === 1 ? "#b4bcc3" : "#a2abb3");
  for (let i = 0; i < 6; i++) {
    const rx = x + Math.floor(hash(b.x + i, b.y, 11) * (w - 8));
    const ry = y + 2 + Math.floor(hash(b.x, b.y + i, 12) * (h - 8));
    px(ctx, rx, ry, 4 + (i % 3), 3, i % 2 ? "#a8643a" : "#c07a46");
  }
  px(ctx, x - 3, y + Math.floor(h / 2), w + 6, 1, "#7d858c");
  px(ctx, x - 3, y + h - 1, w + 6, 2, "#6f777e");
  px(ctx, x - 3, y + h + 1, w + 6, 1, "rgba(0,0,0,0.2)");
}

function wall(ctx, x, y, w, h, s) {
  px(ctx, x, y, w, h, s.wall);
  px(ctx, x, y, w, 2, s.wallDark);
  if (s.dado) px(ctx, x, y + h - 5, w, 5, s.dado);
  else px(ctx, x, y + h - 3, w, 3, s.wallDark);
  if (s.band) px(ctx, x, y + 2, w, 3, s.band);
}

function windowAt(ctx, x, y, w = 10, h = 9, glass = "#3b3a3c") {
  // Barred village windows: dark inside, wooden frame, vertical grille, a sill.
  px(ctx, x - 1, y - 1, w + 2, h + 2, "#6e4526");
  px(ctx, x, y, w, h, glass);
  for (let c = 2; c < w; c += 3) px(ctx, x + c, y, 1, h, "#8a8f94");
  px(ctx, x - 2, y + h + 1, w + 4, 1, "#c9b68a");
}

function doorAt(ctx, cx, bottom, color = "#7a4a2a", w = 10, h = 14) {
  const x = cx - Math.floor(w / 2);
  px(ctx, x - 1, bottom - h - 1, w + 2, h + 1, "#4a2d18");
  px(ctx, x, bottom - h, w, h, color);
  px(ctx, x + Math.floor(w / 2), bottom - h, 1, h, "rgba(0,0,0,0.25)");
  px(ctx, x + 1, bottom - h + 1, w - 2, 1, "rgba(255,255,255,0.25)");
  px(ctx, x + w - 3, bottom - Math.floor(h / 2), 1, 2, "#f2d14a");
  // Stone step.
  px(ctx, x - 3, bottom, w + 6, 2, "#b3aa9a");
  px(ctx, x - 3, bottom, w + 6, 1, "#cfc7b6");
}

function kolam(ctx, cx, y) {
  // A small white rangoli dot pattern on the ground before the door.
  for (const [dx, dy] of [[-4, 0], [0, -1], [4, 0], [-2, 2], [2, 2], [0, 3], [-6, 2], [6, 2]]) px(ctx, cx + dx, y + dy, 1, 1, "#fbf8ef");
  px(ctx, cx - 1, y + 1, 3, 1, "#f2c4d8");
}

function plaque(ctx, cx, y, color, icon) {
  px(ctx, cx - 9, y - 1, 18, 9, "#4a2d18");
  px(ctx, cx - 8, y, 16, 7, color);
  icon?.(cx, y);
}

function flag(ctx, x, y, h = 22) {
  px(ctx, x, y, 1, h, "#d9d9d9");
  px(ctx, x - 1, y + h - 1, 3, 1, "#8d8d8d");
  px(ctx, x + 1, y, 8, 2, "#f29a3a");
  px(ctx, x + 1, y + 2, 8, 2, "#ffffff");
  px(ctx, x + 1, y + 4, 8, 2, "#3d9a4a");
  px(ctx, x + 4, y + 2, 2, 2, "#2f4f9e");
}

function sack(ctx, x, y) {
  px(ctx, x, y + 1, 6, 6, "#e3d3a8");
  px(ctx, x + 1, y, 4, 2, "#cdb98a");
  px(ctx, x, y + 6, 6, 1, "#b8a374");
}

function barrel(ctx, x, y) {
  px(ctx, x, y, 7, 8, "#8a5a2c");
  px(ctx, x + 1, y, 5, 1, "#b07a42");
  px(ctx, x, y + 2, 7, 1, "#4a2d18");
  px(ctx, x, y + 6, 7, 1, "#4a2d18");
}

const ICONS = {
  bank: (ctx) => (cx, y) => {
    // ₹
    px(ctx, cx - 3, y + 1, 6, 1, "#5e3c1e");
    px(ctx, cx - 3, y + 3, 6, 1, "#5e3c1e");
    px(ctx, cx - 1, y + 2, 2, 1, "#5e3c1e");
    px(ctx, cx - 2, y + 4, 2, 1, "#5e3c1e");
    px(ctx, cx, y + 5, 2, 1, "#5e3c1e");
  },
  hospital: (ctx) => (cx, y) => {
    px(ctx, cx - 1, y + 1, 3, 5, "#d0453a");
    px(ctx, cx - 3, y + 2, 7, 3, "#d0453a");
  },
  school: (ctx) => (cx, y) => {
    // A blackboard with chalk lines.
    px(ctx, cx - 5, y + 2, 4, 1, "#f4f4f0");
    px(ctx, cx - 5, y + 4, 7, 1, "#f4f4f0");
    px(ctx, cx + 3, y + 2, 2, 3, "#f2d14a");
  },
  post: (ctx) => (cx, y) => {
    px(ctx, cx - 5, y + 1, 10, 5, "#fff3d0");
    px(ctx, cx - 4, y + 2, 2, 1, "#c8382e");
    px(ctx, cx + 2, y + 2, 2, 1, "#c8382e");
    px(ctx, cx - 2, y + 3, 4, 1, "#c8382e");
  },
  shop: (ctx) => (cx, y) => {
    px(ctx, cx - 6, y + 2, 12, 1, "#93402c");
    px(ctx, cx - 6, y + 4, 9, 1, "#93402c");
  },
  sahukar: (ctx) => (cx, y) => {
    px(ctx, cx - 5, y + 2, 4, 4, "#f7e08a");
    px(ctx, cx + 1, y + 2, 4, 4, "#f7e08a");
    px(ctx, cx - 4, y + 3, 2, 2, "#c99b2e");
    px(ctx, cx + 2, y + 3, 2, 2, "#c99b2e");
  },
  panchayat: (ctx) => (cx, y) => {
    px(ctx, cx - 6, y + 2, 12, 1, "#5d6b73");
    px(ctx, cx - 6, y + 4, 8, 1, "#5d6b73");
  },
  work: (ctx) => (cx, y) => {
    // A rice sack.
    px(ctx, cx - 3, y + 1, 6, 5, "#f4ead0");
    px(ctx, cx - 1, y + 3, 2, 1, "#c99b2e");
  },
};

function building(ctx, b) {
  const s = STYLES[b.style];
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const roofH = Math.round(h * (s.roof === "flat" ? 0.36 : b.style === "work" ? 0.42 : 0.48));
  const wallY = y + roofH;
  const wallH = h - roofH;
  const doorX = b.door.x * TILE + 8;
  const bottom = y + h - 1;
  px(ctx, x + 2, y + h - 2, w, 4, C.shadow);
  // Raised plinth under the walls.
  px(ctx, x, bottom - 2, w, 3, "#a79c88");
  px(ctx, x, bottom - 2, w, 1, "#c4bba6");
  wall(ctx, x + 2, wallY, w - 4, wallH - 3, s);

  // Windows either side of the door (not on the open shop front or the mill).
  if (b.style !== "shop" && b.style !== "work") {
    const winY = wallY + Math.max(6, Math.floor(wallH / 2) - 5);
    for (const off of [-1, 1]) {
      for (let k = 1; k <= Math.floor((w / 2 - 14) / 18); k++) {
        const wx = doorX + off * (6 + k * 16) - (off < 0 ? 10 : 0) + (off < 0 ? 6 : -6);
        if (wx < x + 5 || wx + 10 > x + w - 5) continue;
        windowAt(ctx, wx, winY, 10, 8, b.style === "sahukar" ? "#5a2a30" : "#3b3a3c");
        if (b.style === "home") {
          px(ctx, wx - 1, winY + 10, 12, 2, "#8a5a2c");
          px(ctx, wx, winY + 9, 2, 1, "#e0504a");
          px(ctx, wx + 5, winY + 9, 2, 1, "#f2d14a");
          px(ctx, wx + 8, winY + 9, 2, 1, "#f08ac0");
        }
      }
    }
  }

  // Style details on the walls.
  if (b.style === "home" || b.style === "sahukar") {
    // Verandah posts along the front.
    for (let i = 0; i < 4; i++) {
      const cx = x + 4 + Math.round((i * (w - 11)) / 3);
      if (Math.abs(cx + 1 - doorX) < 8) continue;
      px(ctx, cx, wallY, 3, wallH - 3, b.style === "sahukar" ? "#f4ead0" : "#8a5a2c");
      px(ctx, cx, wallY, 1, wallH - 3, b.style === "sahukar" ? "#ffffff" : "#b07a42");
    }
  }
  if (b.style === "bank") {
    for (let i = 0; i < 4; i++) {
      const cx = x + 8 + Math.round((i * (w - 22)) / 3);
      if (Math.abs(cx + 2 - doorX) < 9) continue;
      px(ctx, cx, wallY + 6, 4, wallH - 9, "#ffffff");
      px(ctx, cx + 3, wallY + 6, 1, wallH - 9, "#d8d2c4");
    }
  }
  if (b.style === "shop") {
    // Open stall: a dark front with packets hanging in rows, a counter, sacks and barrels.
    const sx = x + 5;
    const sw = w - 10;
    const sy = wallY + 3;
    const sh = wallH - 10;
    px(ctx, sx, sy, sw, sh, "#3b2b22");
    const packets = ["#e0504a", "#f2d14a", "#3d9a4a", "#3b6ea5", "#f08a3c", "#e04a8a"];
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < sw - 2; c += 3) {
        if (Math.abs(sx + c - doorX) < 7) continue;
        px(ctx, sx + 1 + c, sy + 1 + r * 5, 2, 3, packets[(c / 3 + r * 2) % packets.length]);
      }
    px(ctx, sx - 1, sy + sh - 3, sw + 2, 3, "#b07a42");
    px(ctx, sx - 1, sy + sh - 3, sw + 2, 1, "#d39a5a");
    for (let c = 2; c < sw - 4; c += 6) if (Math.abs(sx + c - doorX) >= 8) px(ctx, sx + c, sy + sh - 6, 4, 3, "#e3d3a8");
    sack(ctx, x + 2, bottom - 9);
    sack(ctx, x + 7, bottom - 8);
    barrel(ctx, x + w - 10, bottom - 10);
  }
  if (b.style === "hospital") {
    // A big red cross on the wall and a little sign post by the door.
    const cx = x + 12;
    px(ctx, cx - 1, wallY + 8, 4, 10, "#d0453a");
    px(ctx, cx - 4, wallY + 11, 10, 4, "#d0453a");
    px(ctx, x + w - 10, bottom - 14, 1, 12, "#8d8d8d");
    px(ctx, x + w - 13, bottom - 18, 7, 6, "#ffffff");
    px(ctx, x + w - 10, bottom - 17, 1, 4, "#d0453a");
    px(ctx, x + w - 12, bottom - 16, 5, 2, "#d0453a");
  }
  if (b.style === "panchayat") {
    // The name board across the top of the wall.
    px(ctx, x + 6, wallY + 1, w - 12, 7, "#4a5860");
    px(ctx, x + 8, wallY + 3, w - 16, 1, "#e9e5da");
    px(ctx, x + 8, wallY + 5, w - 24, 1, "#c9c4b6");
  }
  if (b.style === "work") {
    // Open side: the huller with its green hopper, and sacks piled outside.
    px(ctx, x + 4, wallY + 2, 20, wallH - 7, "#4a3f33");
    px(ctx, x + 8, wallY + 4, 10, 6, "#4f8a4a");
    px(ctx, x + 10, wallY + 10, 6, 8, "#3f6f3c");
    px(ctx, x + 6, wallY + 18, 14, 3, "#6b6b6b");
    sack(ctx, x + w - 16, bottom - 9);
    sack(ctx, x + w - 10, bottom - 9);
    sack(ctx, x + w - 13, bottom - 15);
  }
  if (b.style === "post") {
    px(ctx, x + 4, wallY + 7, w - 8, 2, "#f2d14a");
  }

  // Roofs.
  if (s.roof === "tile") tileRoof(ctx, x, y, w, roofH);
  else if (s.roof === "flat") flatRoof(ctx, x, y, w, roofH, b.style !== "bank");
  else tinRoof(ctx, x, y, w, roofH, b);

  if (b.style === "home") {
    // A little side lean-to and a clay pot by the door.
    px(ctx, x + w - 8, wallY + wallH - 12, 6, 7, "#b5523b");
    px(ctx, x + w - 7, wallY + wallH - 13, 4, 1, "#93402c");
  }
  if (b.style === "school") {
    flag(ctx, x + w - 8, y - 20);
    const cx = x + Math.floor(w / 2);
    // A small bell arch on the ridge.
    px(ctx, cx - 3, y - 6, 6, 7, "#f4e7c4");
    px(ctx, cx - 4, y - 7, 8, 2, TILE_ROOF.ridge);
    px(ctx, cx - 1, y - 4, 2, 3, "#e5bf4f");
  }
  if (b.style === "panchayat") flag(ctx, x + 4, y - 16, 26);
  if (b.style === "sahukar") px(ctx, x - 3, y + roofH - 4, w + 6, 2, "#e5bf4f");
  if (b.style === "work") {
    px(ctx, x + w - 12, y - 14, 6, roofH + 6, "#9a5a3c");
    px(ctx, x + w - 13, y - 16, 8, 3, "#6e3a2b");
  }

  // Sign above the door, then the door, then a kolam at the step.
  if (s.sign) plaque(ctx, doorX, wallY + (b.style === "panchayat" ? 10 : 4), s.sign, ICONS[b.style]?.(ctx));
  const doorColor = { bank: "#2f5f9e", hospital: "#2f8f8a", sahukar: "#5e2a33", panchayat: "#6b5a4a", work: "#5e4a34" }[b.style] ?? "#7a4a2a";
  doorAt(ctx, doorX, bottom - 2, doorColor, b.style === "work" ? 14 : 10, b.style === "shop" ? 12 : 14);
  if (b.style === "home" || b.style === "sahukar") kolam(ctx, doorX, bottom + 4);
  if (b.style === "post") {
    px(ctx, doorX + 12, bottom - 13, 6, 11, "#c8382e");
    px(ctx, doorX + 13, bottom - 11, 4, 1, "#3b2b22");
    px(ctx, doorX + 11, bottom - 14, 8, 2, "#9a2c24");
  }
}

function notice(ctx, o) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  px(ctx, x, y, TILE, TILE, C.plaza);
  px(ctx, x + 2, y + 3, 2, 13, C.woodDark);
  px(ctx, x + 12, y + 3, 2, 13, C.woodDark);
  px(ctx, x, y - 4, 16, 11, C.wood);
  px(ctx, x + 1, y - 3, 14, 9, C.woodLight);
  px(ctx, x + 2, y - 2, 5, 4, "#fff8e0");
  px(ctx, x + 8, y - 1, 6, 5, "#f7e08a");
  px(ctx, x + 3, y + 3, 4, 2, "#f2c4d8");
}

function gate(ctx, o) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  grass(ctx, x, y, o.x, o.y);
  px(ctx, x, y + 4, 2, 12, C.woodDark);
  px(ctx, x + 14, y + 4, 2, 12, C.woodDark);
  for (let i = 0; i < 3; i++) px(ctx, x + 2, y + 5 + i * 4, 12, 2, C.woodLight);
  px(ctx, x + 2, y + 5, 12, 12, "rgba(0,0,0,0)");
  // A scarecrow in the field behind.
  px(ctx, x + 7, y - 18, 2, 16, C.woodDark);
  px(ctx, x + 2, y - 14, 12, 2, C.woodDark);
  px(ctx, x + 5, y - 24, 6, 6, "#f2d79a");
  px(ctx, x + 3, y - 26, 10, 3, "#a8743e");
  px(ctx, x + 4, y - 13, 8, 7, "#d0453a");
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
      else if (t === "building") px(ctx, ox, oy, TILE, TILE, C.grassDark);
      else if (t === "well") px(ctx, ox, oy, TILE, TILE, C.plaza);
      else grass(ctx, ox, oy, tx, ty);
    }
  }
  // Raised things, top to bottom so lower ones overlap upper ones.
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const t = GRID[ty][tx];
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (t === "fence") fence(ctx, ox, oy, tx, ty);
      else if (t === "flowers") flowers(ctx, ox, oy, tx, ty);
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
    for (let tx = 0; tx < W; tx++) if (GRID[ty][tx] === "tree") tree(ctx, tx * TILE, ty * TILE, tx, ty);
  }
  // The banyan over the rachabanda: a raised stone platform where the elders sit.
  const bx = 12 * TILE;
  const by = 11 * TILE;
  px(ctx, bx, by, 32, 32, C.plaza);
  px(ctx, bx - 1, by + 14, 34, 18, "#8d8678");
  px(ctx, bx, by + 13, 32, 16, "#b9b2a2");
  px(ctx, bx + 1, by + 14, 30, 2, "#d3ccbb");
  for (let c = 4; c < 32; c += 8) px(ctx, bx + c, by + 16, 1, 13, "#a39c8c");
  px(ctx, bx + 10, by + 29, 12, 3, "#a39c8c");
  px(ctx, bx + 10, by + 29, 12, 1, "#cfc7b6");
  px(ctx, bx + 4, by + 26, 24, 2, C.shadow);
  px(ctx, bx + 12, by + 4, 8, 20, C.trunk);
  px(ctx, bx + 13, by + 4, 2, 20, "#80562f");
  px(ctx, bx + 9, by + 14, 3, 10, C.trunk);
  px(ctx, bx + 20, by + 12, 3, 12, C.trunk);
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y) * 1.25);
      px(ctx, bx + cx - w, by + cy + y, w * 2, 1, color);
    }
  };
  blob(16, -4, 19, C.canopyDark);
  blob(2, 0, 9, C.canopyDark);
  blob(30, 0, 9, C.canopyDark);
  blob(16, -6, 17, C.canopy);
  blob(4, -1, 7, C.canopy);
  blob(28, -1, 7, C.canopy);
  blob(10, -12, 9, C.canopyLight);
  blob(24, -9, 5, C.canopyLight);
  blob(8, -15, 3, C.canopyHi);
  // Aerial roots hanging from the canopy.
  for (const [rx, len] of [[-4, 12], [1, 16], [6, 13], [26, 15], [31, 17], [35, 11], [22, 9]]) px(ctx, bx + rx, by + 6, 1, len, "#7a5432");
  return canvas;
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
