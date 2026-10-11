// Every Swipe Bazaar item has a 16×16 sprite that only uses its own palette.
import test from "node:test";
import assert from "node:assert/strict";
import { SPRITES, spriteId } from "./swipeSprites.js";
import { SWIPE_CONFIG as C } from "./swipeBazaarConfig.js";

test("every item has a sprite", () => {
  for (const d of [...C.needs, ...C.wants, ...C.emiItems]) assert.ok(SPRITES[spriteId("x", d)], d.id);
  assert.ok(SPRITES[spriteId("coin")]);
  assert.ok(SPRITES[spriteId("loan")]);
});

test("sprites are 16×16 and use only their palette", () => {
  for (const [id, sp] of Object.entries(SPRITES)) {
    assert.equal(sp.px.length, 16, `${id}: rows`);
    sp.px.forEach((row, y) => {
      assert.equal(row.length, 16, `${id}: row ${y} is ${row.length} wide`);
      for (const ch of row) assert.ok(ch === "." || ch === "k" || sp.pal[ch], `${id}: unknown colour "${ch}"`);
    });
  }
});
