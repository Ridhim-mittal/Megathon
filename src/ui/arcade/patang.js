// Patang Market: a Flappy Bird-style kite flight through a stock chart (lessons L17, L19).
// Pure logic (no DOM). The gaps between the candles follow the market's price over ten years,
// with one crash. Each ₹500 coin buys units at that moment's price, so coins in a dip buy more.
// Hitting a candle, the ground or a "SELL NOW!" bubble means quitting: everything is sold at
// that moment's price. Flying through all ten years means you stayed invested.
// One "breathe" shield per run forgives one hit.

export const PATANG = {
  w: 480,
  h: 270,
  kiteX: 110,
  gravity: 520,
  flap: -168, // one flap lifts the kite about 27 px
  maxFall: 260,
  speed: 125, // px per second
  spacing: 150, // px between candles
  candles: 44, // ~4 per year, about 53 s
  years: 10,
  coin: 500,
  candleW: 34,
  top: 34, // highest gap centre
  bottom: 214, // lowest gap centre
  gap: { calm: 106, crash: 96 },
  kiteR: 9,
  start: 100, // price at year 0
  shieldSeconds: 1.4,
};

// The market for one run: a rising, wobbly price with one crash and its recovery.
export function marketPath(rng, n = PATANG.candles) {
  const crashAt = 14 + Math.floor(rng() * 10); // somewhere in years 3–6
  const prices = [];
  let p = PATANG.start;
  for (let i = 0; i < n; i++) {
    const inCrash = i > crashAt && i <= crashAt + 5;
    const recovering = i > crashAt + 5 && i <= crashAt + 14;
    const drift = inCrash ? -0.085 : recovering ? 0.045 : 0.012;
    const wobble = (rng() - 0.5) * (inCrash ? 0.06 : 0.07);
    if (i > 0) p = Math.max(25, p * (1 + drift + wobble));
    prices.push(Math.round(p * 100) / 100);
  }
  return { prices, crashAt, crash: [crashAt + 1, crashAt + 5] };
}

export function createPatang(rng = Math.random) {
  const market = marketPath(rng);
  const lo = Math.min(...market.prices);
  const hi = Math.max(...market.prices);
  const yOf = (price) => PATANG.bottom - ((price - lo) / Math.max(1, hi - lo)) * (PATANG.bottom - PATANG.top);
  const candles = market.prices.map((price, i) => {
    const inCrash = i >= market.crash[0] && i <= market.crash[1];
    const gap = inCrash ? PATANG.gap.crash : PATANG.gap.calm;
    const y = yOf(price);
    const things = [{ kind: "coin", dy: (rng() - 0.5) * gap * 0.3, taken: false }];
    // Panic news in the crash, a "10x" tip rocket near the peaks: each sits in one half of the
    // gap, so the other half is the clear way through (and the coin moves there).
    const side = rng() < 0.5 ? -1 : 1;
    if (inCrash && rng() < 0.7) things.push({ kind: "panic", dy: side * gap * 0.27, taken: false });
    else if (!inCrash && i > 4 && price > hi * 0.82 && rng() < 0.4) things.push({ kind: "rocket", dy: side * gap * 0.27, taken: false });
    if (things.length > 1) things[0].dy = -side * gap * 0.18;
    return { i, price, y, gap, up: i === 0 || price >= market.prices[i - 1], inCrash, things };
  });
  return {
    id: "patangMarket",
    time: 0,
    kite: { y: candles[0].y, vy: 0 },
    scroll: 0, // world x at the kite
    candles,
    market,
    shield: 1,
    safeFor: 0,
    units: 0,
    invested: 0,
    buys: [],
    pops: [],
    exit: null, // { reason: "stayed" | "crashed" | "panic", index, price }
    rng,
  };
}

// The candle at world position x (the kite's), and the world x of candle i.
export const candleX = (i) => 220 + i * PATANG.spacing;
const at = (s) => Math.max(0, Math.min(s.candles.length - 1, Math.round((s.scroll - 220) / PATANG.spacing)));
export const yearOf = (i) => Math.min(PATANG.years, 1 + Math.floor((i / PATANG.candles) * PATANG.years));

function quit(s, reason) {
  const c = s.candles[at(s)];
  s.exit = { reason, index: c.i, price: c.price };
}

export function stepPatang(s, dt, input = {}) {
  if (s.exit) return true;
  dt = Math.min(dt, 0.05);
  s.time += dt;
  s.safeFor = Math.max(0, s.safeFor - dt);
  const k = s.kite;
  if (input.flap) k.vy = PATANG.flap;
  k.vy = Math.min(PATANG.maxFall, k.vy + PATANG.gravity * dt);
  k.y += k.vy * dt;
  s.scroll += PATANG.speed * dt;
  for (const p of s.pops) p.t += dt;
  s.pops = s.pops.filter((p) => p.t < 1);

  // Past the last candle: you stayed invested for all ten years.
  if (s.scroll > candleX(s.candles.length - 1) + 60) {
    const last = s.candles[s.candles.length - 1];
    s.exit = { reason: "stayed", index: last.i, price: last.price };
    return true;
  }

  const hit = () => {
    if (s.safeFor > 0) return false;
    if (s.shield > 0) {
      s.shield -= 1;
      s.safeFor = PATANG.shieldSeconds;
      k.vy = PATANG.flap * 0.7;
      s.pops.push({ x: PATANG.kiteX, y: k.y - 16, text: "breathe", kind: "shield", t: 0 });
      return false;
    }
    return true;
  };

  // The sky's edge is soft (the string holds the kite); the ground is not.
  if (k.y < 6) {
    k.y = 6;
    k.vy = Math.max(0, k.vy);
  }
  if (k.y > PATANG.h - 10) {
    k.y = PATANG.h - 10;
    if (hit()) {
      quit(s, "crashed");
      return true;
    }
  }

  for (const c of s.candles) {
    const cx = candleX(c.i) - s.scroll + PATANG.kiteX;
    if (cx < -60 || cx > PATANG.w + 60) continue;
    // The candle: solid above and below its gap.
    if (Math.abs(cx - PATANG.kiteX) < PATANG.candleW / 2 + PATANG.kiteR - 3) {
      const top = c.y - c.gap / 2;
      const bottom = c.y + c.gap / 2;
      if ((k.y - PATANG.kiteR + 3 < top || k.y + PATANG.kiteR - 3 > bottom) && hit()) {
        quit(s, "crashed");
        return true;
      }
    }
    for (const t of c.things) {
      if (t.taken) continue;
      const tx = cx + (t.x ?? 0);
      const ty = c.y + t.dy;
      if (Math.hypot(tx - PATANG.kiteX, ty - k.y) > PATANG.kiteR + (t.kind === "coin" ? 10 : 9)) continue;
      t.taken = true;
      if (t.kind === "coin") {
        const units = PATANG.coin / c.price;
        s.units += units;
        s.invested += PATANG.coin;
        s.buys.push({ i: c.i, price: c.price, units });
        s.pops.push({ x: tx, y: ty - 12, text: `+${units.toFixed(1)}`, kind: c.price < PATANG.start ? "cheap" : "coin", t: 0 });
      } else if (t.kind === "rocket") {
        k.vy = -270; // FOMO: a sudden jump, usually into the candle above
        s.pops.push({ x: tx, y: ty - 12, text: "10x?!", kind: "rocket", t: 0 });
      } else if (t.kind === "panic") {
        quit(s, "panic");
        return true;
      }
    }
  }
  return false;
}

// What the run was worth, and what staying (or quitting at the bottom) would have been worth.
export function patangResult(s) {
  const prices = s.market.prices;
  const final = prices[prices.length - 1];
  const exitPrice = s.exit?.price ?? final;
  const value = Math.round(s.units * exitPrice);
  const bottomIdx = prices.indexOf(Math.min(...prices.slice(s.market.crash[0], s.market.crash[1] + 6)));
  const unitsBy = (i) => s.buys.filter((b) => b.i <= i).reduce((a, b) => a + b.units, 0);
  const cheap = s.buys.filter((b) => b.price < PATANG.start);
  return {
    score: value,
    invested: s.invested,
    coins: s.buys.length,
    reason: s.exit?.reason ?? "stayed",
    report: {
      prices,
      crash: s.market.crash,
      buys: s.buys.map((b) => ({ i: b.i, units: b.units })),
      exitIndex: s.exit?.index ?? prices.length - 1,
      value,
      stayValue: Math.round(s.units * final),
      bottomValue: Math.round(unitsBy(bottomIdx) * prices[bottomIdx]),
      bottomIndex: bottomIdx,
      avgUnitsCheap: cheap.length ? cheap.reduce((a, b) => a + b.units, 0) / cheap.length : 0,
      avgUnitsDear: s.buys.length - cheap.length ? s.buys.filter((b) => b.price >= PATANG.start).reduce((a, b) => a + b.units, 0) / (s.buys.length - cheap.length) : 0,
    },
  };
}
