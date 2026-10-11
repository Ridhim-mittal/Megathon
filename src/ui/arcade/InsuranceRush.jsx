import React, { useEffect, useRef, useState } from "react";
import { useT, formatMoney } from "../../i18n/index.jsx";
import { setEngine, sounds, startEngine, stopEngine } from "../sound.js";

// Insurance Rush (L16 Insurance basics): an endless top-down drive in a pixel-art road scene.
// A policy lasts 12 seconds; while it's active every crash is a claim that repairs the car and
// you keep going. Renew it with a shield, which costs a small premium in coins (no coins, no
// renewal). Crash with an expired policy and the run ends. It keeps getting faster and busier,
// and shields get rarer, but there is always a way through.
//
// Arcade contract (like ScamSmash): <InsuranceRush running onEnd />. `running` is false during
// the countdown; onEnd(state) gets { id: "insuranceRush", score, distance, claims, renewals }.

// ---------- world ----------
const W = 420;
const H = 420;
const PX = 3; // one sprite pixel = 3 screen pixels (scenery, pickups)
const VPX = 4; // vehicles and road hazards are drawn a size bigger
const GRASS = 78;
const CURB = 8;
const ROAD_X = GRASS + CURB;
const ROAD_W = W - ROAD_X * 2;
const LANES = 3;
const LANE_W = ROAD_W / LANES;
const laneX = (lane) => ROAD_X + lane * LANE_W + LANE_W / 2;

// ---------- rules ----------
const POLICY_SECONDS = 12; // how long one policy lasts
const PREMIUM = 3; // coins per renewal
const REPAIR_BILL = 45000;
const COIN_CHANCE = 0.46; // a coin in the open lane (when no shield)
// Difficulty rises with score but levels off (0 at the start, approaching 1), so the game gets
// steadily harder without ever becoming impossible.
const progress = (score) => 1 - Math.exp(-score / 1800);
const speedFor = (score) => 265 + 400 * progress(score); // road speed, px/s: 265 → 665
const rowGapFor = (score) => 290 - 70 * progress(score); // px between obstacle rows: 290 → 220
const insuranceChanceFor = (score) => 0.16 - 0.12 * progress(score); // shields per row: 16% → 4%
const doubleBlockChanceFor = (score) => 0.5 * progress(score); // two lanes blocked: 0% → 50%
const steerBoostFor = (score) => 1 + 0.35 * progress(score); // steering keeps up with the speed
const HAZARD_SPEED = 0.72; // hazards move slower than the scenery: traffic is driving too

// ---------- steering (smooth) ----------
const STEER_ACCEL = 2600; // px/s² while a key is held
const STEER_MAX = 330; // px/s sideways
const STEER_DAMP = 7; // how quickly sideways speed fades when you let go

// ---------- pixel sprites ----------
// Characters map to colours; "." is transparent. B/D/L are the car's body, dark and light shades.
const BASE = {
  k: "#1f1a2a",
  W: "#4d7fc9",
  w: "#a9d2f5",
  y: "#fff3a0",
  r: "#e23b3b",
  s: "#f4f1e8",
  g: "#8a8a94",
  G: "#5c5c66",
};

const SEDAN = [
  "...kkkkkkkk...",
  "..kyLBBBBLyk..",
  "..kBLBBBBLBk..",
  "..kBBBBBBBBk..",
  "kkkBBBBBBBBkkk",
  "kkkBBBBBBBBkkk",
  "kkkBWWWWWWBkkk",
  "..kBWwwWWWBk..",
  "..kBWWWWWWBk..",
  "..kDDDDDDDDk..",
  "..kDLLLLLLDk..",
  "..kDLLLLLLDk..",
  "..kDLLLLLLDk..",
  "..kDDDDDDDDk..",
  "..kBWWWWWWBk..",
  "..kBWWWWWWBk..",
  "kkkBBBBBBBBkkk",
  "kkkBBBBBBBBkkk",
  "kkkBBBBBBBBkkk",
  "..kBBBBBBBBk..",
  "..krBBBBBBrk..",
  "...kkkkkkkk...",
];
const VAN = [
  "...kkkkkkkk...",
  "..kyBBBBBByk..",
  "..kBBBBBBBBk..",
  "kkkBWWWWWWBkkk",
  "kkkBWwwWWWBkkk",
  "kkkBWWWWWWBkkk",
  "..kLLLLLLLLk..",
  "..kLBBBBBBLk..",
  "..kLBDDDDBLk..",
  "..kLBBBBBBLk..",
  "..kLBDDDDBLk..",
  "..kLBBBBBBLk..",
  "..kLBDDDDBLk..",
  "..kLBBBBBBLk..",
  "..kLBDDDDBLk..",
  "..kLBBBBBBLk..",
  "..kLBBBBBBLk..",
  "kkkLBBBBBBLkkk",
  "kkkLBBBBBBLkkk",
  "kkkLBBBBBBLkkk",
  "..kLLLLLLLLk..",
  "..kBWWWWWWBk..",
  "..krBBBBBBrk..",
  "...kkkkkkkk...",
];
const TRUCK = [
  "...kkkkkkkk...",
  "..kyBBBBBByk..",
  "kkkBBBBBBBBkkk",
  "kkkBWWWWWWBkkk",
  "kkkBWwwWWWBkkk",
  "..kBBBBBBBBk..",
  "..kkkkkkkkkk..",
  "..kgggggggGk..",
  "..kgGGGGGGGk..",
  "..kgggggggGk..",
  "kkkgGGGGGGGkkk",
  "kkkgggggggGkkk",
  "kkkgGGGGGGGkkk",
  "..kgggggggGk..",
  "..kgGGGGGGGk..",
  "..kgggggggGk..",
  "..kgGGGGGGGk..",
  "kkkgggggggGkkk",
  "kkkgGGGGGGGkkk",
  "kkkgggggggGkkk",
  "..krgggggGrk..",
  "...kkkkkkkk...",
];
// The player's car: a red sedan with white racing stripes down the middle.
const PLAYER = SEDAN.map((row) => [...row].map((c, x) => ((x === 6 || x === 7) && "BDL".includes(c) ? "s" : c)).join(""));

const TRAFFIC = [
  { rows: SEDAN, pal: { B: "#f2c230", D: "#c99a12", L: "#ffe27a" } }, // yellow taxi
  { rows: VAN, pal: { B: "#2fb8b0", D: "#1d8a84", L: "#7fe0d9" } }, // teal van
  { rows: SEDAN, pal: { B: "#3b6fd1", D: "#28509e", L: "#7ea4ec" } }, // blue sedan
  { rows: TRUCK, pal: { B: "#e07a2f", D: "#a8551a", L: "#f2a86b" } }, // orange truck
  { rows: SEDAN, pal: { B: "#8a52c7", D: "#633a96", L: "#b893e0" } }, // purple sedan
  { rows: VAN, pal: { B: "#e8e2d4", D: "#bdb6a6", L: "#ffffff" } }, // white van
];

const HAZARDS = {
  pothole: { rows: ["...kkkkk....", ".kkGGGGGkk..", "kGGkkkkGGGk.", "kGkkkkkkkGk.", "kGGkkkkkGGk.", ".kkGGGGGkk..", "...kkkkk...."], label: "a pothole" },
  oil: { rows: ["....kkkk......", "..kkkkkkkk.kk.", ".kkkkPkkkkkkkk", "kkkkkkkkkPkkk.", ".kkkPkkkkkkkk.", "..kkkkkkkkk...", "....kkk.kk...."], pal: { P: "#5b4a7a" }, label: "an oil spill" },
  cone: { rows: ["...kk...", "..kOOk..", "..kssk..", ".kOOOOk.", ".kssssk.", "kOOOOOOk", "kkkkkkkk"], pal: { O: "#f08a24" }, label: "a traffic cone" },
};

const SHIELD = ["kkkkkkkkkk", "kTTTTTTTTk", "kTTTTTTTTk", "kTTTTTTwTk", "kTTTTTwwTk", "kTwTTwwTTk", ".kTwwwTTk.", ".kTTwTTTk.", "..kTTTTk..", "...kTTk...", "....kk...."];
const COIN = ["..kkkk..", ".kYYYYk.", "kYyyYYYk", "kYyYYYYk", "kYYYYYQk", "kYYYYQQk", ".kYQQQk.", "..kkkk.."];
const WRENCH = [".kk...kk", "kssk.kss", ".ksskssk", "..kssskk", "..ksssk.", ".kssk...", "kssk....", "ksk.....", ".k......"];

const PINE = [".....kk.....", "....kGGk....", "...kGHGGk...", "...kGGGGk...", "..kGHGGGGk..", "..kGGGGGGk..", ".kGHGGGGGGk.", ".kGGGGGGGGk.", "kGHGGGGGGGGk", "kGGGGGGGGGGk", ".kkkkkkkkkk.", ".....kk.....", ".....bb.....", ".....bb....."];
const ROUND = ["....kkkkk.....", "..kkGGGGGkk...", ".kGGHHGGGGGk..", ".kGHHGGGGGGk..", "kGGHGGGGGGGGk.", "kGGGGGGGGGGGk.", "kGGGGGGGGGGGk.", ".kGGGGGGGGGk..", "..kkGGGGGkk...", "....kkbkk.....", ".....kbk......", "....SSSSS.....", "...SSSSSSS...."];
const BUSH = ["..kkkk..", ".kGHGGk.", "kGHGGGGk", "kGGGGGGk", ".kkkkkk."];
const HOUSE = ["..kkkkkkkkkk..", ".kRRRRRRRRRRk.", "kRRRRRRRRRRRRk", "kRrRrRrRrRrRRk", "kkkkkkkkkkkkkk", ".kssssssssssk.", ".ksWWsskkssWk.", ".ksWWsskbkssk.", ".ksssskbbkssk.", ".kkkkkkkkkkkk."];
const POND = ["....kkkkkkk.....", "..kkUUUUUUUkk...", ".kUUuuUUUUUUUk..", "kUUUUUUUuuUUUUk.", "kUUUUUUUUUUUUUk.", ".kkUUUUUUUUUkk..", "...kkkkkkkkk...."];
const FLOWERS = ["P.Y..", ".....", "..P.Y", "Y...."];
const FENCE = ["b.", "bb", "b.", "b.", "bb", "b."];
const SCENE_PAL = { G: "#3f8f3a", H: "#6cc35a", b: "#7a4a24", S: "rgba(0,0,0,0.18)", R: "#b9352b", r: "#8d2620", U: "#3d8fd6", u: "#8fc7f2", P: "#f25f8a", Y: "#ffd23f", T: "#0a8fa3", Q: "#c98a12" };

function makeSprite(rows, pal = {}, px = PX) {
  const colors = { ...BASE, ...SCENE_PAL, ...pal };
  const c = document.createElement("canvas");
  c.width = rows[0].length * px;
  c.height = rows.length * px;
  const ctx = c.getContext("2d");
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = colors[ch] ?? "#ff00ff";
      ctx.fillRect(x * px, y * px, px, px);
    }),
  );
  return c;
}

// A tile of road texture or grass texture, scrolled to make motion.
function makeTile(w, h, base, dots) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (const [color, n] of dots) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) ctx.fillRect(Math.floor((Math.random() * w) / PX) * PX, Math.floor((Math.random() * h) / PX) * PX, PX, PX);
  }
  return c;
}

export function InsuranceRush({ running, onEnd }) {
  const { t } = useT();
  const tr = (key, vars) => t(`arcade.rush.${key}`, vars);
  const canvasRef = useRef(null);
  const game = useRef(null);
  const input = useRef({ left: false, right: false });
  const runningRef = useRef(running);
  const onEndRef = useRef(onEnd);
  const trRef = useRef(tr);
  runningRef.current = running;
  onEndRef.current = onEnd;
  trRef.current = tr;
  const [hud, setHud] = useState({ score: 0, coins: 0, policy: POLICY_SECONDS, claims: 0, state: "running", message: null });

  useEffect(() => {
    // Sprites are drawn once into small canvases, then stamped every frame.
    const S = {
      player: makeSprite(PLAYER, { B: "#d6342c", D: "#a3221c", L: "#f06a5f" }, VPX),
      wreck: makeSprite(PLAYER, { B: "#7a7470", D: "#5a5450", L: "#9a948f", s: "#b0aaa5" }, VPX),
      traffic: TRAFFIC.map((t) => makeSprite(t.rows, t.pal, VPX)),
      hazard: Object.fromEntries(Object.entries(HAZARDS).map(([k, h]) => [k, makeSprite(h.rows, h.pal, VPX)])),
      shield: makeSprite(SHIELD, { w: "#ffffff" }),
      shieldGrey: makeSprite(SHIELD, { T: "#8a8a94", w: "#d0d0d6" }), // can't afford it
      coin: makeSprite(COIN, { y: "#fff6b0" }),
      wrench: makeSprite(WRENCH, { s: "#d9dde3" }),
      scenery: {
        pine: makeSprite(PINE, { G: "#2f7a3a", H: "#4fae54" }),
        round: makeSprite(ROUND),
        bush: makeSprite(BUSH),
        house: makeSprite(HOUSE),
        pond: makeSprite(POND),
        flowers: makeSprite(FLOWERS),
        fence: makeSprite(FENCE),
      },
      road: makeTile(ROAD_W, 120, "#4a4a52", [["#55555e", 260], ["#404048", 200]]),
      grass: makeTile(GRASS, 120, "#5fb043", [["#6fc451", 90], ["#52983a", 70]]),
    };
    const SCENE_KINDS = ["pine", "pine", "round", "round", "bush", "bush", "flowers", "flowers", "house", "pond", "fence"];
    const CAR_Y = H - S.player.height - 18;
    const halfCar = S.player.width / 2;
    const minX = ROAD_X + halfCar + 2;
    const maxX = ROAD_X + ROAD_W - halfCar - 2;

    const g = {
      x: laneX(1),
      vx: 0,
      objects: [],
      scenery: [],
      score: 0,
      coins: 0,
      policy: POLICY_SECONDS, // seconds of cover left; you start with a fresh policy
      claims: 0,
      renewals: 0,
      rowIn: 150, // px until the next obstacle row
      safeLane: 1, // a lane that was open in the last row (keeps a path through)
      sinceShield: 0, // seconds since a renewal shield last appeared
      roadY: 0,
      state: "running", // running | repairing | over
      repairT: 0,
      invuln: 0,
      shake: 0,
      particles: [],
      popups: [],
      endReason: null,
    };
    game.current = g;

    // Scenery on both verges; new pieces appear above the screen as old ones scroll away.
    const addScenery = (y) => {
      const kind = SCENE_KINDS[Math.floor(Math.random() * SCENE_KINDS.length)];
      const spr = S.scenery[kind];
      const room = Math.max(0, GRASS - spr.width - 8);
      const x = Math.random() < 0.5 ? 4 + Math.random() * room : W - GRASS + 4 + Math.random() * room;
      g.scenery.push({ kind, x, y });
    };
    for (let y = -40; y < H; y += 34) addScenery(y);

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const popup = (text, color) => g.popups.push({ text, color, t: 0 });
    const tr = (key, vars) => trRef.current(key, vars);

    const spawnRow = () => {
      // The open lane is always next to (or the same as) the last row's open lane, so there is
      // always a way through, even when two lanes are blocked.
      const near = [0, 1, 2].filter((l) => Math.abs(l - g.safeLane) <= 1);
      const free = near[Math.floor(Math.random() * near.length)];
      g.safeLane = free;
      const others = [0, 1, 2].filter((l) => l !== free).sort(() => Math.random() - 0.5);
      const blocks = Math.random() < doubleBlockChanceFor(g.score) ? 2 : 1; // never all three
      for (let k = 0; k < blocks; k++) {
        const lane = others[k];
        if (Math.random() < 0.72) {
          const spr = S.traffic[Math.floor(Math.random() * TRAFFIC.length)];
          g.objects.push({ kind: "car", sprite: spr, label: "another car", x: laneX(lane) + (Math.random() - 0.5) * 8, y: -spr.height, w: spr.width, h: spr.height });
        } else {
          const key = Object.keys(HAZARDS)[Math.floor(Math.random() * 3)];
          const spr = S.hazard[key];
          g.objects.push({ kind: "hazard", sprite: spr, label: HAZARDS[key].label, x: laneX(lane) + (Math.random() - 0.5) * 14, y: -spr.height, w: spr.width, h: spr.height });
        }
      }
      // Shields get rarer. If none has appeared for a while, one is sent, but only after the
      // policy has already lapsed for a few seconds: driving uninsured is the risk.
      const r = Math.random();
      const due = g.sinceShield > POLICY_SECONDS + 3;
      if (due || r < insuranceChanceFor(g.score)) {
        g.sinceShield = 0;
        g.objects.push({ kind: "insurance", sprite: S.shield, x: laneX(free), y: -40, w: S.shield.width, h: S.shield.height });
      } else if (r < COIN_CHANCE) g.objects.push({ kind: "coin", sprite: S.coin, x: laneX(free), y: -30, w: S.coin.width, h: S.coin.height });
    };

    const crash = (ob) => {
      g.shake = 0.35;
      g.vx = 0;
      sounds.crash();
      for (let i = 0; i < 22; i++)
        g.particles.push({ x: g.x, y: CAR_Y + 30, vx: (Math.random() - 0.5) * 280, vy: -Math.random() * 280, t: 0, c: ["#3a3a40", "#f4a261", "#ffd23f", "#77777f"][i % 4] });
      if (g.policy > 0) {
        g.claims += 1;
        g.state = "repairing";
        g.repairT = 1.5;
        popup(tr("claim"), "#23784a");
      } else {
        g.state = "over";
        g.endReason = ob.label;
        popup(tr("notInsuredPop"), "#b4372f");
      }
    };

    let raf;
    let last = performance.now();
    let hudTick = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = speedFor(g.score);
      const live = runningRef.current; // frozen during the arcade's countdown
      const moving = live && g.state === "running";

      // Smooth steering: accelerate while held, glide to a stop when released.
      if (moving) {
        const dir = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0);
        const boost = steerBoostFor(g.score);
        g.vx += dir * STEER_ACCEL * boost * dt;
        g.vx *= Math.exp(-STEER_DAMP * dt * (dir ? 0.35 : 1));
        g.vx = Math.max(-STEER_MAX * boost, Math.min(STEER_MAX * boost, g.vx));
        // Hard steering at full sideways speed: the tyres screech (a drift).
        if (dir && Math.abs(g.vx) > STEER_MAX * boost * 0.9) sounds.screech();
        g.x += g.vx * dt;
        if (g.x < minX || g.x > maxX) {
          g.x = Math.max(minX, Math.min(maxX, g.x));
          g.vx *= -0.25; // soft bump off the curb
        }
        g.score += speed * dt * 0.1;
        g.policy = Math.max(0, g.policy - dt);
        g.invuln = Math.max(0, g.invuln - dt);
        g.sinceShield += dt;
        g.rowIn -= speed * HAZARD_SPEED * dt; // rows are spaced by distance, so there's always room
        if (g.rowIn <= 0) {
          spawnRow();
          g.rowIn = rowGapFor(g.score);
        }
      } else if (live && g.state === "repairing") {
        g.repairT -= dt;
        if (g.repairT <= 0) {
          g.state = "running";
          g.invuln = 1.6;
          g.objects = g.objects.filter((o) => o.y + o.h < CAR_Y - 120); // clear the crash site
        }
      }
      g.shake = Math.max(0, g.shake - dt);

      // The engine hums with the speed while driving; traffic honks now and then.
      if (moving) {
        startEngine();
        setEngine(progress(g.score));
        if (Math.random() < dt * 0.06) sounds.horn();
      } else stopEngine();
      if (moving) {
        g.roadY = (g.roadY + speed * dt) % 120;
        for (const sc of g.scenery) sc.y += speed * dt;
        g.scenery = g.scenery.filter((sc) => sc.y < H + 10);
        while (g.scenery.length < 26) addScenery(Math.min(H, ...g.scenery.map((s) => s.y)) - 30 - Math.random() * 20);
      }

      // Move things and check what the car touches (a slightly forgiving box).
      const car = { l: g.x - halfCar + 5, r: g.x + halfCar - 5, t: CAR_Y + 6, b: CAR_Y + S.player.height - 6 };
      for (const o of g.objects) {
        if (moving) o.y += speed * (o.kind === "car" || o.kind === "hazard" ? HAZARD_SPEED : 1) * dt;
        if (o.done || !moving) continue;
        if (o.kind === "car" && !o.passed && o.y > CAR_Y + S.player.height) {
          o.passed = true;
          sounds.pass();
        }
        const hit = o.x - o.w / 2 + 3 < car.r && o.x + o.w / 2 - 3 > car.l && o.y + 4 < car.b && o.y + o.h - 4 > car.t;
        if (!hit) continue;
        if (o.kind === "coin") {
          o.done = true;
          g.coins += 1;
          sounds.coin();
        } else if (o.kind === "insurance") {
          if (g.policy > POLICY_SECONDS - 1) {
            if (!o.told) popup(tr("full"), "#0a8fa3");
            o.told = true;
          } else if (g.coins < PREMIUM) {
            if (!o.told) popup(tr("need", { n: PREMIUM, have: g.coins }), "#b4372f");
            o.told = true;
          } else {
            o.done = true;
            g.renewals += 1;
            g.policy = POLICY_SECONDS;
            g.coins -= PREMIUM;
            sounds.chime();
            popup(tr("renewed", { s: POLICY_SECONDS, n: PREMIUM }), "#0a8fa3");
          }
        } else if (g.invuln <= 0) {
          o.done = true;
          crash(o);
        }
      }
      g.objects = g.objects.filter((o) => o.y < H + 20 && !(o.done && (o.kind === "coin" || o.kind === "insurance")));
      for (const p of g.particles) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 520 * dt;
      }
      g.particles = g.particles.filter((p) => p.t < 1);
      for (const p of g.popups) p.t += dt;
      g.popups = g.popups.filter((p) => p.t < 1.8);

      // ---------- draw ----------
      ctx.save();
      if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 24 * g.shake, (Math.random() - 0.5) * 24 * g.shake);

      // Grass verges and road texture, scrolling.
      for (let y = -120 + g.roadY; y < H; y += 120) {
        ctx.drawImage(S.grass, 0, Math.round(y));
        ctx.drawImage(S.grass, W - GRASS, Math.round(y));
        ctx.drawImage(S.road, ROAD_X, Math.round(y));
      }
      // Stone curbs: light blocks with dark gaps.
      for (const cx of [GRASS, W - GRASS - CURB]) {
        ctx.fillStyle = "#d8d8de";
        ctx.fillRect(cx, 0, CURB, H);
        ctx.fillStyle = "#9a9aa4";
        for (let y = -12 + (g.roadY % 12); y < H; y += 12) ctx.fillRect(cx, Math.round(y), CURB, 3);
      }
      // Yellow lane dashes.
      ctx.fillStyle = "#f2c230";
      for (let l = 1; l < LANES; l++) for (let y = -60 + (g.roadY % 60); y < H; y += 60) ctx.fillRect(Math.round(ROAD_X + l * LANE_W - 3), Math.round(y), 6, 30);

      for (const sc of g.scenery) ctx.drawImage(S.scenery[sc.kind], Math.round(sc.x), Math.round(sc.y));

      for (const o of g.objects) {
        if (o.done && o.kind !== "car" && o.kind !== "hazard") continue;
        let y = o.y;
        if (o.kind === "insurance") {
          y += Math.sin(now / 160) * 3;
          const afford = g.coins >= PREMIUM;
          ctx.fillStyle = afford ? "rgba(10,143,163,0.25)" : "rgba(120,120,130,0.2)"; // glow
          ctx.fillRect(Math.round(o.x - o.w / 2 - 6), Math.round(y - 6), o.w + 12, o.h + 12);
          ctx.drawImage(afford ? S.shield : S.shieldGrey, Math.round(o.x - o.w / 2), Math.round(y));
          ctx.font = "bold 12px system-ui, sans-serif"; // price tag
          ctx.textAlign = "center";
          ctx.fillStyle = "#1f1a2a";
          ctx.fillRect(Math.round(o.x - 16), Math.round(y + o.h + 3), 32, 15);
          ctx.fillStyle = afford ? "#ffd23f" : "#c9c4bd";
          ctx.fillText(`${PREMIUM} 🪙`, Math.round(o.x), Math.round(y + o.h + 14));
          continue;
        }
        if (o.kind === "coin") {
          const sx = Math.max(0.25, Math.abs(Math.cos(now / 180))); // spin
          ctx.drawImage(o.sprite, Math.round(o.x - (o.w * sx) / 2), Math.round(y), Math.round(o.w * sx), o.h);
          continue;
        }
        if (o.done && o.kind === "car") ctx.globalAlpha = 0.55; // the car you hit
        ctx.drawImage(o.sprite, Math.round(o.x - o.w / 2), Math.round(y));
        ctx.globalAlpha = 1;
      }

      // The player's car leans into turns.
      const blink = g.invuln > 0 && Math.floor(now / 90) % 2;
      if (!blink) {
        ctx.save();
        ctx.translate(Math.round(g.x), Math.round(CAR_Y + S.player.height / 2));
        ctx.rotate(Math.max(-0.2, Math.min(0.2, (g.vx / STEER_MAX) * 0.16)));
        const spr = g.state === "running" ? S.player : S.wreck;
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        ctx.restore();
      }
      if (g.policy > 0 && g.state === "running") {
        const low = g.policy < 4;
        if (!low || Math.floor(now / 180) % 2) {
          ctx.strokeStyle = low ? "rgba(214,106,18,0.9)" : "rgba(10,143,163,0.75)"; // policy shield outline
          ctx.lineWidth = 3;
          ctx.strokeRect(Math.round(g.x - halfCar - 7), CAR_Y - 7, S.player.width + 14, S.player.height + 14);
        }
      }
      for (const p of g.particles) {
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), PX * 2, PX * 2);
      }
      if (g.state === "repairing") {
        const bob = Math.sin(now / 90) * 4;
        ctx.drawImage(S.wrench, Math.round(g.x - S.wrench.width / 2), Math.round(CAR_Y - S.wrench.height - 6 + bob));
      }
      ctx.restore();

      for (const p of g.popups) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / 1.8);
        const y = 64 - p.t * 18;
        ctx.fillStyle = "#fff8e7";
        ctx.fillRect(W / 2 - 175, y, 350, 28);
        ctx.strokeStyle = "#1f1a2a";
        ctx.lineWidth = 3;
        ctx.strokeRect(W / 2 - 175, y, 350, 28);
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, W / 2, y + 19);
        ctx.globalAlpha = 1;
      }

      hudTick += dt;
      if (hudTick > 0.1 || g.state === "over") {
        hudTick = 0;
        setHud({ score: Math.floor(g.score), coins: g.coins, policy: g.policy, claims: g.claims, state: g.state, message: g.endReason });
      }
      if (g.state !== "over") raf = requestAnimationFrame(frame);
      else if (!g.reported) {
        g.reported = true;
        // Let the crash play out, then hand the result to the arcade's results screen.
        setTimeout(
          () =>
            onEndRef.current({
              id: "insuranceRush",
              score: Math.floor(g.score) + g.coins * 10,
              distance: Math.floor(g.score),
              claims: g.claims,
              renewals: g.renewals,
            }),
          1400,
        );
      }
    };
    raf = requestAnimationFrame(frame);

    const keys = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    const onDown = (e) => {
      if (!keys[e.key]) return;
      e.preventDefault();
      input.current[keys[e.key]] = true;
    };
    const onUp = (e) => {
      if (keys[e.key]) input.current[keys[e.key]] = false;
    };
    const clear = () => (input.current = { left: false, right: false });
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      cancelAnimationFrame(raf);
      stopEngine();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  // On-screen buttons steer while held.
  const hold = (dir) => ({
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      input.current[dir] = true;
    },
    onPointerUp: () => (input.current[dir] = false),
    onPointerCancel: () => (input.current[dir] = false),
    onPointerLeave: () => (input.current[dir] = false),
  });

  const insured = hud.policy > 0;
  const low = insured && hud.policy < 4;
  const canRenew = hud.coins >= PREMIUM;
  return (
    <div className="arcade-field rush-field">
      <div className="arcade-bar rush-bar">
        <span className={`rush-policy${low ? " is-low" : ""}${insured ? "" : " is-off"}`} role="status" aria-live="polite">
          <b>{insured ? (low ? tr("expiring") : tr("insured")) : tr("notInsured")}</b>
          <span className="arcade-timer">
            <i style={{ width: `${Math.max(0, (hud.policy / POLICY_SECONDS) * 100)}%` }} />
            <b>{insured ? tr("secondsLeft", { s: Math.ceil(hud.policy) }) : ""}</b>
          </span>
          <small>{insured ? tr("renewCost", { n: PREMIUM }) : canRenew ? tr("grab", { n: PREMIUM }) : tr("needCoins", { n: PREMIUM })}</small>
        </span>
        <span className="rush-coins" title={tr("coins")}>
          🪙 {hud.coins}
        </span>
        <strong className="arcade-live">{hud.score.toLocaleString("en-IN")}</strong>
      </div>
      <div className="rush-stage">
        <canvas ref={canvasRef} className="rush-canvas" style={{ width: W, height: H }} aria-label={t("arcade.games.insuranceRush.how")} role="img" />
        {hud.state === "over" && (
          <div className="rush-over" role="alert">
            <p className="rush-big">💥 {tr("gameOver")}</p>
            <p>{tr("gameOverWhy", { bill: formatMoney(REPAIR_BILL) })}</p>
          </div>
        )}
      </div>
      <div className="rush-controls">
        <button type="button" className="secondary-button" aria-label={tr("steerLeft")} {...hold("left")}>
          ◀ {tr("steerLeft")}
        </button>
        <button type="button" className="secondary-button" aria-label={tr("steerRight")} {...hold("right")}>
          {tr("steerRight")} ▶
        </button>
      </div>
    </div>
  );
}
