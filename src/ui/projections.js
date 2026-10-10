import { CFG } from "../engine/data.js";
import { houseFund, incomeFor } from "../engine/engine.js";

// Ranges, never single lines. Long-run yearly rates: low / middle / high.
const MARKET = [4, 10, 14];
const SAFE = [3, 6, 8];

function grow(start, yearly, rates, fromAge) {
  const out = [];
  let v = rates.map(() => start);
  for (let age = fromAge; age <= CFG.endAge; age++) {
    out.push({ age, lo: v[0], mid: v[1], hi: v[2] });
    v = v.map((x, i) => x * (1 + rates[i] / 100) + yearly(age));
  }
  return out;
}

export function sipProjection(life, monthly) {
  return grow(life.sip, () => monthly * 12, MARKET, life.age);
}

export function houseProjection(life) {
  const goalShare = (life.budget?.goal ?? 15) / 100;
  return grow(houseFund(life), (age) => incomeFor(life, age) * goalShare, SAFE, life.age);
}
