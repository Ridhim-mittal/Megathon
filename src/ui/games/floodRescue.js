// Flood Rescue: the canal bursts at Nanna's farm. Before the rains you choose: buy crop insurance
// or not. Then the water rises through the house and you have a few seconds to put four things in
// your bag: the insurance policy, Aadhaar, the bank passbook, the land papers, the emergency cash
// tin, or one of the tempting things that don't help (the TV, a silk saree, sweets, the radio).
// Whatever the water reaches floats away out of the back door. The crop is lost either way; only
// insurance brings its money back, and the papers make the claim quick. Pure logic: FloodRescue.jsx
// draws it. Field: 960×540.

export const FIELD = { w: 960, h: 540 };
export const FLOOD = {
  seconds: 25,
  bag: 4,
  crop: 120000, // the crop's worth, and the sum insured
  premium: 2400, // crop insurance for the season (2% under PMFBY)
  repairs: 30000, // the house walls
  cash: 30000, // in the emergency tin
  floor: 470, // the house floor (y)
  top: 150, // the water stops here
  grabRadius: 36,
  drift: [55, 95], // how fast floating things are carried off (px/s)
};
export const ESSENTIAL = ["policy", "aadhaar", "passbook", "land", "cash"];
export const DECOYS = ["tv", "saree", "sweets", "radio"];

// Where things sit in the house: floor, table, low shelf, cupboard, high shelf, wall hook.
export const SPOTS = [
  { x: 130, y: 452 },
  { x: 330, y: 452 },
  { x: 540, y: 452 },
  { x: 120, y: 372 },
  { x: 205, y: 372 },
  { x: 330, y: 312 },
  { x: 395, y: 312 },
  { x: 470, y: 262 },
  { x: 535, y: 262 },
  { x: 150, y: 202 },
  { x: 235, y: 202 },
  { x: 370, y: 172 },
];

// The water rises slowly, then surges.
export const levelAt = (t) => FIELD.h - (FIELD.h - FLOOD.top) * Math.pow(Math.min(1, t / FLOOD.seconds), 0.85);

export function createFlood({ insured, rng = Math.random }) {
  const kinds = [...ESSENTIAL.filter((k) => insured || k !== "policy"), ...DECOYS];
  // Shuffle the spots; every essential gets one, so some are low (urgent) and some high.
  const spots = SPOTS.map((s) => ({ ...s })).sort(() => rng() - 0.5);
  const items = kinds.map((kind, i) => ({ kind, x: spots[i].x, y: spots[i].y, homeY: spots[i].y, floating: false, lost: false, taken: false, vx: 0, bob: rng() * 6 }));
  return { insured, time: 0, level: FIELD.h, items, bag: [], phase: "flood", escapeIn: null, fx: [], rng };
}

// input: { taps: [{x, y}] }. Returns true when the flood is over.
export function stepFlood(s, dt, input = {}) {
  if (s.phase === "done") return true;
  dt = Math.min(dt, 0.1);
  s.time += dt;
  s.level = levelAt(s.time);
  for (const tap of input.taps ?? []) {
    if (s.bag.length >= FLOOD.bag) break;
    const it = s.items
      .filter((i) => !i.taken && !i.lost)
      .map((i) => ({ i, d: Math.hypot(i.x - tap.x, i.y - tap.y) }))
      .filter((o) => o.d < FLOOD.grabRadius)
      .sort((a, b) => a.d - b.d)[0]?.i;
    if (!it) continue;
    it.taken = true;
    s.bag.push(it.kind);
    s.fx.push({ kind: "grab", item: it.kind, x: it.x, y: it.y, good: ESSENTIAL.includes(it.kind) });
  }
  for (const it of s.items) {
    if (it.taken || it.lost) continue;
    if (!it.floating && s.level < it.homeY + 4) {
      it.floating = true;
      it.vx = FLOOD.drift[0] + s.rng() * (FLOOD.drift[1] - FLOOD.drift[0]);
      s.fx.push({ kind: "float", item: it.kind, x: it.x, y: it.y });
    }
    if (it.floating) {
      // Carried off by the current towards the back door, bobbing on the surface.
      it.x -= it.vx * dt;
      it.y = s.level - 6;
      if (it.x < -20) {
        it.lost = true;
        s.fx.push({ kind: "lost", item: it.kind });
      }
    }
  }
  if (s.bag.length >= FLOOD.bag && s.escapeIn == null) s.escapeIn = 0.8;
  if (s.escapeIn != null) s.escapeIn -= dt;
  if (s.time >= FLOOD.seconds || (s.escapeIn != null && s.escapeIn <= 0)) {
    s.phase = "done";
    return true;
  }
  return false;
}

// What the flood cost, and what came back.
export function floodResult(s) {
  const has = (k) => s.bag.includes(k);
  const idProof = has("aadhaar") || has("passbook");
  // Insured: the claim pays the crop. Without the policy or any ID it is slow and pays half for now.
  const claimShare = !s.insured ? 0 : (has("policy") ? 1 : 0.5) * (idProof ? 1 : 0.6);
  const claim = Math.round(FLOOD.crop * claimShare);
  const fromTin = has("cash") ? Math.min(FLOOD.cash, FLOOD.repairs) : 0;
  const loan = FLOOD.repairs - fromTin;
  const saved = s.bag.filter((k) => ESSENTIAL.includes(k)).length;
  const lost = FLOOD.crop - claim + loan + (s.insured ? FLOOD.premium : 0);
  const stars = (s.insured ? 1 : 0) + (has("policy") || (idProof && has("land")) ? 1 : 0) + (has("cash") ? 1 : 0);
  return { insured: s.insured, bag: [...s.bag], saved, claim, claimShare, fromTin, loan, lost, stars, decoys: s.bag.filter((k) => DECOYS.includes(k)).length };
}
