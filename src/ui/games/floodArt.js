// Flood Rescue's pixel art: Nanna's house in cut-away with the paddy field outside the door, the
// things you can grab, and Bujji on her haystack. Built with the same pixel toolkit as SIP Garden.
import { pixelSprite as sprite } from "./gardenArt.js";
import { FIELD } from "./floodRescue.js";

export const PX = 3; // field units per background pixel
export const ITEM_PX = 4; // items are drawn a little bigger, so they are easy to tap
export const DOOR_X = 642; // the doorway between the house and the field

// ---------- the scene (painted once per weather at 320×180) ----------
export function paintHouse(c, storm) {
  const W = FIELD.w / PX;
  const H = FIELD.h / PX;
  const g = c.getContext("2d");
  let seed = 5;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const fill = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const door = DOOR_X / PX;
  // Outside: sky, hills, the field and the canal.
  fill(door, 0, W - door, H, storm ? "#3a4560" : "#8fd3ff");
  if (storm) for (const [cx, cy, r] of [[240, 12, 18], [270, 8, 22], [300, 14, 18], [228, 22, 12]]) circle(g, cx, cy, r, "#262d40");
  else {
    circle(g, 296, 18, 9, "#ffd54f");
    for (const [cx, cy] of [[240, 20], [262, 30]]) for (const [dx, r] of [[0, 6], [6, 7], [12, 5]]) circle(g, cx + dx, cy, r, "#ffffff");
  }
  circle(g, 250, 110, 50, storm ? "#3d5a3a" : "#7cbf5a");
  circle(g, 310, 118, 40, storm ? "#36513a" : "#6fb04f");
  fill(door, 120, W - door, H - 120, storm ? "#4a3420" : "#7a5230");
  for (let x = door + 4; x < W - 14; x += 7) fill(x, 126, 5, 1, storm ? "#3b2818" : "#664428");
  fill(W - 12, 110, 12, H - 110, storm ? "#2c4a66" : "#4fa3d8"); // the canal
  fill(W - 13, 110, 1, H - 110, "#6b8a4a");
  // The house: roof, walls, floor, beam.
  fill(0, 0, door, 12, "#9c4a30");
  for (let x = 0; x < door; x += 6) fill(x, 8, 5, 4, "#b5563a");
  fill(0, 12, door, 4, "#5a3418");
  fill(0, 16, door, 141, "#e8cfa0");
  for (let i = 0; i < 260; i++) fill(R() * door, 16 + R() * 140, 1, 1, R() < 0.5 ? "#dcc090" : "#f2dcb0");
  fill(0, 150, door, 7, "#c9a46a"); // skirting
  fill(0, 157, door, H - 157, "#9c6a3c");
  for (let x = 0; x < door; x += 12) fill(x, 157, 1, H - 157, "#7a4e2a");
  // The doorway.
  fill(door - 4, 40, 4, 117, "#5a3418");
  fill(door - 2, 40, 2, 117, "#7a4e2a");
  // A window with the weather in it.
  fill(108, 28, 30, 26, "#5a3418");
  fill(110, 30, 26, 22, storm ? "#3a4560" : "#a8dcff");
  fill(122, 30, 2, 22, "#5a3418");
  fill(110, 40, 26, 2, "#5a3418");
  // High shelf, low shelf, table, cupboard, the wall hook, a calendar.
  fill(36, 72, 70, 3, "#6b4423");
  fill(40, 75, 3, 5, "#5a3418");
  fill(99, 75, 3, 5, "#5a3418");
  fill(100, 108, 42, 3, "#6b4423");
  fill(26, 128, 62, 4, "#8a5a2e");
  fill(30, 132, 4, 25, "#6b4423");
  fill(80, 132, 4, 25, "#6b4423");
  fill(146, 64, 46, 93, "#7a4e2a");
  fill(149, 67, 40, 87, "#5a3418");
  fill(149, 92, 40, 3, "#8a5a2e");
  fill(146, 64, 46, 3, "#9c6a3c");
  fill(122, 52, 3, 4, "#3b2716");
  fill(60, 30, 18, 22, "#fff8e8");
  fill(60, 30, 18, 5, "#d84a3a");
  for (let i = 0; i < 9; i++) fill(62 + (i % 3) * 5, 38 + Math.floor(i / 3) * 4, 3, 2, "#c9b48a");
}

function circle(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(Math.round(x), Math.round(y), Math.round(r), 0, Math.PI * 2);
  g.fill();
}

// ---------- the things to grab ----------
export function itemSprite(kind) {
  const P = {
    policy: [11, 13, ({ rect, px }) => {
      rect(0, 0, 11, 13, "#f5f2e8");
      rect(0, 0, 11, 3, "#3f9b3a");
      rect(3, 5, 5, 4, "#2a7fd0");
      rect(4, 9, 3, 1, "#2a7fd0");
      px(5, 10, "#2a7fd0");
      px(4, 7, "#ffffff");
      px(5, 8, "#ffffff");
      px(6, 6, "#ffffff");
      rect(2, 11, 7, 1, "#b8b2a6");
      px(10, 0, "#d8d2c6");
    }],
    aadhaar: [13, 9, ({ rect }) => {
      rect(0, 0, 13, 9, "#ffffff");
      rect(0, 0, 13, 2, "#ff9933");
      rect(0, 7, 13, 2, "#138808");
      rect(1, 3, 3, 3, "#c9a27e");
      rect(5, 3, 6, 1, "#9a9a9a");
      rect(5, 5, 4, 1, "#9a9a9a");
    }],
    passbook: [10, 13, ({ rect, px }) => {
      rect(0, 0, 10, 13, "#1f3a7a");
      rect(0, 0, 2, 13, "#162a58");
      rect(4, 4, 4, 1, "#ffd23f");
      rect(4, 6, 4, 1, "#ffd23f");
      rect(5, 4, 1, 6, "#ffd23f");
      px(6, 8, "#ffd23f");
      px(7, 9, "#ffd23f");
    }],
    land: [13, 10, ({ rect }) => {
      rect(0, 2, 13, 8, "#e6cf9c");
      rect(1, 0, 11, 3, "#fff8e0");
      rect(0, 5, 13, 1, "#c62828");
      rect(6, 2, 1, 8, "#c62828");
      rect(2, 7, 3, 1, "#b8a070");
    }],
    cash: [13, 10, ({ rect }) => {
      rect(0, 2, 13, 8, "#b9c3cf");
      rect(0, 2, 13, 2, "#dfe6ee");
      rect(2, 0, 9, 3, "#8ccf7e");
      rect(0, 8, 13, 2, "#8b96a3");
      rect(5, 5, 3, 2, "#5a6474");
    }],
    tv: [14, 12, ({ rect, px }) => {
      px(4, 0, "#3a3a44");
      px(5, 1, "#3a3a44");
      px(9, 0, "#3a3a44");
      px(8, 1, "#3a3a44");
      rect(0, 2, 14, 10, "#6b6b73");
      rect(1, 3, 9, 7, "#2b3a4a");
      rect(2, 4, 2, 2, "#6a8aa8");
      rect(11, 4, 2, 2, "#c9c9d2");
      rect(11, 7, 2, 1, "#c9c9d2");
    }],
    saree: [13, 7, ({ rect }) => {
      rect(0, 0, 13, 7, "#e2508a");
      rect(0, 0, 13, 1, "#ffd23f");
      rect(0, 6, 13, 1, "#ffd23f");
      rect(0, 3, 13, 1, "#c23a72");
    }],
    sweets: [12, 8, ({ rect, ell }) => {
      rect(0, 3, 12, 5, "#ff9a3c");
      rect(5, 3, 2, 5, "#e53935");
      ell(3, 2.5, 2, 2, "#ffd23f");
      ell(8.5, 2.5, 2, 2, "#ffd23f");
    }],
    radio: [13, 9, ({ rect, px }) => {
      rect(0, 1, 13, 8, "#8a5a3a");
      rect(1, 3, 6, 5, "#5a3a22");
      for (const [x, y] of [[2, 4], [4, 4], [3, 6], [5, 6]]) px(x, y, "#c9a27e");
      rect(9, 3, 3, 3, "#ffd23f");
      rect(2, 0, 8, 1, "#5a3a22");
    }],
  }[kind];
  return sprite(`flood-${kind}`, P[0], P[1], P[2]);
}

// Bujji the buffalo, unimpressed on her haystack.
export const buffalo = () =>
  sprite("flood-bujji", 18, 12, ({ rect, ell, px }) => {
    ell(10, 7, 7, 4.5, "#4a4a55");
    ell(4, 5, 3.5, 3, "#5a5a66");
    px(1, 2, "#e8e0c8");
    px(2, 1, "#e8e0c8");
    px(6, 2, "#e8e0c8");
    px(7, 1, "#e8e0c8");
    px(3, 5, "#ffffff");
    rect(1, 6, 2, 1, "#8a7a8a");
    for (const x of [6, 9, 13, 15]) rect(x, 10, 2, 2, "#3a3a44");
    px(17, 6, "#3a3a44");
  });

export const haystack = () =>
  sprite("flood-hay", 22, 14, ({ ell, rect }) => {
    ell(11, 10, 11, 9, "#e0b04a");
    ell(11, 8, 8, 6, "#f2c862");
    for (const x of [4, 9, 14, 18]) rect(x, 6, 1, 6, "#c9962e");
  });

// A rice plant; drowned ones lie flat and brown.
export function plantSprite(drowned) {
  return sprite(`flood-plant-${drowned}`, 6, 12, ({ rect, px }) => {
    if (drowned) {
      rect(0, 9, 6, 2, "#7a6a3a");
      px(5, 8, "#8a7a4a");
      return;
    }
    rect(2, 4, 1, 8, "#4caa3c");
    rect(4, 5, 1, 7, "#3f9b3a");
    rect(1, 0, 2, 4, "#e8c040");
    rect(3, 1, 2, 4, "#f2d050");
    px(0, 6, "#5cbf45");
    px(5, 7, "#5cbf45");
  });
}
