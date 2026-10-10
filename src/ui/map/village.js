// The village map: a 40×28 tile grid (16 px tiles), built in code so it stays easy to edit.
// Tiles: grass, path (dirt road), plaza (village square), water, crop (cotton field), flowers,
// tree, bush, rock, fence, building. Buildings and objects carry the map location they open.

export const TILE = 16;
export const W = 40;
export const H = 28;

// Every place: its footprint (tiles), the door tile in its front wall, and the entrance tile in
// front of the door where the player stands to go in.
export const BUILDINGS = [
  { id: "home", x: 3, y: 3, w: 5, h: 5, style: "home" },
  { id: "school", x: 12, y: 2, w: 7, h: 6, style: "school" },
  { id: "bank", x: 23, y: 3, w: 6, h: 5, style: "bank" },
  { id: "post", x: 32, y: 4, w: 4, h: 4, style: "post" },
  { id: "shop", x: 3, y: 12, w: 5, h: 5, style: "shop" },
  { id: "hospital", x: 25, y: 11, w: 6, h: 6, style: "hospital" },
  { id: "sahukar", x: 3, y: 20, w: 6, h: 5, style: "sahukar" },
  { id: "panchayat", x: 13, y: 20, w: 6, h: 5, style: "panchayat" },
  { id: "work", x: 23, y: 19, w: 7, h: 6, style: "work" },
].map((b) => ({ ...b, door: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }, entrance: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h } }));

// Places that are objects rather than buildings: the notice board in the square, the field gate.
export const OBJECTS = [
  { id: "square", x: 15, y: 12, w: 1, h: 1, style: "notice" },
  { id: "field", x: 34, y: 15, w: 1, h: 1, style: "gate" },
].map((o) => ({ ...o, door: { x: o.x, y: o.y }, entrance: { x: o.x, y: o.y + 1 } }));

export const PLACES = [...BUILDINGS, ...OBJECTS];
export const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));

// Where the player starts each chapter (in front of home).
export const START = { x: 5, y: 9 };

// Deterministic per-tile noise for decoration.
export function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function buildGrid() {
  const g = Array.from({ length: H }, () => Array.from({ length: W }, () => "grass"));
  const set = (x, y, t) => {
    if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = t;
  };
  const rect = (x, y, w, h, t) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t);
  };
  const hline = (y, x1, x2) => {
    for (let x = x1; x <= x2; x++) set(x, y, "path");
  };
  const vline = (x, y1, y2) => {
    for (let y = y1; y <= y2; y++) set(x, y, "path");
  };

  // Roads: three east–west roads and three north–south lanes.
  hline(9, 2, 37);
  hline(18, 2, 37);
  hline(26, 2, 37);
  vline(2, 9, 26);
  vline(20, 9, 26);
  vline(37, 9, 26);
  // The village square with its banyan tree and well, and the pond beside it.
  rect(11, 11, 8, 6, "plaza");
  vline(15, 10, 10);
  vline(15, 17, 17);
  rect(21, 12, 3, 3, "water");
  // The cotton field, fenced, with a gate.
  rect(32, 11, 5, 4, "crop");
  for (let x = 31; x <= 37; x++) {
    set(x, 10, "fence");
    set(x, 15, "fence");
  }
  for (let y = 10; y <= 15; y++) {
    set(31, y, "fence");
    set(37, y, "path");
  }
  // Home garden fence, open at the gate.
  for (let x = 1; x <= 9; x++) if (x !== 5) set(x, 8, x === 1 || x === 9 ? "fence" : "flowers");
  for (let y = 2; y <= 8; y++) {
    set(1, y, "fence");
    set(9, y, "fence");
  }
  // Buildings, objects, their doors and front paths.
  for (const p of PLACES) {
    rect(p.x, p.y, p.w, p.h, "building");
    if (g[p.entrance.y][p.entrance.x] !== "plaza") set(p.entrance.x, p.entrance.y, "path");
    for (let y = p.entrance.y + 1; y < H && !["path", "plaza"].includes(g[y][p.entrance.x]); y++) set(p.entrance.x, y, "path");
  }
  rect(12, 11, 2, 2, "tree"); // the banyan
  set(17, 12, "well");
  // A border of trees, and scattered trees, bushes, rocks and flowers on open grass.
  for (let x = 0; x < W; x++) {
    set(x, 0, "tree");
    set(x, H - 1, "tree");
  }
  for (let y = 0; y < H; y++) {
    set(0, y, "tree");
    set(W - 1, y, "tree");
  }
  const busy = (x, y) => {
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const t = g[y + j]?.[x + i];
        if (["path", "plaza", "building", "water", "fence", "crop"].includes(t)) return true;
      }
    return false;
  };
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (g[y][x] !== "grass") continue;
      const r = hash(x, y, 7);
      if (busy(x, y)) {
        if (r < 0.12) g[y][x] = "flowers";
        continue;
      }
      if (r < 0.1) g[y][x] = "tree";
      else if (r < 0.15) g[y][x] = "bush";
      else if (r < 0.18) g[y][x] = "rock";
      else if (r < 0.3) g[y][x] = "flowers";
    }
  return g;
}

export const GRID = buildGrid();

const BLOCKED = new Set(["water", "crop", "tree", "bush", "rock", "fence", "building", "well"]);
export const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !BLOCKED.has(GRID[y][x]);

// The place whose footprint covers a tile, if any.
export function placeAt(x, y) {
  return PLACES.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) ?? null;
}

export function placeByEntrance(x, y) {
  return PLACES.find((p) => p.entrance.x === x && p.entrance.y === y) ?? null;
}

// Breadth-first path over walkable tiles, 4 directions. Returns [{x, y}, ...] excluding start.
export function findPath(from, to) {
  if (!walkable(to.x, to.y)) return null;
  const key = (x, y) => y * W + x;
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift();
    if (c.x === to.x && c.y === to.y) {
      const path = [];
      let k = key(c.x, c.y);
      while (k !== key(from.x, from.y)) {
        path.unshift({ x: k % W, y: Math.floor(k / W) });
        k = prev.get(k);
      }
      return path;
    }
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = key(n.x, n.y);
      if (!prev.has(k) && walkable(n.x, n.y)) {
        prev.set(k, key(c.x, c.y));
        queue.push(n);
      }
    }
  }
  return null;
}
