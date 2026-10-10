import test from "node:test";
import assert from "node:assert/strict";
import { ADS, lostIn, nextAd, wantsInterstitial } from "./ads.js";

function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test("ads rotate and never repeat back to back", () => {
  const r = rng(3);
  let last = null;
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const ad = nextAd(last, r);
    assert.notEqual(ad.id, last);
    seen.add(ad.id);
    last = ad.id;
  }
  assert.equal(seen.size, ADS.length);
});

test("full-screen ads are occasional: never on the first play, never twice in a row", () => {
  const r = rng(5);
  assert.equal(wantsInterstitial(0, false, () => 0), false);
  assert.equal(wantsInterstitial(3, true, () => 0), false);
  let shown = 0;
  let last = false;
  for (let i = 1; i <= 200; i++) {
    last = wantsInterstitial(i, last, r);
    if (last) shown += 1;
  }
  assert.ok(shown > 20 && shown < 100, `${shown} of 200`);
});

test("walking away before paying costs nothing; each paid step adds up", () => {
  assert.equal(lostIn("spin", ["spin", "claim"]), 0);
  assert.equal(lostIn("spin", ["spin", "claim", "pin"]), 5000);
  assert.equal(lostIn("task", ["join"]), 99);
  assert.equal(lostIn("task", ["join", "vip"]), 1098);
  assert.equal(lostIn("autopay", []), 0);
  assert.equal(lostIn("autopay", ["mandate"]), 1 + 999 * 3);
});
