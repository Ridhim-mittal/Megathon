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

function tree(ctx, ox, oy, tx, ty) {
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

const STYLES = {
  home: { wall: "#f0dcae", wallDark: "#d8bf8a", roof: "#c0563b", roofDark: "#93402c", pattern: "plaster", sign: null },
  school: { wall: "#c9634a", wallDark: "#a54d38", roof: "#5b7fa8", roofDark: "#46658a", pattern: "brick", sign: "#f2e3b3" },
  bank: { wall: "#ebe6da", wallDark: "#cfc7b6", roof: "#3b6e75", roofDark: "#2c545a", pattern: "stone", sign: "#e5bf4f" },
  post: { wall: "#f3e2c0", wallDark: "#d9c39a", roof: "#d0453a", roofDark: "#a5352c", pattern: "plaster", sign: "#d0453a" },
  shop: { wall: "#f2c45a", wallDark: "#d6a63e", roof: "#7aa05b", roofDark: "#5d8043", pattern: "planks", sign: "#fff3d0" },
  hospital: { wall: "#f8f8f4", wallDark: "#dadad2", roof: "#7cb3d9", roofDark: "#5c93ba", pattern: "plaster", sign: "#ffffff" },
  sahukar: { wall: "#8e3b46", wallDark: "#6e2c36", roof: "#4b3a5e", roofDark: "#36294a", pattern: "plaster", sign: "#e5bf4f" },
  panchayat: { wall: "#f4e6a8", wallDark: "#d8c784", roof: "#b9663d", roofDark: "#934e2e", pattern: "plaster", sign: "#5c7a55" },
  work: { wall: "#a8a29a", wallDark: "#8a847c", roof: "#6f7780", roofDark: "#545b63", pattern: "brick", sign: "#f2d14a" },
};

function roof(ctx, x, y, w, h, s, { flat = false } = {}) {
  // Eaves overhang by 2 px; shingle rows every 3 px; darker lower edge.
  for (let r = 0; r < h; r++) {
    const inset = flat ? 0 : Math.max(0, Math.floor((h - r) / 3) - 1);
    const color = r % 3 === 2 ? s.roofDark : s.roof;
    px(ctx, x - 2 + inset, y + r, w + 4 - inset * 2, 1, color);
  }
  px(ctx, x - 2, y + h - 1, w + 4, 2, s.roofDark);
  px(ctx, x - 2, y + h + 1, w + 4, 1, "rgba(0,0,0,0.18)");
}

function wall(ctx, x, y, w, h, s) {
  px(ctx, x, y, w, h, s.wall);
  if (s.pattern === "brick") {
    for (let r = 0; r < h; r += 4) {
      px(ctx, x, y + r, w, 1, s.wallDark);
      for (let c = (r / 4) % 2 ? 0 : 4; c < w; c += 8) px(ctx, x + c, y + r, 1, 4, s.wallDark);
    }
  } else if (s.pattern === "planks") {
    for (let c = 0; c < w; c += 5) px(ctx, x + c, y, 1, h, s.wallDark);
  } else if (s.pattern === "stone") {
    for (let r = 0; r < h; r += 6) px(ctx, x, y + r, w, 1, s.wallDark);
  } else {
    px(ctx, x, y + h - 3, w, 3, s.wallDark);
  }
}

function windowAt(ctx, x, y, w = 10, h = 9, glass = "#9fd3ef") {
  px(ctx, x - 1, y - 1, w + 2, h + 2, "#5e3c1e");
  px(ctx, x, y, w, h, glass);
  px(ctx, x, y, w, 2, "#d8f0fb");
  px(ctx, x + Math.floor(w / 2), y, 1, h, "#5e3c1e");
  px(ctx, x, y + Math.floor(h / 2), w, 1, "#5e3c1e");
}

function doorAt(ctx, cx, bottom, color = "#7a4a2a", w = 10, h = 14) {
  const x = cx - Math.floor(w / 2);
  px(ctx, x - 1, bottom - h - 1, w + 2, h + 1, "#4a2d18");
  px(ctx, x, bottom - h, w, h, color);
  px(ctx, x + 1, bottom - h + 1, w - 2, 1, "rgba(255,255,255,0.25)");
  px(ctx, x + w - 3, bottom - Math.floor(h / 2), 1, 2, "#f2d14a");
  px(ctx, x - 2, bottom, w + 4, 2, "#a7a198");
}

function plaque(ctx, cx, y, color, icon) {
  px(ctx, cx - 9, y - 1, 18, 9, "#4a2d18");
  px(ctx, cx - 8, y, 16, 7, color);
  icon?.(cx, y);
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
    px(ctx, cx - 5, y + 2, 4, 4, "#3b6ea5");
    px(ctx, cx + 1, y + 2, 4, 4, "#3b6ea5");
    px(ctx, cx - 1, y + 2, 1, 4, "#5e3c1e");
  },
  post: (ctx) => (cx, y) => {
    px(ctx, cx - 5, y + 1, 10, 5, "#fff3d0");
    px(ctx, cx - 4, y + 2, 2, 1, "#d0453a");
    px(ctx, cx + 2, y + 2, 2, 1, "#d0453a");
    px(ctx, cx - 2, y + 3, 4, 1, "#d0453a");
  },
  shop: (ctx) => (cx, y) => {
    px(ctx, cx - 4, y + 3, 8, 3, "#b07a42");
    px(ctx, cx - 3, y + 1, 1, 2, "#b07a42");
    px(ctx, cx + 2, y + 1, 1, 2, "#b07a42");
  },
  sahukar: (ctx) => (cx, y) => {
    px(ctx, cx - 5, y + 2, 4, 4, "#f7e08a");
    px(ctx, cx + 1, y + 2, 4, 4, "#f7e08a");
    px(ctx, cx - 4, y + 3, 2, 2, "#c99b2e");
    px(ctx, cx + 2, y + 3, 2, 2, "#c99b2e");
  },
  panchayat: (ctx) => (cx, y) => {
    px(ctx, cx - 4, y + 1, 8, 2, "#f29a3a");
    px(ctx, cx - 4, y + 3, 8, 2, "#ffffff");
    px(ctx, cx - 4, y + 5, 8, 2, "#3d9a4a");
  },
  work: (ctx) => (cx, y) => {
    px(ctx, cx - 3, y + 1, 6, 5, "#5e3c1e");
    px(ctx, cx - 1, y + 2, 2, 3, "#f2d14a");
  },
};

function building(ctx, b) {
  const s = STYLES[b.style];
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const roofH = Math.round(h * (b.style === "work" ? 0.38 : 0.46));
  const wallY = y + roofH;
  const wallH = h - roofH;
  const doorX = b.door.x * TILE + 8;
  px(ctx, x + 2, y + h - 2, w, 4, C.shadow);
  wall(ctx, x + 2, wallY, w - 4, wallH - 1, s);

  // Windows either side of the door.
  const winY = wallY + Math.max(4, Math.floor(wallH / 2) - 6);
  const glass = b.style === "sahukar" ? "#f7e08a" : "#9fd3ef";
  for (const off of [-1, 1]) {
    for (let k = 1; k <= Math.floor((w / 2 - 14) / 18); k++) {
      const wx = doorX + off * (6 + k * 16) - (off < 0 ? 10 : 0) + (off < 0 ? 6 : -6);
      if (wx < x + 4 || wx + 10 > x + w - 4) continue;
      windowAt(ctx, wx, winY, 10, 9, glass);
      if (b.style === "home" || b.style === "post") {
        px(ctx, wx - 1, winY + 10, 12, 2, "#8a5a2c");
        px(ctx, wx, winY + 9, 2, 1, "#e0504a");
        px(ctx, wx + 5, winY + 9, 2, 1, "#f2d14a");
        px(ctx, wx + 8, winY + 9, 2, 1, "#f08ac0");
      }
    }
  }

  // Style details in front of the wall.
  if (b.style === "bank") {
    for (let i = 0; i < 4; i++) {
      const cx = x + 8 + Math.round((i * (w - 22)) / 3);
      if (Math.abs(cx + 2 - doorX) < 9) continue;
      px(ctx, cx, wallY + 2, 5, wallH - 4, "#ffffff");
      px(ctx, cx + 3, wallY + 2, 2, wallH - 4, "#d8d2c4");
      px(ctx, cx - 1, wallY + 1, 7, 2, "#cfc7b6");
    }
  }
  if (b.style === "shop") {
    for (let i = 0; i < w - 2; i += 6) {
      px(ctx, x + 1 + i, wallY - 1, 3, 7, "#d0453a");
      px(ctx, x + 4 + i, wallY - 1, 3, 7, "#fff3d0");
    }
    px(ctx, x + 1, wallY + 6, w - 2, 1, "#93402c");
    // Sacks and a crate by the door.
    px(ctx, x + 5, y + h - 8, 7, 7, "#d8c28e");
    px(ctx, x + 6, y + h - 9, 5, 2, "#bfa36e");
    px(ctx, x + w - 13, y + h - 9, 9, 8, "#a8743e");
    px(ctx, x + w - 13, y + h - 6, 9, 1, "#7a5228");
  }
  if (b.style === "hospital") {
    px(ctx, x + 3, wallY + 2, w - 6, 3, "#d0453a");
  }
  if (b.style === "work") {
    px(ctx, x + w - 18, y - 12, 8, roofH + 12, "#8a4b38");
    px(ctx, x + w - 19, y - 14, 10, 3, "#6e3a2b");
  }
  if (b.style === "sahukar") {
    px(ctx, x + 2, wallY + Math.floor(wallH / 2) - 2, w - 4, 2, "#e5bf4f");
  }

  // Roof (with a few style extras on top).
  roof(ctx, x, y, w, roofH, s, { flat: b.style === "bank" || b.style === "hospital" || b.style === "work" });
  if (b.style === "work") {
    for (let i = 0; i < w; i += 14) {
      px(ctx, x + i, y + 2, 7, roofH - 4, s.roofDark);
      px(ctx, x + i, y + 2, 1, roofH - 4, "#9aa2ab");
    }
  }
  if (b.style === "home") {
    px(ctx, x + w - 16, y - 4, 6, 10, "#8a4b38");
    px(ctx, x + w - 17, y - 5, 8, 2, "#6e3a2b");
  }
  if (b.style === "school") {
    const cx = x + Math.floor(w / 2);
    px(ctx, cx - 6, y - 10, 12, 12, "#c9634a");
    px(ctx, cx - 8, y - 13, 16, 4, s.roofDark);
    px(ctx, cx - 2, y - 7, 4, 5, "#e5bf4f");
    px(ctx, x + w - 6, y - 18, 1, 22, "#5e3c1e");
    px(ctx, x + w - 5, y - 18, 7, 2, "#f29a3a");
    px(ctx, x + w - 5, y - 16, 7, 2, "#ffffff");
    px(ctx, x + w - 5, y - 14, 7, 2, "#3d9a4a");
  }
  if (b.style === "panchayat") {
    px(ctx, x + 4, y - 16, 1, 22, "#5e3c1e");
    px(ctx, x + 5, y - 16, 7, 2, "#f29a3a");
    px(ctx, x + 5, y - 14, 7, 2, "#ffffff");
    px(ctx, x + 5, y - 12, 7, 2, "#3d9a4a");
  }
  if (b.style === "sahukar") {
    px(ctx, x - 2, y + roofH - 4, w + 4, 2, "#e5bf4f");
  }

  // Sign above the door, then the door.
  if (s.sign) plaque(ctx, doorX, wallY + 2, s.sign, ICONS[b.style]?.(ctx));
  doorAt(ctx, doorX, y + h - 1, b.style === "bank" ? "#3b6e75" : b.style === "hospital" ? "#7cb3d9" : b.style === "sahukar" ? "#5e2a33" : "#7a4a2a", b.style === "work" ? 14 : 10);
  if (b.style === "post") {
    px(ctx, doorX + 12, y + h - 12, 6, 11, "#d0453a");
    px(ctx, doorX + 13, y + h - 10, 4, 1, "#3b2b22");
    px(ctx, doorX + 11, y + h - 13, 8, 2, "#a5352c");
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
  // The banyan: one big tree over its 2×2 footprint.
  const bx = 12 * TILE;
  const by = 11 * TILE;
  px(ctx, bx, by, 32, 32, C.plaza);
  px(ctx, bx + 4, by + 26, 24, 5, C.shadow);
  px(ctx, bx + 12, by + 10, 8, 20, C.trunk);
  px(ctx, bx + 8, by + 18, 2, 12, C.trunk);
  px(ctx, bx + 22, by + 16, 2, 14, C.trunk);
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y) * 1.25);
      px(ctx, bx + cx - w, by + cy + y, w * 2, 1, color);
    }
  };
  blob(16, 4, 15, C.canopyDark);
  blob(16, 2, 14, C.canopy);
  blob(11, -2, 8, C.canopyLight);
  blob(9, -5, 3, C.canopyHi);
  return canvas;
}

// ---------- characters ----------
// A 16×24 sprite with its feet on the bottom rows. dir: down | up | left | right; frame 0–2.

const SKIN = { warm: "#c98b5e", light: "#d9a072", deep: "#a86f45" };

export const LOOKS = {
  boy: (stage) => ({
    skin: SKIN.warm,
    hair: "#2b2420",
    top: { child: "#f08a3c", teen: "#3c8fd0", young: "#f4f4f0", adult: "#6b8f4f", settle: "#a0522d" }[stage] ?? "#f08a3c",
    bottom: stage === "child" ? "#3b4a7a" : "#4a4f5c",
    shoes: "#4a3020",
    size: stage === "child" ? "child" : stage === "teen" ? "teen" : "adult",
  }),
  girl: (stage) => ({
    skin: SKIN.warm,
    hair: "#2b2420",
    braid: true,
    top: { child: "#e0508a", teen: "#2fa59a", young: "#f2c14e", adult: "#9b59b6", settle: "#d35400" }[stage] ?? "#e0508a",
    bottom: { child: "#f4e3c3", teen: "#f4e3c3", young: "#3b4a7a", adult: "#f4e3c3", settle: "#f4e3c3" }[stage] ?? "#f4e3c3",
    shoes: "#7a3b2e",
    size: stage === "child" ? "child" : stage === "teen" ? "teen" : "adult",
  }),
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
  friend: (stage = "child") => ({ ...LOOKS.boy(stage), top: "#5fb0a5", cap: "#d9824f" }),
  sibling: (stage = "child") => ({ ...LOOKS.girl(stage), top: "#f4a3c0", size: "child" }),
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

  p(4, 22, 8, 2, "rgba(30,40,20,0.3)");
  // Legs or saree.
  if (look.saree) {
    p(4, bodyTop + 3, 8, feet - bodyTop - 3, look.bottom);
    p(4, feet - 1, 8, 1, look.border ?? look.bottom);
    p(5, feet, 2, 1, look.shoes);
    p(9, feet, 2, 1, look.shoes);
  } else if (d === "left") {
    const front = step === 0 ? 6 : 5 - step;
    const back = step === 0 ? 8 : 9 + step;
    p(back, legTop, 2, leg, look.bottom);
    p(back, feet, 3, 1, look.shoes);
    p(front, legTop, 2, leg, look.bottom);
    p(front - 1, feet, 3, 1, look.shoes);
  } else {
    p(5, legTop, 2, leg - (step === 1 ? 1 : 0), look.bottom);
    p(9, legTop, 2, leg - (step === -1 ? 1 : 0), look.bottom);
    p(5, feet - (step === 1 ? 1 : 0), 2, 1, look.shoes);
    p(9, feet - (step === -1 ? 1 : 0), 2, 1, look.shoes);
  }
  // Body and arms.
  const bw = d === "left" ? 6 : 8;
  const bx = d === "left" ? 5 : 4;
  p(bx, bodyTop, bw, body + (look.saree ? 0 : 0), look.top);
  if (look.coat) p(bx, bodyTop, bw, body + 2, look.top);
  if (look.saree) p(d === "left" ? 9 : 10, bodyTop, 2, body, look.bottom);
  if (look.gold) p(bx + 1, bodyTop + 1, bw - 2, 1, "#e5bf4f");
  if (d === "left") {
    p(7 + step, bodyTop + 1, 2, 4, look.top);
    p(7 + step, bodyTop + 5, 2, 1, look.skin);
  } else {
    p(3, bodyTop + 1 + (step > 0 ? 1 : 0), 1, 4, look.top);
    p(12, bodyTop + 1 + (step < 0 ? 1 : 0), 1, 4, look.top);
    p(3, bodyTop + 5 + (step > 0 ? 1 : 0), 1, 1, look.skin);
    p(12, bodyTop + 5 + (step < 0 ? 1 : 0), 1, 1, look.skin);
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
  } else {
    p(3, head - 1, 10, 3, look.hair);
    p(3, head + 2, 1, 3, look.hair);
    p(12, head + 2, 1, 3, look.hair);
    p(6, head + 4, 1, 2, "#2b2420");
    p(9, head + 4, 1, 2, "#2b2420");
    p(5, head + 6, 1, 1, "#e08a7a");
    p(10, head + 6, 1, 1, "#e08a7a");
    if (look.mustache) p(6, head + 6, 4, 1, look.hair === "#d8d4cc" ? "#f0eee8" : "#2b2420");
  }
  if (look.bun) p(d === "left" ? 9 : 6, head - 3, 4, 3, look.hair);
  if (look.braid && d !== "left") {
    p(3, head + 5, 1, 6, look.hair);
    p(12, head + 5, 1, 6, look.hair);
  }
  if (look.braid && d === "left") p(11, head + 5, 2, 7, look.hair);
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
