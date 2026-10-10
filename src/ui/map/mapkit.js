// Shared helpers for tile maps (the village, the city): walkability, places and path finding.

export const TILE = 16;

// Door and entrance tiles for buildings (door in the front wall) and objects (in front of them).
export const withDoors = (b) => ({ ...b, door: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }, entrance: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h } });
export const withObjectDoors = (o) => ({ ...o, door: { x: o.x + Math.floor((o.w - 1) / 2), y: o.y }, entrance: { x: o.x + Math.floor((o.w - 1) / 2), y: o.y + o.h } });

export function mapHelpers({ W, H, GRID, PLACES, blocked }) {
  const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !blocked.has(GRID[y][x]);

  // The place whose footprint covers a tile, if any.
  const placeAt = (x, y) => PLACES.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) ?? null;
  const placeByEntrance = (x, y) => PLACES.find((p) => p.entrance.x === x && p.entrance.y === y) ?? null;

  // Breadth-first path over walkable tiles, 4 directions. Returns [{x, y}, ...] excluding start.
  function findPath(from, to) {
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

  return { walkable, placeAt, placeByEntrance, findPath };
}
