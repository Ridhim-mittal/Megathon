// Pixel art for the town (the first-job chapter): roads with zebra crossings, paved sidewalks, a
// park, and cosy modern buildings with the same warm outline as the village. Cars drive by.

import { C, grass, outline, px, shadowFor } from "./art.js";
import { CITY, CITY_DECO, LAMPS } from "./city.js";

const { W, H, GRID, PLACES, TILE, hash } = CITY;
const tileAt = (x, y) => GRID[y]?.[x] ?? "tree";
const isRoad = (t) => t === "road" || t === "crossing";

const K = {
  road: "#59606b",
  roadDark: "#4f555f",
  roadLight: "#646b76",
  line: "#f2c84b",
  zebra: "#f4f4f0",
  walk: "#d3d6db",
  walkLine: "#bcc1c8",
  curb: "#9aa1aa",
  park: "#e3dccb",
  parkLine: "#cfc6b2",
  terrace: "#cf8f70",
  terraceLine: "#b8775a",
  lot: "#6b727c",
  glass: "#8ccbea",
  glassDark: "#5fa7d0",
  glassHi: "#d7f0fb",
  white: "#f7f7f2",
  roof: "#c9ccd1",
  roofDark: "#a9aeb6",
};

// ---------- a tiny 3×5 pixel font for signs ----------
const GLYPHS = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", E: "111100110100111", F: "111100110100100",
  G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111", 2: "110001010100111", 4: "101101111001001",
  7: "111001010010010", "/": "001001010100100", " ": "000000000000000",
};
function text(ctx, str, cx, y, color) {
  const w = str.length * 4 - 1;
  let x = Math.round(cx - w / 2);
  for (const ch of str) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) if (g[i] === "1") px(ctx, x + (i % 3), y + Math.floor(i / 3), 1, 1, color);
    x += 4;
  }
}
function signBand(ctx, x, y, w, color, label, ink = "#ffffff") {
  px(ctx, x, y, w, 11, color);
  px(ctx, x, y, w, 1, "rgba(255,255,255,0.3)");
  px(ctx, x, y + 10, w, 1, "rgba(0,0,0,0.25)");
  text(ctx, label, x + w / 2, y + 3, ink);
}

// ---------- ground ----------
function sidewalk(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, TILE, TILE, K.walk);
  px(ctx, ox, oy + 7, TILE, 1, K.walkLine);
  px(ctx, ox, oy + 15, TILE, 1, K.walkLine);
  px(ctx, ox + ((tx + ty) % 2 ? 4 : 11), oy, 1, 7, K.walkLine);
  px(ctx, ox + ((tx + ty) % 2 ? 11 : 4), oy + 8, 1, 7, K.walkLine);
  if (hash(tx, ty, 3) < 0.25) px(ctx, ox + 5, oy + 3, 2, 1, "#c6cad0");
  // Curbs where the sidewalk meets the road.
  if (isRoad(tileAt(tx, ty - 1))) px(ctx, ox, oy, TILE, 2, K.curb);
  if (isRoad(tileAt(tx, ty + 1))) px(ctx, ox, oy + TILE - 2, TILE, 2, K.curb);
  if (isRoad(tileAt(tx - 1, ty))) px(ctx, ox, oy, 2, TILE, K.curb);
  if (isRoad(tileAt(tx + 1, ty))) px(ctx, ox + TILE - 2, oy, 2, TILE, K.curb);
}

function road(ctx, ox, oy, tx, ty, crossing) {
  px(ctx, ox, oy, TILE, TILE, K.road);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash(tx, ty, 20 + i) * 15);
    const y = Math.floor(hash(tx, ty, 30 + i) * 15);
    px(ctx, ox + x, oy + y, 1, 1, i % 2 ? K.roadDark : K.roadLight);
  }
  const horizRoad = ty === 13 || ty === 14;
  const vertRoad = tx === 13 || tx === 14 || tx === 26 || tx === 27;
  if (crossing) {
    if (horizRoad) for (let c = 1; c < TILE; c += 4) px(ctx, ox + c, oy + 1, 2, TILE - 2, K.zebra);
    else for (let r = 1; r < TILE; r += 4) px(ctx, ox + 1, oy + r, TILE - 2, 2, K.zebra);
    return;
  }
  // Dashed centre lines, not inside junctions.
  if (horizRoad && !vertRoad && ty === 13 && tx % 2 === 0) px(ctx, ox + 2, oy + TILE - 1, 9, 2, K.line);
  if (vertRoad && !horizRoad && (tx === 13 || tx === 26) && ty % 2 === 0) px(ctx, ox + TILE - 1, oy + 2, 2, 9, K.line);
}

function parking(ctx, ox, oy, tx, ty) {
  px(ctx, ox, oy, TILE, TILE, K.lot);
  if (ty === 8 || ty === 9) px(ctx, ox, oy, 1, TILE, "#e8e8e2");
  if (ty === 7) px(ctx, ox, oy + TILE - 1, TILE, 1, "#e8e8e2");
  if (hash(tx, ty, 5) < 0.4) px(ctx, ox + 7, oy + 5, 1, 1, K.roadLight);
}

function paved(ctx, ox, oy, base, line) {
  px(ctx, ox, oy, TILE, TILE, base);
  px(ctx, ox, oy + 7, TILE, 1, line);
  px(ctx, ox + 7, oy, 1, TILE, line);
}

// ---------- props ----------
function roundTree(ctx, ox, oy, tx, ty, planter) {
  if (planter) {
    px(ctx, ox + 3, oy + 10, 10, 5, "#7a5432");
    px(ctx, ox + 4, oy + 11, 8, 3, "#5e3c1e");
  }
  px(ctx, ox + 6, oy + 6, 4, 8, C.trunk);
  const blob = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      px(ctx, ox + cx - w, oy + cy + y, w * 2, 1, color);
    }
  };
  const lift = hash(tx, ty, 5) < 0.5 ? 0 : 1;
  blob(8, 0 - lift, 8, C.canopyDark);
  blob(8, -1 - lift, 7, C.canopy);
  blob(6, -3 - lift, 4, C.canopyLight);
  blob(5, -5 - lift, 2, C.canopyHi);
}

function fence(ctx, ox, oy, tx, ty) {
  const horiz = tileAt(tx - 1, ty) === "fence" || tileAt(tx + 1, ty) === "fence";
  const vert = tileAt(tx, ty - 1) === "fence" || tileAt(tx, ty + 1) === "fence";
  if (horiz) {
    px(ctx, ox, oy + 7, TILE, 2, "#f4f4f0");
    for (let c = 1; c < TILE; c += 4) px(ctx, ox + c, oy + 3, 2, 10, "#f4f4f0");
  }
  if (vert || !horiz) {
    px(ctx, ox + 7, oy, 2, TILE, "#f4f4f0");
    px(ctx, ox + 6, oy + 2, 4, 2, "#f4f4f0");
  }
}

function lamp(ctx, tx, ty) {
  const x = tx * TILE + 12;
  const y = ty * TILE + 14;
  px(ctx, x, y - 24, 2, 25, "#6f767f");
  px(ctx, x - 1, y, 4, 2, "#6f767f");
  px(ctx, x - 5, y - 24, 6, 2, "#6f767f");
  px(ctx, x - 6, y - 23, 4, 3, "#fff1b0");
}

function car(ctx, x, y, color, vertical = true) {
  // Top-down car: body, windscreens, roof and wheels.
  if (vertical) {
    px(ctx, x + 1, y + 2, 2, 4, "#2b2b30");
    px(ctx, x + 11, y + 2, 2, 4, "#2b2b30");
    px(ctx, x + 1, y + 20, 2, 4, "#2b2b30");
    px(ctx, x + 11, y + 20, 2, 4, "#2b2b30");
    px(ctx, x + 2, y, 10, 27, color);
    px(ctx, x + 3, y + 1, 8, 2, "rgba(255,255,255,0.35)");
    px(ctx, x + 3, y + 6, 8, 4, "#a9dbf2");
    px(ctx, x + 3, y + 18, 8, 3, "#a9dbf2");
    px(ctx, x + 3, y + 10, 8, 8, "rgba(0,0,0,0.12)");
    px(ctx, x + 3, y, 2, 1, "#fff6c0");
    px(ctx, x + 9, y, 2, 1, "#fff6c0");
  } else {
    px(ctx, x + 2, y + 1, 4, 2, "#2b2b30");
    px(ctx, x + 10, y + 1, 4, 2, "#2b2b30");
    px(ctx, x + 2, y + 9, 4, 2, "#2b2b30");
    px(ctx, x + 10, y + 9, 4, 2, "#2b2b30");
    px(ctx, x, y + 2, 16, 8, color);
    px(ctx, x + 4, y + 3, 3, 6, "#a9dbf2");
    px(ctx, x + 11, y + 3, 2, 6, "#a9dbf2");
    px(ctx, x + 7, y + 3, 4, 6, "rgba(0,0,0,0.12)");
  }
}

function deco(ctx, d) {
  const x = d.x * TILE;
  const y = d.y * TILE;
  const w = d.w * TILE;
  const h = d.h * TILE;
  if (d.kind === "car") car(ctx, x + 1, y + 3, d.color);
  else if (d.kind === "atm") {
    px(ctx, x + 2, y + 4, w - 4, h - 6, "#3f6fc0");
    px(ctx, x + 1, y + 2, w - 2, 4, "#2f4f9e");
    px(ctx, x + 4, y + 8, w - 8, 11, "#2f4f9e");
    text(ctx, "ATM", x + w / 2, y + 11, "#ffffff");
    text(ctx, "24/7", x + w / 2, y + 22, "#ffe58a");
    px(ctx, x + 8, y + 32, w - 16, 20, "#dfe6ee");
    px(ctx, x + 11, y + 35, w - 22, 7, "#57b8e0");
    px(ctx, x + 12, y + 45, w - 24, 2, "#2b2b30");
    px(ctx, x + 6, y + h - 4, w - 12, 2, "#cfd4da");
  } else if (d.kind === "ambulance") {
    px(ctx, x + 2, y + 2, 12, h - 4, "#fbfbf6");
    px(ctx, x + 3, y + 3, 10, 6, "#a9dbf2");
    px(ctx, x + 2, y + 18, 12, 3, "#e04a3a");
    px(ctx, x + 6, y + 26, 4, 10, "#e04a3a");
    px(ctx, x + 3, y + 29, 10, 4, "#e04a3a");
    px(ctx, x + 4, y + 11, 3, 2, "#e04a3a");
    px(ctx, x + 9, y + 11, 3, 2, "#3f6fc0");
    px(ctx, x + 1, y + 6, 1, 4, "#2b2b30");
    px(ctx, x + 14, y + 6, 1, 4, "#2b2b30");
    px(ctx, x + 1, y + h - 12, 1, 4, "#2b2b30");
    px(ctx, x + 14, y + h - 12, 1, 4, "#2b2b30");
  } else if (d.kind === "slide") {
    px(ctx, x + 2, y + 2, 3, h - 4, "#9aa1aa");
    px(ctx, x + 11, y + 2, 3, h - 4, "#9aa1aa");
    for (let r = 4; r < 14; r += 3) px(ctx, x + 2, y + r, 12, 1, "#9aa1aa");
    px(ctx, x + 4, y + 14, 8, h - 16, "#e8503a");
    px(ctx, x + 5, y + 14, 2, h - 16, "#ff8a6a");
  } else if (d.kind === "bench") {
    px(ctx, x + 2, y + 4, w - 4, 6, "#b07a42");
    px(ctx, x + 2, y + 4, w - 4, 1, "#d39a5a");
    px(ctx, x + 2, y + 7, w - 4, 1, "#8a5a2c");
    px(ctx, x + 4, y + 10, 2, 4, "#5e3c1e");
    px(ctx, x + w - 6, y + 10, 2, 4, "#5e3c1e");
  } else if (d.kind === "planter") {
    px(ctx, x + 1, y + 4, 14, 10, "#b9b2a2");
    px(ctx, x + 2, y + 4, 12, 3, "#4f9a3a");
    for (const [fx, fc] of [[3, "#ff6f91"], [6, "#ffd84a"], [9, "#ffffff"], [12, "#ff9a3c"]]) px(ctx, x + fx, y + 3, 2, 2, fc);
    px(ctx, x + 6, y - 2, 4, 6, "#3f8a35");
  } else if (d.kind === "bikes") {
    for (let i = 0; i < d.w; i++) {
      const bx = x + i * 16 + 2;
      const col = ["#3f6fc0", "#e04a3a", "#57b85a"][i % 3];
      px(ctx, bx, y + 8, 4, 4, "#2b2b30");
      px(ctx, bx + 9, y + 8, 4, 4, "#2b2b30");
      px(ctx, bx + 3, y + 5, 7, 4, col);
      px(ctx, bx + 4, y + 3, 4, 2, "#2b2b30");
      px(ctx, bx + 10, y + 3, 2, 3, "#9aa1aa");
    }
  } else if (d.kind === "scooters") {
    for (let i = 0; i < d.w * 2; i++) {
      const sx = x + i * 8 + 1;
      const col = ["#e04a3a", "#ffd84a", "#4f8fe0", "#f4f4f0", "#57b85a"][i % 5];
      px(ctx, sx + 1, y + 2, 4, 3, "#2b2b30");
      px(ctx, sx, y + 4, 6, 7, col);
      px(ctx, sx + 1, y + 11, 4, 3, "#2b2b30");
      px(ctx, sx + 1, y + 5, 4, 2, "rgba(255,255,255,0.4)");
    }
  } else if (d.kind === "guard") {
    px(ctx, x + 1, y - 10, 14, 24, "#3f6fc0");
    px(ctx, x, y - 12, 16, 3, "#2f4f9e");
    px(ctx, x + 3, y - 6, 10, 7, "#a9dbf2");
    px(ctx, x + 6, y - 4, 4, 4, "#c98b5e");
    px(ctx, x + 5, y - 5, 6, 2, "#2f4f9e");
  } else if (d.kind === "busstop") {
    px(ctx, x + 2, y - 8, 2, 22, "#6f767f");
    px(ctx, x + w - 4, y - 8, 2, 22, "#6f767f");
    px(ctx, x, y - 12, w, 5, "#2f7fbf");
    px(ctx, x, y - 12, w, 1, "#6fb7e8");
    px(ctx, x + 4, y - 7, w - 8, 9, "rgba(169,219,242,0.7)");
    px(ctx, x + 6, y + 5, w - 12, 4, "#b07a42");
    px(ctx, x + 6, y + 5, w - 12, 1, "#d39a5a");
    px(ctx, x + w / 2 - 6, y - 11, 12, 3, "#ffd84a");
  } else if (d.kind === "bin") {
    px(ctx, x + 4, y + 3, 8, 11, "#3d9a4a");
    px(ctx, x + 3, y + 2, 10, 2, "#2f7a3a");
    px(ctx, x + 5, y + 6, 2, 6, "rgba(255,255,255,0.3)");
  } else if (d.kind === "hydrant") {
    px(ctx, x + 5, y + 4, 6, 10, "#e04a3a");
    px(ctx, x + 4, y + 3, 8, 2, "#b8302a");
    px(ctx, x + 3, y + 7, 10, 3, "#e04a3a");
    px(ctx, x + 6, y + 5, 1, 7, "#ff8a7a");
  } else if (d.kind === "umbrella") {
    // Cafe table under a striped umbrella, with two stools.
    px(ctx, x + 1, y + 10, 4, 4, "#8a5a2c");
    px(ctx, x + 11, y + 10, 4, 4, "#8a5a2c");
    px(ctx, x + 7, y + 4, 2, 10, "#6f767f");
    const r = 8;
    for (let yy = -r; yy <= 0; yy++) {
      const half = Math.round(Math.sqrt(r * r - yy * yy) * 1.1);
      for (let xx = -half; xx < half; xx++) px(ctx, x + 8 + xx, y + 4 + yy, 1, 1, Math.floor((xx + 16) / 3) % 2 ? d.color : "#fff6e6");
    }
  }
}

// ---------- buildings ----------
function flatTop(ctx, x, y, w, h, { ac = 2, tank = false, solar = false } = {}) {
  px(ctx, x - 1, y, w + 2, h, K.roofDark);
  px(ctx, x + 1, y + 2, w - 2, h - 4, K.roof);
  px(ctx, x - 1, y, w + 2, 1, "#e3e6ea");
  for (let i = 0; i < ac; i++) {
    const ax = x + 6 + i * 14;
    px(ctx, ax, y + 4, 11, 8, "#e8eaed");
    px(ctx, ax + 2, y + 6, 6, 4, "#9aa1aa");
    px(ctx, ax + 3, y + 7, 4, 2, "#6f767f");
  }
  if (tank)
    for (const tx of [x + w - 32, x + w - 18]) {
      px(ctx, tx, y + 3, 12, 10, "#2b2b30");
      px(ctx, tx + 2, y + 3, 3, 9, "#4a4a52");
    }
  if (solar)
    for (let c = 0; c < 4; c++) {
      const sx = x + w - 60 + c * 13;
      px(ctx, sx, y + 4, 11, 9, "#2f4f9e");
      px(ctx, sx + 5, y + 4, 1, 9, "#5f7fc8");
      px(ctx, sx, y + 8, 11, 1, "#5f7fc8");
    }
}

function glassWall(ctx, x, y, w, h, frame = K.white) {
  px(ctx, x, y, w, h, frame);
  for (let c = x + 3; c < x + w - 4; c += 14) {
    px(ctx, c, y + 2, 12, h - 4, K.glass);
    px(ctx, c, y + 2, 12, 2, K.glassHi);
    px(ctx, c + 2, y + 5, 2, h - 9, "rgba(255,255,255,0.45)");
    px(ctx, c + 8, y + h - 6, 4, 4, K.glassDark);
  }
}

function plant(ctx, x, y) {
  px(ctx, x, y + 6, 8, 6, "#c25a3c");
  px(ctx, x - 1, y + 6, 10, 1, "#e07a52");
  px(ctx, x + 1, y, 6, 6, "#4f9a3a");
  px(ctx, x + 2, y - 1, 4, 2, "#6fb84f");
}

function glassDoor(ctx, cx, bottom, w = 14, h = 16) {
  const x = cx - Math.floor(w / 2);
  px(ctx, x - 1, bottom - h - 1, w + 2, h + 1, "#6f767f");
  px(ctx, x, bottom - h, w, h, "#a9dbf2");
  px(ctx, x + Math.floor(w / 2), bottom - h, 1, h, "#6f767f");
  px(ctx, x + 2, bottom - h + 2, 2, h - 5, "rgba(255,255,255,0.6)");
  px(ctx, x - 3, bottom, w + 6, 2, "#cfd4da");
}

function building(ctx, b) {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const bottom = y + h - 2;
  const doorX = b.door.x * TILE + 8;
  if (b.style === "mart") {
    flatTop(ctx, x, y, w, 26, { ac: 2 });
    px(ctx, x, y + 26, w, h - 26, "#e9c9a0");
    px(ctx, x, y + 26, 4, h - 26, "#b5523b");
    px(ctx, x + w - 4, y + 26, 4, h - 26, "#b5523b");
    signBand(ctx, x + 4, y + 26, w - 8, "#2f7d4f", "SUPERMARKET");
    glassWall(ctx, x + 4, y + 38, w - 8, h - 40, "#e9c9a0");
    glassDoor(ctx, doorX, bottom);
    px(ctx, doorX - 8, bottom, 16, 2, "#c8382e");
    // Produce crates by the window.
    for (let i = 0; i < 3; i++) {
      px(ctx, x + 6 + i * 9, bottom - 7, 8, 7, "#b07a42");
      for (let k = 0; k < 3; k++) px(ctx, x + 7 + i * 9 + k * 2, bottom - 9, 2, 2, ["#e04a3a", "#ffd84a", "#57b85a"][i]);
    }
    plant(ctx, x + w - 14, bottom - 12);
  } else if (b.style === "cityHospital") {
    flatTop(ctx, x, y, w, 26, { ac: 1 });
    px(ctx, x + w - 30, y + 3, 20, 20, "#ffffff");
    px(ctx, x + w - 23, y + 5, 6, 16, "#e04a3a");
    px(ctx, x + w - 28, y + 10, 16, 6, "#e04a3a");
    px(ctx, x, y + 26, w, h - 26, K.white);
    glassWall(ctx, x + 2, y + 28, w - 4, 26, K.white);
    signBand(ctx, x + 16, y + 56, w - 32, "#d63a2e", "HOSPITAL");
    glassWall(ctx, x + 2, y + 68, w - 4, h - 70, K.white);
    // Entrance canopy.
    px(ctx, doorX - 14, bottom - 21, 28, 4, "#e9ecef");
    px(ctx, doorX - 14, bottom - 18, 28, 1, "#b9bec5");
    glassDoor(ctx, doorX, bottom);
    plant(ctx, x + 6, bottom - 12);
    plant(ctx, x + w - 14, bottom - 12);
  } else if (b.style === "hostel") {
    flatTop(ctx, x, y, w, 22, { ac: 1, tank: true });
    const floors = 3;
    const fh = Math.floor((h - 24) / floors);
    for (let f = 0; f < floors; f++) {
      const fy = y + 22 + f * fh;
      px(ctx, x, fy, w, fh, f % 2 ? "#e9d6b0" : "#efdcb8");
      for (let c = x + 6; c < x + w - 12; c += 18) {
        if (f === floors - 1 && Math.abs(c + 6 - doorX) < 14) continue;
        px(ctx, c, fy + 4, 9, fh - 8, "#8a5a2c");
        px(ctx, c + 1, fy + 5, 7, 4, "#3a4048");
        px(ctx, c + 11, fy + 6, 6, 6, "#3a4048");
        px(ctx, c + 11, fy + 6, 6, 1, "#c9b68a");
      }
      if (f < floors - 1) {
        // Balcony railing with clothes drying.
        px(ctx, x, fy + fh - 4, w, 1, "#6f5a3a");
        for (let c = x + 2; c < x + w; c += 4) px(ctx, c, fy + fh - 4, 1, 4, "#6f5a3a");
        for (let k = 0; k < 4; k++) {
          const cx = x + 14 + k * 32;
          px(ctx, cx, fy + fh - 9, 4, 5, ["#e04a3a", "#4f8fe0", "#ffd84a", "#57b85a"][k]);
        }
      }
    }
    signBand(ctx, doorX - 26, y + 22 + fh - 6, 52, "#2f4f9e", "PG HOSTEL");
    // Gate.
    px(ctx, doorX - 9, bottom - 16, 18, 16, "#4a4a52");
    for (let c = doorX - 8; c < doorX + 8; c += 3) px(ctx, c, bottom - 15, 1, 15, "#8a8f96");
    px(ctx, doorX - 11, bottom - 18, 3, 18, "#cfd4da");
    px(ctx, doorX + 8, bottom - 18, 3, 18, "#cfd4da");
    px(ctx, x - 1, bottom - 1, w + 2, 3, "#b9b2a2");
  } else if (b.style === "cityBank") {
    flatTop(ctx, x, y, w, 24, { ac: 2 });
    px(ctx, x, y + 24, w, h - 24, K.white);
    signBand(ctx, x + 2, y + 24, w - 4, "#2f5fbf", "BANK");
    px(ctx, x + w - 26, y + 26, 20, 7, "#ffd84a");
    text(ctx, "ATM", x + w - 16, y + 27, "#2f4f9e");
    glassWall(ctx, x + 4, y + 37, w - 8, h - 39, K.white);
    // Columns.
    for (const cx of [x + 2, x + w - 6]) px(ctx, cx, y + 35, 4, h - 37, "#e3e6ea");
    glassDoor(ctx, doorX, bottom, 16, 18);
    plant(ctx, doorX + 14, bottom - 12);
    plant(ctx, doorX - 22, bottom - 12);
  } else if (b.style === "techPark") {
    flatTop(ctx, x, y, w, 24, { ac: 1, solar: true });
    px(ctx, x, y + 24, w, h - 24, "#3f5f7a");
    signBand(ctx, x + 8, y + 26, w - 16, "#2b2f36", "TECH PARK", "#7fe0d0");
    for (let r = 0; r < 2; r++)
      for (let c = x + 4; c < x + w - 8; c += 12) {
        px(ctx, c, y + 40 + r * 18, 10, 14, "#7fc4e8");
        px(ctx, c, y + 40 + r * 18, 10, 2, "#c4eafb");
        px(ctx, c + 1, y + 43 + r * 18, 2, 9, "rgba(255,255,255,0.4)");
      }
    // A cafe awning on one side.
    for (let c = 0; c < 40; c++) px(ctx, x + w - 44 + c, bottom - 22, 1, 5, Math.floor(c / 4) % 2 ? "#fff6e6" : "#e0a12f");
    glassDoor(ctx, doorX, bottom, 16, 18);
    plant(ctx, x + 4, bottom - 12);
  }
}

function stall(ctx, o) {
  const x = o.x * TILE;
  const y = o.y * TILE;
  const w = o.w * TILE;
  px(ctx, x + 1, y + 2, w - 2, 13, "#b07a42");
  px(ctx, x + 1, y + 2, w - 2, 1, "#d39a5a");
  for (let i = 0; i < 4; i++) {
    px(ctx, x + 4 + i * 7, y + 4, 5, 3, ["#ffd84a", "#e8a03a", "#57b85a", "#e04a3a"][i]);
    px(ctx, x + 4 + i * 7, y + 7, 5, 1, "#f4f4f0");
  }
  px(ctx, x + 2, y + 9, w - 4, 1, "#8a5a2c");
  px(ctx, x + 2, y - 12, 2, 14, "#6f767f");
  px(ctx, x + w - 4, y - 12, 2, 14, "#6f767f");
  for (let c = 0; c < w + 4; c++) {
    const col = Math.floor(c / 4) % 2 ? "#fff6e6" : "#e8503a";
    px(ctx, x - 2 + c, y - 16, 1, 6, col);
    if (c % 4 === 1) px(ctx, x - 2 + c, y - 10, 2, 1, col);
  }
  px(ctx, x + w / 2 - 7, y - 23, 14, 7, "#ffd84a");
  px(ctx, x + w / 2 - 4, y - 21, 3, 3, "#e8503a");
  px(ctx, x + w / 2 + 1, y - 21, 3, 3, "#57b85a");
}

// ---------- the whole town ----------
let sprites = null;

function renderSprites() {
  const canvas = document.createElement("canvas");
  canvas.width = W * TILE;
  canvas.height = H * TILE;
  const ctx = canvas.getContext("2d");
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) if (GRID[ty][tx] === "fence") fence(ctx, tx * TILE, ty * TILE, tx, ty);
    for (const d of CITY_DECO) if (d.y + d.h - 1 === ty) deco(ctx, d);
    for (const p of PLACES) {
      if (p.y + p.h - 1 !== ty) continue;
      if (p.style === "stall") stall(ctx, p);
      else building(ctx, p);
    }
    for (const [lx, ly] of LAMPS) if (ly === ty) lamp(ctx, lx, ly);
    for (let tx = 0; tx < W; tx++)
      if (GRID[ty][tx] === "tree") {
        const border = tx === 0 || ty === 0 || tx === W - 1 || ty === H - 1;
        const inPark = tx >= 16 && tx <= 24 && ty >= 2 && ty <= 11;
        roundTree(ctx, tx * TILE, ty * TILE, tx, ty, !border && !inPark);
      }
  }
  outline(canvas);
  return canvas;
}

export function renderCity() {
  const canvas = document.createElement("canvas");
  canvas.width = W * TILE;
  canvas.height = H * TILE;
  const ctx = canvas.getContext("2d");
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const t = GRID[ty][tx];
      const ox = tx * TILE;
      const oy = ty * TILE;
      if (t === "road" || t === "crossing") road(ctx, ox, oy, tx, ty, t === "crossing");
      else if (t === "parking") parking(ctx, ox, oy, tx, ty);
      else if (t === "lawn" || t === "fence") grass(ctx, ox, oy, tx, ty);
      else if (t === "parkpath") paved(ctx, ox, oy, K.park, K.parkLine);
      else if (t === "terrace") paved(ctx, ox, oy, K.terrace, K.terraceLine);
      else if (t === "tree") {
        const border = tx === 0 || ty === 0 || tx === W - 1 || ty === H - 1;
        const inPark = tx >= 16 && tx <= 24 && ty >= 2 && ty <= 11;
        if (border || inPark) grass(ctx, ox, oy, tx, ty);
        else sidewalk(ctx, ox, oy, tx, ty);
      } else if (t === "deco" && tileAt(tx, ty - 1) === "parking") parking(ctx, ox, oy, tx, ty);
      else if (t === "deco" && (tx >= 16 && tx <= 24 && ty >= 2 && ty <= 11)) grass(ctx, ox, oy, tx, ty);
      else if (t === "deco" && tx >= 29 && tx <= 34 && ty >= 23 && ty <= 25) paved(ctx, ox, oy, K.terrace, K.terraceLine);
      else sidewalk(ctx, ox, oy, tx, ty);
    }
  // Parked cars sit on parking tiles; the bays continue under them.
  for (const d of CITY_DECO) if (d.kind === "car") for (let j = 0; j < d.h; j++) parking(ctx, d.x * TILE, (d.y + j) * TILE, d.x, d.y + j);
  for (const p of PLACES) if (p.style !== "stall") shadowFor(ctx, p.x * TILE, p.y * TILE + 2, p.w * TILE, p.h * TILE);
  if (!sprites) sprites = renderSprites();
  ctx.drawImage(sprites, 0, 0);
  return canvas;
}

// Cars driving along their lanes, butterflies in the park and birds overhead, every frame.
const LANES = [
  { axis: "x", at: 13, dir: -1, colors: ["#e05a4a", "#ffd84a"] },
  { axis: "x", at: 14, dir: 1, colors: ["#4f8fe0", "#f4f4f0"] },
  { axis: "y", at: 13, dir: 1, colors: ["#57b85a"] },
  { axis: "y", at: 14, dir: -1, colors: ["#f08a3c"] },
  { axis: "y", at: 26, dir: 1, colors: ["#b07ae0"] },
  { axis: "y", at: 27, dir: -1, colors: ["#e05a4a"] },
];
export function drawCityAmbient(ctx, now, camX, camY) {
  const t = now / 1000;
  const mapW = W * TILE;
  const mapH = H * TILE;
  LANES.forEach((lane, li) => {
    const len = lane.axis === "x" ? mapW + 40 : mapH + 40;
    lane.colors.forEach((color, ci) => {
      const off = (t * 34 + li * 97 + ci * (len / lane.colors.length)) % len;
      const pos = lane.dir > 0 ? off - 20 : len - off - 20;
      const sx = lane.axis === "x" ? pos : lane.at * TILE + 2;
      const sy = lane.axis === "x" ? lane.at * TILE + 2 : pos;
      const x = Math.round(sx - camX);
      const y = Math.round(sy - camY);
      ctx.fillStyle = "#3a281e";
      if (lane.axis === "x") ctx.fillRect(x - 1, y + 1, 18, 10);
      else ctx.fillRect(x + 1, y - 1, 12, 29);
      car(ctx, x, y, color, lane.axis === "y");
    });
  });
  const P = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x - camX), Math.round(y - camY), w, h);
  };
  [
    [18, 5, "#ffd84a"],
    [22, 8, "#ff9ac0"],
    [19, 9, "#9fd3ef"],
  ].forEach(([tx, ty, c], i) => {
    const bx = tx * TILE + Math.sin(t * 0.8 + i) * 18;
    const by = ty * TILE + Math.cos(t * 1.1 + i) * 8;
    const flap = Math.floor(t * 10 + i) % 2;
    P(bx, by, 1, 2, "#3b2b22");
    P(bx - (flap ? 2 : 1), by - 1, flap ? 2 : 1, 2, c);
    P(bx + 1, by - 1, flap ? 2 : 1, 2, c);
  });
  // The ambulance's light bar blinks.
  const blink = Math.floor(t * 3) % 2;
  P(37 * TILE + 4, 3 * TILE + 11, 3, 2, blink ? "#ff6a5a" : "#7a2a20");
  P(37 * TILE + 9, 3 * TILE + 11, 3, 2, blink ? "#2f4f9e" : "#7fb0ff");
  const cross = (t % 24) / 24;
  if (cross < 0.5) {
    const bx0 = -40 + (cross / 0.5) * (mapW + 80);
    const by0 = 60 + Math.sin(t) * 6;
    for (const [dx, dy] of [[0, 0], [-9, -5], [-9, 5]]) {
      const flap = Math.floor(t * 6 + dx) % 2;
      P(bx0 + dx - 2, by0 + dy + (flap ? -1 : 0), 2, 1, "#3b2b22");
      P(bx0 + dx + 1, by0 + dy + (flap ? -1 : 0), 2, 1, "#3b2b22");
      P(bx0 + dx, by0 + dy, 1, 1, "#3b2b22");
    }
  }
}

CITY.render = renderCity;
CITY.ambient = drawCityAmbient;
