import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Landmark, Lock, Package, RotateCcw, SkipForward, Sparkles, Trophy, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../PixelPortrait.jsx";
import { sounds } from "../sound.js";

// Rat Guard: the prologue's first scene, played instead of read.
//   pick1    only the tin box can be chosen (the bank is locked)
//   play1    rats pour out of the holes and in from every side; click to POOF them, stage after stage
//            until "DANGER! HIGH FREQUENCY": too many to stop, one reaches the box
//   cutscene the rat gets in and eats ₹500
//   pick2    now the bank is open too
//   play2    bank: rats clang off the vault, see stars and run; after a few the rest give up (hold)
//            tin box: they get in again (cutscene2)
//   end      story: onDone("bank" | "steel_box"); practice: play again or close
const W = 480;
const H = 270;
const BOX = { x: W / 2, y: H / 2 + 10 };
const HOLES = [64, 168, 312, 416]; // mouse holes in the skirting under the shelves
const STAGES = [
  { until: 9, every: 0.85, speed: 30 },
  { until: 18, every: 0.55, speed: 36 },
  { until: 27, every: 0.36, speed: 42 },
];
const SWARM_AT = 27;
const REACH = 22; // a rat this close to the tin box is in
const VAULT = { w: 46, h: 42 }; // half-size of the vault: a rat that touches it clangs off
const BANK_ENOUGH = 5; // rats that clang off before the rest give up
const BANK_MAX_SECONDS = 30;
const SPACE_MS = 350; // Space swats at most this often; clicking is faster
const BEST_KEY = "lakshyam.ratguard.best";

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---------- the rat sprite: built pixel by pixel, outlined, cached per fur and eyes ----------
const TONES = {
  grey: { o: "#2e2633", b: "#b8b2c4", s: "#8a8399", h: "#dedae8", l: "#ece8f2", p: "#f29bb2", n: "#e8607e", k: "#16101c", w: "#ffffff", r: "#f4b0c2", tail: "#e98aa2", tailD: "#a95a70" },
  tan: { o: "#3d2414", b: "#d6a36a", s: "#a87440", h: "#efcb98", l: "#f5e0bd", p: "#f29bb2", n: "#d9536f", k: "#1a0f08", w: "#ffffff", r: "#f0a585", tail: "#e98aa2", tailD: "#a95a70" },
  brown: { o: "#22150e", b: "#8c6b55", s: "#674d3c", h: "#ad8e75", l: "#cdb59f", p: "#ee95ab", n: "#d9536f", k: "#120a06", w: "#ffffff", r: "#d98a7a", tail: "#d98597", tailD: "#94505f" },
};
const TONE_LIST = ["grey", "grey", "tan", "tan", "brown"];
const SW = 28;
const SH = 18;
const AX = 11; // the sprite's anchor (the middle of the body)
const AY = 11;

function ratGrid(eyes) {
  const g = Array.from({ length: SH }, () => Array(SW).fill("."));
  const ell = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const isBody = (x, y) => ell(x, y, 11, 11, 8.5, 5.2) || ell(x, y, 18.5, 9.6, 5, 4.2) || ell(x, y, 22.6, 10.6, 2.8, 2.1);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      if (ell(x, y, 16, 5, 3, 3.2)) g[y][x] = ell(x, y, 16.1, 5.4, 1.6, 1.9) ? "p" : "b";
      if (!isBody(x, y)) continue;
      let c = "b";
      if (y >= 13 && x < 13) c = "s";
      if ((y >= 13 && x >= 13) || (y === 12 && x >= 16)) c = "l";
      if (x >= 4 && x <= 15 && !isBody(x, y - 1) && g[y - 1]?.[x] === ".") c = "h";
      g[y][x] = c;
    }
  for (let x = SW - 1; x >= 0; x--)
    if (g[10][x] !== ".") {
      g[10][x] = "n";
      break;
    }
  if (eyes === "open") {
    g[8][19] = "w";
    g[8][20] = "k";
    g[9][19] = "k";
    g[9][20] = "k";
  } else if (eyes === "blink") {
    g[9][19] = "k";
    g[9][20] = "k";
  } else {
    // Dizzy: little x eyes.
    for (const [x, y] of [[18, 7], [20, 7], [19, 8], [18, 9], [20, 9]]) g[y][x] = "k";
  }
  g[11][20] = "r";
  g[11][21] = "r";
  // A one-pixel outline all round.
  const out = g.map((row) => row.slice());
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      if (g[y][x] !== ".") continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? ".") !== ".")) out[y][x] = "o";
    }
  return out;
}

const spriteCache = new Map();
function ratSprite(tone, eyes) {
  const key = `${tone}-${eyes}`;
  if (!spriteCache.has(key)) {
    const c = document.createElement("canvas");
    c.width = SW;
    c.height = SH;
    const g = c.getContext("2d");
    const pal = TONES[tone];
    ratGrid(eyes).forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch === ".") return;
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }),
    );
    spriteCache.set(key, c);
  }
  return spriteCache.get(key);
}

// ---------- how rats move: scurry, stop to sniff, scurry again; curve in, never in a straight line ----------
function spawnRat(speed) {
  let x;
  let y;
  if (Math.random() < 0.4) {
    x = HOLES[Math.floor(Math.random() * HOLES.length)];
    y = 42;
  } else {
    const side = Math.floor(Math.random() * 3);
    x = side === 0 ? -14 : side === 1 ? W + 14 : rand(20, W - 20);
    y = side === 2 ? H + 12 : rand(60, H - 20);
  }
  return {
    x,
    y,
    a: Math.atan2(BOX.y - y, BOX.x - x),
    v: speed * 0.5,
    top: speed * rand(0.85, 1.2),
    state: "run",
    t: rand(0.4, 1.2),
    wob: rand(0, 100),
    stride: 0,
    face: x < BOX.x ? 1 : -1,
    tone: TONE_LIST[Math.floor(Math.random() * TONE_LIST.length)],
    alive: true,
  };
}

function move(m, dt) {
  m.x += Math.cos(m.a) * m.v * dt;
  m.y += Math.sin(m.a) * m.v * dt;
  m.stride += m.v * dt;
  if (m.state === "dizzy") return; // sliding back: keep facing the vault
  const vx = Math.cos(m.a) * m.v;
  if (vx > 5) m.face = 1;
  else if (vx < -5) m.face = -1;
}

function think(m, s, dt, pauses) {
  if (m.state === "dizzy") {
    m.t -= dt;
    m.v *= Math.pow(0.03, dt);
    move(m, dt);
    if (m.t <= 0) {
      m.state = "flee";
      m.a = Math.atan2(m.y - BOX.y, m.x - BOX.x) + rand(-0.5, 0.5);
      m.v = 0;
    }
    return;
  }
  let want;
  let top = m.top;
  if (m.state === "flee") {
    want = Math.atan2(m.y - BOX.y, m.x - BOX.x);
    top = Math.max(90, m.top * 2);
  } else {
    const d = Math.hypot(BOX.x - m.x, BOX.y - m.y);
    want = Math.atan2(BOX.y - m.y, BOX.x - m.x) + Math.sin(s.time * 1.9 + m.wob) * 0.8 * Math.min(1, d / 140);
    m.t -= dt;
    if (m.t <= 0) {
      if (m.state === "run" && pauses) {
        m.state = "sniff";
        m.t = rand(0.18, 0.5);
      } else {
        m.state = "run";
        m.t = rand(0.5, 1.5);
      }
    }
  }
  const diff = Math.atan2(Math.sin(want - m.a), Math.cos(want - m.a));
  m.a += clamp(diff, -6 * dt, 6 * dt);
  const goal = m.state === "sniff" ? 0 : top;
  m.v += (goal - m.v) * Math.min(1, dt * (goal > m.v ? 5 : 12));
  move(m, dt);
}

// Rats push each other aside a little instead of piling into one sprite.
function separate(mice, dt) {
  for (let i = 0; i < mice.length; i++) {
    const a = mice[i];
    for (let j = i + 1; j < mice.length; j++) {
      const b = mice[j];
      const dx = b.x - a.x;
      const dy = (b.y - a.y) * 1.6;
      const d2 = dx * dx + dy * dy;
      if (d2 > 256 || d2 < 0.01) continue;
      const d = Math.sqrt(d2);
      const push = ((16 - d) / d) * dt * 5;
      a.x -= dx * push;
      a.y -= (dy / 1.6) * push;
      b.x += dx * push;
      b.y += (dy / 1.6) * push;
    }
  }
}

// ---------- drawing (all code-drawn pixel art) ----------
function drawFloor(ctx, bank) {
  ctx.fillStyle = bank ? "#3a3f4a" : "#6b4527";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += bank ? 24 : 16) {
    ctx.fillStyle = bank ? ((y / 24) % 2 ? "#454b57" : "#3f4551") : (y / 16) % 2 ? "#7a5030" : "#704a2c";
    ctx.fillRect(0, y, W, bank ? 23 : 15);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = ((y * 7) % 60) - 60; x < W; x += bank ? 24 : 60) ctx.fillRect(x, y, 1, bank ? 24 : 16);
  }
  // Shelves with jars at the back, and the skirting with its mouse holes.
  ctx.fillStyle = bank ? "#262a33" : "#3b2716";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = bank ? "#596070" : "#5a3b20";
  ctx.fillRect(0, 30, W, 4);
  for (let x = 12; x < W; x += 38) {
    ctx.fillStyle = bank ? "#8a93a6" : ["#8fb4a8", "#c9a86a", "#a8c0d8"][(x / 38) % 3 | 0];
    ctx.fillRect(x, 10, 16, 20);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 2, 12, 3, 14);
  }
  ctx.fillStyle = bank ? "#4a515e" : "#4a301a";
  ctx.fillRect(0, 34, W, 8);
  for (const hx of HOLES) {
    ctx.fillStyle = "#120b06";
    ctx.fillRect(hx - 7, 35, 14, 7);
    ctx.fillRect(hx - 5, 34, 10, 1);
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 300);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Eyes glinting in the holes before the rats come out.
function drawLurkers(ctx, now) {
  HOLES.forEach((hx, i) => {
    if ((now / 1000 + i * 0.7) % 2.6 < 0.15) return;
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(hx - 3, 38, 1, 1);
    ctx.fillRect(hx + 2, 38, 1, 1);
  });
}

function drawTinBox(ctx, { open = 0, notes = 1, shake = 0 }) {
  const x = Math.round(BOX.x + (shake ? Math.sin(performance.now() / 30) * shake : 0));
  const y = BOX.y;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 34, y + 21, 68, 4);
  ctx.fillRect(x - 28, y + 25, 56, 2);
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(x - 31, y - 13, 62, 36);
  ctx.fillStyle = "#b9c3cf";
  ctx.fillRect(x - 29, y - 11, 58, 32);
  ctx.fillStyle = "#dfe6ee";
  ctx.fillRect(x - 29, y - 11, 58, 5);
  ctx.fillStyle = "#8b96a3";
  ctx.fillRect(x - 29, y + 15, 58, 6);
  ctx.fillStyle = "#9aa5b2";
  ctx.fillRect(x - 25, y - 2, 50, 1);
  if (open > 0 && notes > 0) {
    for (let i = 0; i < Math.ceil(notes * 4); i++) {
      ctx.fillStyle = i % 2 ? "#8ccf7e" : "#b6e3a4";
      ctx.fillRect(x - 20 + i * 10, y - 18 - (i % 2) * 3, 12, 8);
    }
  }
  ctx.save();
  ctx.translate(x - 33, y - 13);
  ctx.rotate(-open * 0.9);
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(0, -8, 66, 10);
  ctx.fillStyle = "#cfd8e2";
  ctx.fillRect(2, -6, 62, 6);
  ctx.fillStyle = "#f2f6fa";
  ctx.fillRect(4, -6, 30, 2);
  ctx.restore();
}

function drawVault(ctx, { bonk = 0 }) {
  const x = Math.round(BOX.x + (bonk > 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0));
  const y = BOX.y;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x - 42, y + 30, 84, 4);
  ctx.fillRect(x - 34, y + 34, 68, 2);
  ctx.fillStyle = "#1c2027";
  ctx.fillRect(x - 38, y - 34, 76, 66);
  ctx.fillStyle = bonk > 0 ? "#a9bad2" : "#7d8798";
  ctx.fillRect(x - 35, y - 31, 70, 60);
  ctx.fillStyle = "#5c6575";
  ctx.fillRect(x - 28, y - 24, 56, 46);
  ctx.fillStyle = "#c9d2de";
  ctx.fillRect(x - 10, y - 12, 20, 20);
  ctx.fillRect(x - 12, y - 10, 24, 16);
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(x - 3, y - 5, 6, 6);
  ctx.fillRect(x + 16, y - 6, 8, 8);
  // Rivets.
  ctx.fillStyle = "#aab4c3";
  for (const [rx, ry] of [[-31, -27], [29, -27], [-31, 23], [29, 23]]) ctx.fillRect(x + rx, y + ry, 2, 2);
  ctx.fillStyle = "#ffd84a";
  ctx.fillRect(x - 18, y - 40, 36, 9);
  ctx.fillStyle = "#2b1d0e";
  ctx.font = '8px "Pixelify Sans", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹ BANK", x, y - 35);
  if (bonk > 0) {
    // A crisp shield flash round the vault.
    ctx.fillStyle = `rgba(150,220,255,${bonk * 0.8})`;
    ctx.fillRect(x - 42, y - 38, 84, 2);
    ctx.fillRect(x - 42, y + 34, 84, 2);
    ctx.fillRect(x - 42, y - 38, 2, 74);
    ctx.fillRect(x + 40, y - 38, 2, 74);
  }
}

function drawRat(ctx, m, now) {
  const pal = TONES[m.tone];
  const moving = m.v > 6;
  const frame = moving ? Math.floor(m.stride / 3) % 4 : 0;
  const bob = moving && frame % 2 ? -1 : 0;
  const x = Math.round(m.x);
  const y = Math.round(m.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x - 9, y + 5, 18, 2);
  ctx.fillRect(x - 6, y + 7, 12, 1);
  ctx.save();
  ctx.translate(x, y + bob);
  if (m.face < 0) ctx.scale(-1, 1);
  // Tail: a wave that runs down it, faster while running.
  const wag = now / (moving ? 80 : 240) + m.wob;
  let prev = 1;
  for (let i = 1; i <= 12; i++) {
    const tx = -AX + 3 - i;
    const ty = 1 + Math.round(Math.sin(wag - i * 0.55) * Math.min(i, 7) * 0.3 - i * 0.15);
    // Fill any step so the tail stays one unbroken line.
    const top = Math.min(ty, prev);
    const len = Math.abs(ty - prev) + 1;
    ctx.fillStyle = pal.tail;
    ctx.fillRect(tx, top, 1, len);
    if (i < 8) {
      ctx.fillStyle = pal.tailD;
      ctx.fillRect(tx, top + len, 1, 1);
    }
    prev = ty;
  }
  // Feet: back and front pairs step in turn.
  const fo = [0, 1, 0, -1][frame];
  ctx.fillStyle = pal.tailD;
  ctx.fillRect(-4 - fo, 5, 2, 1);
  ctx.fillRect(6 + fo, 5, 2, 1);
  ctx.fillStyle = pal.p;
  ctx.fillRect(-6 + fo, 5, 3, 1);
  ctx.fillRect(4 - fo, 5, 3, 1);
  ctx.fillStyle = pal.o;
  ctx.fillRect(-6 + fo, 6, 3, 1);
  ctx.fillRect(4 - fo, 6, 3, 1);
  const blink = (now / 1000 + m.wob) % 3.1 < 0.12;
  ctx.drawImage(ratSprite(m.tone, m.state === "dizzy" ? "dizzy" : blink ? "blink" : "open"), -AX, -AY);
  // Whiskers twitch while it sniffs.
  const tw = !moving && Math.floor(now / 90 + m.wob) % 2 ? 1 : 0;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(13, -3 - tw, 2, 1);
  ctx.fillRect(15, -4 - tw, 1, 1);
  ctx.fillRect(13, 1 + tw, 2, 1);
  ctx.fillRect(15, 2 + tw, 1, 1);
  ctx.restore();
  if (m.state === "dizzy") {
    for (let k = 0; k < 3; k++) {
      const a = now / 140 + k * 2.09;
      const sx = Math.round(x + Math.cos(a) * 8);
      const sy = Math.round(y - 13 + Math.sin(a) * 2.5);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
    }
  }
}

function drawPoof(ctx, p, now) {
  const t = (now - p.at) / 520;
  if (t > 1) return false;
  const r = 3 + t * 13;
  const size = Math.max(1, Math.round(5 * (1 - t)));
  ctx.fillStyle = p.kind === "clang" ? `rgba(160,225,255,${1 - t})` : `rgba(240,244,255,${1 - t})`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + p.spin;
    ctx.fillRect(Math.round(p.x + Math.cos(a) * r - size / 2), Math.round(p.y + Math.sin(a) * r * 0.75 - size / 2), size, size);
  }
  if (t < 0.4) ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 3, 8, 6);
  ctx.fillStyle = `rgba(255,216,74,${1 - t})`;
  ctx.fillRect(Math.round(p.x - 10 + t * 4), Math.round(p.y - 12 - t * 8), 2, 2);
  ctx.fillRect(Math.round(p.x + 9 - t * 3), Math.round(p.y - 8 - t * 10), 2, 2);
  ctx.font = '10px "Pixelify Sans", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const ly = Math.round(p.y - 16 - t * 12);
  ctx.fillStyle = `rgba(20,12,6,${1 - t})`;
  ctx.fillText(p.label, Math.round(p.x) + 1, ly + 1);
  ctx.fillStyle = p.kind === "clang" ? `rgba(160,225,255,${1 - t})` : `rgba(255,255,255,${1 - t})`;
  ctx.fillText(p.label, Math.round(p.x), ly);
  return true;
}

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(n) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // Storage blocked: the best score just isn't kept.
  }
}

// ---------- the component ----------
// mode "story": the end calls onDone(choiceId). mode "practice" (title screen, or home in the
// prologue): a close button, the best score, and Play again.
export function RatGuard(props) {
  const [run, setRun] = useState(0);
  return <RatGuardRun key={run} {...props} onAgain={() => setRun((n) => n + 1)} />;
}

const RUNNING = ["play1", "cutscene", "play2", "cutscene2", "hold"];

function RatGuardRun({ mode = "story", onDone, onClose, onAgain }) {
  const { t, money } = useT();
  const practice = mode === "practice";
  const canvas = useRef(null);
  const [phase, setPhase] = useState("pick1");
  const [hud, setHud] = useState({ score: 0, stage: 1, danger: 0, bounced: 0 });
  const [choice, setChoice] = useState("tin"); // what round 2 protects
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);
  const sim = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pointer = useRef(null);
  const lastSpace = useRef(0);

  // Behind the first question: the room, the tin box and eyes in the holes.
  useEffect(() => {
    if (phase !== "pick1") return undefined;
    const ctx = canvas.current.getContext("2d");
    let raf;
    const frame = (now) => {
      drawFloor(ctx, false);
      drawLurkers(ctx, now);
      drawTinBox(ctx, {});
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // The end: keep the best score.
  useEffect(() => {
    if (phase !== "end") return;
    const score = sim.current?.score ?? 0;
    if (score > best) {
      saveBest(score);
      setBest(score);
      setNewBest(true);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // The game loop runs while a round, the hold or a cutscene is on screen.
  useEffect(() => {
    if (!RUNNING.includes(phase)) return undefined;
    const ctx = canvas.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (phase === "play1" || phase === "play2") {
      sim.current = { time: 0, mice: [], poofs: [], spawnIn: 0.4, score: sim.current?.score ?? 0, eater: null, cut: 0, bonk: 0, swarm: false, bounced: 0, hold: 0 };
    }
    let raf;
    let last = performance.now();
    const target = phase === "play1" || phase === "cutscene" ? "tin" : choice;
    let hudRef = { score: sim.current.score, stage: 1, danger: 0, bounced: sim.current.bounced };
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); // keeps real time down to 10 fps
      last = now;
      const s = sim.current;
      const p = phaseRef.current;
      s.time += dt;

      if (p === "play1" || p === "play2") {
        let every;
        let speed;
        if (p === "play1") {
          const st = STAGES.find((x) => s.time < x.until);
          s.swarm = !st;
          every = st ? st.every : 0.07;
          speed = st ? st.speed : 50;
          // The swarm always wins: after a few seconds the rest make a dash for it.
          if (!st && s.time > SWARM_AT + 5) for (const m of s.mice) m.top = 220;
          const stage = st ? STAGES.indexOf(st) + 1 : 4;
          const danger = Math.min(1, s.time / SWARM_AT);
          if (stage !== hudRef.stage || Math.abs(danger - hudRef.danger) > 0.04 || s.score !== hudRef.score) setHud((hudRef = { ...hudRef, score: s.score, stage, danger }));
        } else {
          every = target === "bank" ? 0.42 : 0.32;
          speed = 44;
          if (s.score !== hudRef.score || s.bounced !== hudRef.bounced) setHud((hudRef = { ...hudRef, score: s.score, bounced: s.bounced }));
          if (target === "bank" && (s.bounced >= BANK_ENOUGH || s.time > BANK_MAX_SECONDS)) {
            for (const m of s.mice) if (m.state !== "dizzy") m.state = "flee";
            sounds.coin?.();
            setPhase("hold");
            return;
          }
        }
        s.spawnIn -= dt;
        while (s.spawnIn <= 0) {
          s.spawnIn += every;
          s.mice.push(spawnRat(speed));
        }
        for (const m of s.mice) {
          if (!m.alive) continue;
          think(m, s, dt, !s.swarm);
          if (m.state === "dizzy" || m.state === "flee") continue;
          const dx = BOX.x - m.x;
          const dy = BOX.y - m.y;
          if (target === "bank") {
            if (Math.abs(dx) < VAULT.w && Math.abs(dy) < VAULT.h) {
              // CLANG: knocked back, stars, then it runs for it.
              m.state = "dizzy";
              m.t = 1.1;
              m.a = Math.atan2(-dy, -dx);
              m.v = 150;
              s.bounced += 1;
              s.bonk = 1;
              s.poofs.push({ x: m.x, y: m.y - 4, at: now, spin: Math.random() * 6, label: t("ratguard.clang"), kind: "clang" });
              sounds.thud?.();
            }
            continue;
          }
          if (Math.hypot(dx, dy) < REACH) {
            // Into the tin box: the cutscene (round 2 with the tin box ends the same way).
            m.alive = false;
            s.eater = { x: m.x, y: m.y, tone: m.tone };
            s.cut = 0;
            for (const o of s.mice) if (o.alive) o.state = "flee";
            sounds.thud?.();
            setPhase(p === "play1" ? "cutscene" : "cutscene2");
            break;
          }
        }
        s.bonk = Math.max(0, s.bonk - dt * 2.5);
      }

      // The vault held: everyone runs, then the end.
      if (p === "hold") {
        s.hold += dt;
        s.bonk = Math.max(0, s.bonk - dt * 2.5);
        for (const m of s.mice) if (m.alive) think(m, s, dt, false);
        if (s.hold > 2.4) {
          setPhase("end");
          return;
        }
      }

      // Cutscene: the others scatter; the eater climbs in and chews.
      if (p === "cutscene" || p === "cutscene2") {
        s.cut += dt;
        for (const m of s.mice) if (m.alive) think(m, s, dt, false);
        if (s.eater) {
          s.eater.x += (BOX.x - s.eater.x) * Math.min(1, dt * 3);
          s.eater.y += (BOX.y - 20 - s.eater.y) * Math.min(1, dt * 3);
        }
        if (s.cut > 3.6) {
          setPhase(p === "cutscene" ? "pick2" : "end");
          return;
        }
      }
      separate(s.mice.filter((m) => m.alive), dt);
      s.mice = s.mice.filter((m) => m.alive && m.x > -40 && m.x < W + 40 && m.y > 20 && m.y < H + 40);

      // Draw.
      const bank = target === "bank";
      drawFloor(ctx, bank);
      const cutting = p === "cutscene" || p === "cutscene2";
      const open = cutting ? Math.min(1, s.cut / 0.6) : 0;
      if (bank) drawVault(ctx, { bonk: s.bonk });
      else drawTinBox(ctx, { open, notes: cutting ? Math.max(0.25, 1 - s.cut / 3) : 1, shake: cutting && s.cut > 0.6 ? 2 : 0 });
      const sorted = [...s.mice].sort((a, b) => a.y - b.y);
      for (const m of sorted) drawRat(ctx, m, now);
      if (cutting && s.eater) {
        // Head down in the box, chewing.
        const chew = s.cut > 0.7 ? Math.floor(now / 70) % 2 : 0;
        drawRat(ctx, { ...s.eater, y: s.eater.y + chew, face: 1, wob: 0, v: s.cut < 0.7 ? 40 : 0, stride: s.cut * 60, state: "run" }, now);
        if (s.cut > 0.8) {
          for (let i = 0; i < 5; i++) {
            const k = (s.cut * 2 + i * 0.37) % 1;
            ctx.fillStyle = i % 2 ? "#8ccf7e" : "#b6e3a4";
            ctx.fillRect(Math.round(BOX.x - 20 + i * 10 + Math.sin(i + s.cut * 6) * 8), Math.round(BOX.y - 20 - k * 40), 5, 4);
          }
          ctx.font = '20px "Pixelify Sans", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#2b1d0e";
          ctx.fillText(`−${money(500)}`, BOX.x + 2, BOX.y - 52);
          ctx.fillStyle = "#ff6a5a";
          ctx.fillText(`−${money(500)}`, BOX.x, BOX.y - 54);
        }
      }
      s.poofs = s.poofs.filter((pf) => drawPoof(ctx, pf, now));
      const ptr = pointer.current;
      if (ptr && (p === "play1" || p === "play2")) {
        ctx.strokeStyle = "rgba(255,70,60,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,70,60,0.18)";
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, choice]); // eslint-disable-line react-hooks/exhaustive-deps

  const toField = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  function swat(at) {
    const s = sim.current;
    if (!s || !["play1", "play2"].includes(phaseRef.current)) return;
    let found = null;
    let bestD = 20;
    for (const m of s.mice) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - at.x, (m.y - at.y) * 1.2);
      if (d < bestD) {
        found = m;
        bestD = d;
      }
    }
    if (!found) return;
    found.alive = false;
    s.score += 10;
    s.poofs.push({ x: found.x, y: found.y, at: performance.now(), spin: Math.random() * 6, label: t("ratguard.poof") });
    sounds.coin?.();
  }

  // Keyboard: Space swats the rat nearest the box.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && practice) onClose?.();
      if (e.key !== " " || !["play1", "play2"].includes(phaseRef.current)) return;
      e.preventDefault();
      if (performance.now() - lastSpace.current < SPACE_MS) return;
      lastSpace.current = performance.now();
      const s = sim.current;
      const near = s?.mice.filter((m) => m.alive).sort((a, b) => Math.hypot(a.x - BOX.x, a.y - BOX.y) - Math.hypot(b.x - BOX.x, b.y - BOX.y))[0];
      if (near) swat({ x: near.x, y: near.y });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function start(which) {
    if (phase === "pick1") {
      setPhase("play1");
      return;
    }
    setChoice(which);
    setPhase("play2");
  }

  function skip() {
    const s = sim.current;
    if (phase === "play1" && s) {
      s.eater = { x: BOX.x - 60, y: BOX.y + 40, tone: "grey" };
      s.cut = 0;
      for (const m of s.mice) m.state = "flee";
      setPhase("cutscene");
    } else if (phase === "play2") {
      if (choice === "bank") setPhase("end");
      else {
        s.eater = { x: BOX.x + 60, y: BOX.y + 40, tone: "tan" };
        s.cut = 0;
        for (const m of s.mice) m.state = "flee";
        setPhase("cutscene2");
      }
    }
  }

  const playing = phase === "play1" || phase === "play2";
  const round2 = ["pick2", "play2", "cutscene2", "hold", "end"].includes(phase);
  const bankRound = round2 && choice === "bank" && phase !== "pick2";
  const stageText = bankRound ? t("ratguard.bounced", { n: Math.min(hud.bounced, BANK_ENOUGH), total: BANK_ENOUGH }) : round2 ? t("ratguard.round2") : hud.stage === 4 ? t("ratguard.danger") : t("ratguard.stage", { n: hud.stage });
  const bar = bankRound ? Math.min(1, hud.bounced / BANK_ENOUGH) : round2 ? 0.6 : hud.danger;
  return (
    <div className="rg-layer" role="dialog" aria-modal="true" aria-label={t("ratguard.title")}>
      <div className={`rg-cabinet phase-${phase} ${hud.stage === 4 && (phase === "play1" || phase === "cutscene") ? "swarming" : ""} ${bankRound ? "banking" : ""}`}>
        <div className="rg-hud">
          <span className="rg-chip">{t("ratguard.score", { n: hud.score.toLocaleString("en-IN") })}</span>
          <span className="rg-chip">{stageText}</span>
          <span className="rg-danger" aria-hidden="true">
            <small>{bankRound ? t("ratguard.vault") : t("ratguard.frequency")}</small>
            <i style={{ width: `${bar * 100}%` }} />
          </span>
          {practice && (
            <button className="rg-close" onClick={onClose} aria-label={t("common.close")}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="rg-stage">
          <canvas
            ref={canvas}
            width={W}
            height={H}
            className="rg-canvas"
            onPointerDown={(e) => swat(toField(e))}
            onPointerMove={(e) => (pointer.current = toField(e))}
            onPointerLeave={() => (pointer.current = null)}
          />

          {(phase === "pick1" || phase === "pick2") && (
            <div className="rg-pick">
              <div className="rg-ammamma">
                <PixelPortrait role="mentor" />
                <p>{phase === "pick1" ? t("ratguard.ask1") : t("ratguard.ask2")}</p>
              </div>
              <div className="rg-options">
                <button className="rg-option tin" onClick={() => start("tin")} autoFocus>
                  <Package size={34} aria-hidden="true" />
                  <b>{t("ratguard.tin")}</b>
                  <small>{t("ratguard.tinHint")}</small>
                </button>
                <button className={`rg-option bank ${phase === "pick1" ? "locked" : "fresh"}`} disabled={phase === "pick1"} onClick={() => start("bank")}>
                  {phase === "pick1" ? <Lock size={34} aria-hidden="true" /> : <Landmark size={34} aria-hidden="true" />}
                  <b>{t("ratguard.bank")}</b>
                  <small>{phase === "pick1" ? t("ratguard.bankLocked") : t("ratguard.bankHint")}</small>
                  {phase === "pick2" && <span className="rg-new">{t("ratguard.new")}</span>}
                </button>
              </div>
            </div>
          )}

          {phase === "cutscene" && <p className="rg-caption">{t("ratguard.ate")}</p>}
          {phase === "cutscene2" && <p className="rg-caption">{t("ratguard.ateAgain")}</p>}
          {phase === "hold" && <p className="rg-caption good">{t("ratguard.holds")}</p>}

          {phase === "end" && (
            <div className="rg-pick rg-end">
              <div className="rg-ammamma">
                <PixelPortrait role="mentor" />
                <p>{choice === "bank" ? t("ratguard.safe") : t("ratguard.lostAgain")}</p>
              </div>
              {choice === "bank" && (
                <p className="rg-lesson">
                  <Sparkles size={16} /> {t("ratguard.lesson")}
                </p>
              )}
              <p className="rg-final">
                <Trophy size={16} aria-hidden="true" /> {t("ratguard.final", { n: hud.score.toLocaleString("en-IN") })}
                {practice && <span>{newBest ? t("ratguard.newBest") : t("ratguard.best", { n: best.toLocaleString("en-IN") })}</span>}
              </p>
              {practice ? (
                <div className="rg-end-actions">
                  <button className="text-button" onClick={onClose}>
                    {t("common.close")}
                  </button>
                  <button className="primary-button big" autoFocus onClick={onAgain}>
                    <RotateCcw size={18} /> {t("ratguard.again")}
                  </button>
                </div>
              ) : (
                <button className="primary-button big" autoFocus onClick={() => onDone(choice === "bank" ? "bank" : "steel_box")}>
                  {t("ratguard.continue")} <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="rg-foot">
          <span>{playing ? (bankRound ? t("ratguard.howBank") : t("ratguard.how")) : ""}</span>
          {playing && (
            <button className="text-button rg-skip" onClick={skip}>
              <SkipForward size={14} /> {t("ratguard.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
