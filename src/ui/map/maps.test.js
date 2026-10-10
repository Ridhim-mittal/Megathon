import test from "node:test";
import assert from "node:assert/strict";
import { CITY } from "./city.js";
import { VILLAGE } from "./village.js";

for (const map of [VILLAGE, CITY]) {
  test(`${map.id} map: the start is walkable and every place can be reached on foot`, () => {
    assert.ok(map.walkable(map.START.x, map.START.y));
    for (const p of map.PLACES) {
      assert.ok(map.walkable(p.entrance.x, p.entrance.y), `${p.id} entrance is blocked`);
      assert.ok(map.findPath(map.START, p.entrance), `${p.id} cannot be reached`);
    }
  });
}

test("the city has every place the first-job story visits", () => {
  for (const id of ["home", "work", "hospital", "bank", "square"]) assert.ok(CITY.placeById[id], id);
});

test("in the city, roads can only be crossed at zebra crossings", () => {
  for (let y = 0; y < CITY.H; y++)
    for (let x = 0; x < CITY.W; x++) if (CITY.GRID[y][x] === "road") assert.equal(CITY.walkable(x, y), false);
});
