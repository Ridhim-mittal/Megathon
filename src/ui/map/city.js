// The town for the first-job chapter: a 40×28 grid of six blocks between roads, with zebra
// crossings (the only way across), sidewalks, a park, and the places the job story visits.
// Tiles: road, crossing, sidewalk, lawn, parkpath, parking, terrace, fence, tree, building, deco.

import { TILE, mapHelpers, withDoors, withObjectDoors } from "./mapkit.js";
import { hash } from "./village.js";

const W = 40;
const H = 28;

const BUILDINGS = [
  { id: "shop", x: 2, y: 1, w: 8, h: 5, style: "mart" },
  { id: "hospital", x: 29, y: 1, w: 8, h: 6, style: "cityHospital" },
  { id: "home", x: 2, y: 16, w: 9, h: 7, style: "hostel" },
  { id: "bank", x: 16, y: 16, w: 8, h: 5, style: "cityBank" },
  { id: "work", x: 30, y: 16, w: 8, h: 6, style: "techPark" },
].map(withDoors);

// The park's food stall stands in for the "square" (where friends meet).
const OBJECTS = [{ id: "square", x: 21, y: 9, w: 2, h: 1, style: "stall" }].map(withObjectDoors);

const PLACES = [...BUILDINGS, ...OBJECTS];
const placeById = Object.fromEntries(PLACES.map((p) => [p.id, p]));

// Decorations that block their tiles: parked cars, an ambulance, bikes, scooters, kiosks.
export const CITY_DECO = [
  { kind: "atm", x: 10, y: 2, w: 2, h: 4 },
  { kind: "car", x: 3, y: 8, w: 1, h: 2, color: "#e05a4a" },
  { kind: "car", x: 5, y: 8, w: 1, h: 2, color: "#f4f4f0" },
  { kind: "car", x: 8, y: 8, w: 1, h: 2, color: "#4f8fe0" },
  { kind: "car", x: 10, y: 8, w: 1, h: 2, color: "#57b85a" },
  { kind: "ambulance", x: 37, y: 3, w: 1, h: 3 },
  { kind: "slide", x: 23, y: 3, w: 1, h: 2 },
  { kind: "bench", x: 17, y: 4, w: 2, h: 1 },
  { kind: "bench", x: 17, y: 10, w: 2, h: 1 },
  { kind: "planter", x: 20, y: 6, w: 1, h: 1 },
  { kind: "bikes", x: 2, y: 24, w: 3, h: 1 },
  { kind: "guard", x: 17, y: 22, w: 1, h: 1 },
  { kind: "umbrella", x: 30, y: 24, w: 1, h: 1, color: "#e8503a" },
  { kind: "umbrella", x: 32, y: 24, w: 1, h: 1, color: "#4f8fe0" },
  { kind: "scooters", x: 35, y: 24, w: 4, h: 1 },
  { kind: "busstop", x: 30, y: 10, w: 3, h: 1 },
  { kind: "planter", x: 36, y: 10, w: 1, h: 1 },
  { kind: "planter", x: 3, y: 11, w: 1, h: 1 },
  { kind: "planter", x: 9, y: 11, w: 1, h: 1 },
  { kind: "bin", x: 12, y: 7, w: 1, h: 1 },
  { kind: "bin", x: 25, y: 18, w: 1, h: 1 },
  { kind: "hydrant", x: 38, y: 7, w: 1, h: 1 },
  { kind: "hydrant", x: 15, y: 23, w: 1, h: 1 },
  { kind: "bench", x: 19, y: 24, w: 2, h: 1 },
  { kind: "planter", x: 22, y: 24, w: 1, h: 1 },
  { kind: "bin", x: 8, y: 25, w: 1, h: 1 },
];

// Street lamps on the sidewalk corners (drawn tall; they don't block).
export const LAMPS = [
  [12, 12], [15, 12], [25, 12], [28, 12], [12, 15], [15, 15], [25, 15], [28, 15], [6, 12], [33, 12], [20, 15], [33, 15],
];

function buildGrid() {
  const g = Array.from({ length: H }, () => Array.from({ length: W }, () => "sidewalk"));
  const set = (x, y, t) => {
    if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = t;
  };
  const rect = (x, y, w, h, t) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t);
  };
  // A border of trees, then the roads (which run off the map edges).
  for (let x = 0; x < W; x++) {
    set(x, 0, "tree");
    set(x, H - 1, "tree");
  }
  for (let y = 0; y < H; y++) {
    set(0, y, "tree");
    set(W - 1, y, "tree");
  }
  rect(0, 13, W, 2, "road");
  rect(13, 0, 2, H, "road");
  rect(26, 0, 2, H, "road");
  // Zebra crossings: the only way across.
  for (const x of [6, 20, 33]) rect(x, 13, 1, 2, "crossing");
  for (const y of [6, 20]) {
    rect(13, y, 2, 1, "crossing");
    rect(26, y, 2, 1, "crossing");
  }
  // Supermarket parking.
  rect(2, 7, 9, 4, "parking");
  // The park: lawn inside a fence with four gaps, crossed by two paths.
  rect(16, 2, 9, 10, "lawn");
  for (let x = 16; x <= 24; x++) {
    if (x !== 20) {
      set(x, 2, "fence");
      set(x, 11, "fence");
    }
  }
  for (let y = 2; y <= 11; y++) {
    if (y !== 7) {
      set(16, y, "fence");
      set(24, y, "fence");
    }
  }
  for (let y = 2; y <= 11; y++) set(20, y, "parkpath");
  for (let x = 16; x <= 24; x++) set(x, 7, "parkpath");
  for (const [x, y] of [[18, 3], [22, 5], [18, 8], [23, 9], [17, 6]]) set(x, y, "tree");
  // The tech park's cafe terrace.
  rect(29, 23, 6, 3, "terrace");
  // Planter trees along the sidewalks.
  for (const [x, y] of [[1, 6], [11, 11], [1, 15], [12, 25], [16, 25], [24, 25], [28, 8], [38, 9], [38, 25], [24, 22]]) set(x, y, "tree");
  for (const p of PLACES) rect(p.x, p.y, p.w, p.h, "building");
  for (const d of CITY_DECO) rect(d.x, d.y, d.w, d.h, "deco");
  return g;
}

const GRID = buildGrid();
const BLOCKED = new Set(["road", "tree", "fence", "building", "deco"]);
const helpers = mapHelpers({ W, H, GRID, PLACES, blocked: BLOCKED });

const NPCS = [
  { look: "shopkeeper", x: 8, y: 6 },
  { look: "doctor", x: 35, y: 7 },
  { look: "clerk", x: 18, y: 7 },
  { look: "banker", x: 22, y: 21 },
  { look: "worker", x: 36, y: 22 },
  { look: "agent", x: 31, y: 12 },
];

export const CITY = {
  id: "city",
  W,
  H,
  PLACES,
  placeById,
  START: { x: 6, y: 24 },
  GRID,
  ...helpers,
  npcs: NPCS,
  granny: null,
  hash,
  TILE,
};
