// Background music plus tiny synthesized effects. The HUD sound toggle turns both on and off.

let ctx = null;
let enabled = false;

// "Sunlight on the Well" loops quietly for the whole game. Browsers only allow audio after the
// player's first tap or key press, so the music starts then (and pauses while the tab is hidden).
const MUSIC_URL = `${import.meta.env.BASE_URL}audio/sunlight-on-the-well.mp3`;
const MUSIC_VOLUME = 0.32;
let music = null;
let fade = null;

function fadeTo(target, ms, then) {
  clearInterval(fade);
  const from = music.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let n = 0;
  fade = setInterval(() => {
    n += 1;
    music.volume = Math.min(1, Math.max(0, from + ((target - from) * n) / steps));
    if (n >= steps) {
      clearInterval(fade);
      then?.();
    }
  }, 50);
}

let ducked = false; // a scene with its own sound (the flood) has the music off

function playMusic() {
  if (!enabled || ducked || typeof window === "undefined" || document.hidden) return;
  if (!music) {
    music = new Audio(MUSIC_URL);
    music.loop = true;
    music.preload = "auto";
    music.volume = 0;
  }
  if (!music.paused) {
    fadeTo(MUSIC_VOLUME, 600); // also cancels a fade-out that was about to pause it
    return;
  }
  music
    .play()
    .then(() => fadeTo(MUSIC_VOLUME, 1500))
    .catch(() => {
      /* not allowed yet: the next tap or key press tries again */
    });
}

function pauseMusic() {
  if (!music || music.paused) return;
  fadeTo(0, 400, () => music.pause());
}

if (typeof window !== "undefined") {
  // A soft tick on anything clickable, and a shimmer over the words that explain themselves.
  const CLICKABLE = "button:not(:disabled), [role=button], [role=radio], [role=tab], a[href], select, summary";
  window.addEventListener("pointerdown", (e) => e.target.closest?.(CLICKABLE) && sounds.tap(), true);
  window.addEventListener("pointerover", (e) => e.pointerType === "mouse" && e.target.closest?.(".gloss-chip, .clarity-phrase") && sounds.hover());
  // Browsers start audio suspended until the first tap or key press, so wake it then.
  const kick = () => {
    if (!enabled) return;
    if (ctx?.state === "suspended") ctx.resume();
    playMusic();
  };
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);
  document.addEventListener("visibilitychange", () => (document.hidden ? pauseMusic() : kick()));
}

// Fades the music out (and back in) while a scene plays its own sound.
export function duckMusic(on) {
  ducked = Boolean(on);
  if (ducked) pauseMusic();
  else playMusic();
}

// ---------- effects: all synthesized, all quiet ----------
// Every effect goes through one quiet master gain and a limiter, so nothing can come out loud.
// Each named effect has a minimum gap (ms) so repeated triggers (hover, steps, coins) never pile up.
const SFX_VOLUME = 1.75; // calibrated: big moments ~7 dB, small sounds ~18 dB under the music
let master = null;
let noiseBuf = null;

function bus() {
  if (!ctx) return null;
  if (!master) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = SFX_VOLUME;
    master.connect(limiter).connect(ctx.destination);
  }
  return master;
}

export function setSoundEnabled(on) {
  enabled = Boolean(on);
  if (enabled && !ctx && typeof window !== "undefined") {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (enabled && ctx?.state === "suspended") ctx.resume();
  if (enabled) playMusic();
  else {
    pauseMusic();
    stopEngine();
  }
}

// Lower the music for a moment under a big sound (a fanfare, an alarm).
function duck(ms = 1400) {
  if (!music || music.paused || ducked) return;
  fadeTo(MUSIC_VOLUME * 0.45, 150, () => setTimeout(() => !music.paused && fadeTo(MUSIC_VOLUME, 500), ms));
}

function tone(freq, { at = 0, dur = 0.12, type = "sine", gain = 0.08, slide = 0 } = {}) {
  const out = bus();
  if (!enabled || !out) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A burst of filtered noise: whooshes, slashes, screeches, crunches, footsteps.
function noise({ at = 0, dur = 0.2, gain = 0.06, type = "bandpass", freq = 1200, to = 0, q = 1 } = {}) {
  const out = bus();
  if (!enabled || !out) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const last = {};
function gap(name, ms) {
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}
const once = (name, ms, fn) => (...args) => {
  if (enabled && ctx && gap(name, ms)) fn(...args);
};

// ---------- the car engine in Insurance Rush: a soft hum that follows the speed ----------
let engine = null;
export function startEngine() {
  const out = bus();
  if (!enabled || !out || engine) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc2.type = "triangle";
  osc.frequency.value = 48;
  osc2.frequency.value = 96;
  f.type = "lowpass";
  f.frequency.value = 320;
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.6);
  osc.connect(f);
  osc2.connect(f);
  f.connect(g).connect(out);
  osc.start();
  osc2.start();
  engine = { osc, osc2, f, g };
}
// 0 (slow) to 1 (fast)
export function setEngine(speed) {
  if (!engine || !ctx) return;
  const t = ctx.currentTime;
  const hz = 48 + speed * 46;
  engine.osc.frequency.setTargetAtTime(hz, t, 0.2);
  engine.osc2.frequency.setTargetAtTime(hz * 2, t, 0.2);
  engine.f.frequency.setTargetAtTime(300 + speed * 380, t, 0.2);
}
export function stopEngine() {
  if (!engine || !ctx) return;
  const e = engine;
  engine = null;
  e.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
  setTimeout(() => {
    e.osc.stop();
    e.osc2.stop();
  }, 600);
}

export const sounds = {
  // everyday
  tap: once("tap", 60, () => tone(560, { dur: 0.045, type: "triangle", gain: 0.0352 })),
  hover: once("hover", 450, () => {
    tone(1568, { dur: 0.09, gain: 0.0144 });
    tone(2093, { at: 0.04, dur: 0.12, gain: 0.0108 });
  }),
  page: once("page", 120, () => noise({ dur: 0.12, gain: 0.045, freq: 2500, to: 900, q: 0.6 })),
  flip: once("flip", 200, () => {
    noise({ dur: 0.1, gain: 0.025, freq: 1800, to: 3200, q: 0.7 });
    tone(660, { at: 0.06, dur: 0.06, type: "triangle", gain: 0.015 });
  }),
  // money
  coin: once("coin", 70, () => {
    tone(988, { dur: 0.07, type: "square", gain: 0.0252 });
    tone(1319, { at: 0.06, dur: 0.18, type: "square", gain: 0.0252 });
  }),
  spend: once("spend", 150, () => tone(440, { dur: 0.16, type: "triangle", gain: 0.035, slide: 0.7 })),
  cash: once("cash", 300, () => {
    noise({ dur: 0.05, gain: 0.03, type: "highpass", freq: 3000 });
    [1047, 1319, 1568].forEach((f, i) => tone(f, { at: 0.04 + i * 0.05, dur: 0.12, type: "triangle", gain: 0.02 }));
  }),
  rise: once("rise", 400, () => tone(523, { dur: 0.35, gain: 0.02, slide: 1.5 })),
  // feedback
  chime: once("chime", 250, () => [660, 880, 1175].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.26, gain: 0.03 }))),
  thud: once("thud", 200, () => tone(150, { dur: 0.26, type: "triangle", gain: 0.05, slide: 0.55 })),
  ripple: once("ripple", 400, () => tone(392, { dur: 0.45, gain: 0.018, slide: 1.02 })),
  right: once("right", 200, () => {
    tone(784, { dur: 0.1, type: "triangle", gain: 0.03 });
    tone(1047, { at: 0.08, dur: 0.18, type: "triangle", gain: 0.03 });
  }),
  wrong: once("wrong", 200, () => tone(220, { dur: 0.22, type: "triangle", gain: 0.04, slide: 0.8 })),
  levelUp: once("levelUp", 600, () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.18, type: "triangle", gain: 0.022 }))),
  star: (i = 0) => tone([880, 1109, 1319][i] ?? 1319, { dur: 0.22, type: "triangle", gain: 0.048 }),
  newBest: once("newBest", 800, () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, type: "square", gain: 0.014 }))),
  // story moments
  fanfare: once("fanfare", 1500, () => {
    duck();
    [392, 523, 659, 784].forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.3, type: "triangle", gain: 0.035 }));
    tone(1047, { at: 0.48, dur: 0.6, type: "triangle", gain: 0.03 });
  }),
  stingGood: once("sting", 1500, () => {
    duck();
    [659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.5, type: "triangle", gain: 0.032 }));
  }),
  stingBad: once("sting", 1500, () => {
    duck();
    [392, 330, 262].forEach((f, i) => tone(f, { at: i * 0.16, dur: 0.5, type: "triangle", gain: 0.035 }));
  }),
  alarm: once("alarm", 1200, () => {
    duck();
    [0, 0.22].forEach((at) => {
      tone(880, { at, dur: 0.1, type: "square", gain: 0.02 });
      tone(660, { at: at + 0.1, dur: 0.1, type: "square", gain: 0.02 });
    });
  }),
  tick: once("tick", 250, (urgent = false) => tone(urgent ? 1250 : 950, { dur: 0.03, type: "square", gain: urgent ? 0.032 : 0.02 })),
  beep: () => tone(660, { dur: 0.1, type: "triangle", gain: 0.054 }),
  go: () => tone(990, { dur: 0.25, type: "triangle", gain: 0.035 }),
  // village and phone
  step: once("step", 230, () => noise({ dur: 0.06, gain: 0.0672, type: "lowpass", freq: 500 + Math.random() * 250, q: 0.8 })),
  door: once("door", 600, () => {
    tone(1319, { dur: 0.5, gain: 0.018 });
    tone(1760, { at: 0.03, dur: 0.6, gain: 0.012 });
  }),
  whooshUp: once("whoosh", 250, () => noise({ dur: 0.22, gain: 0.084, freq: 400, to: 2400, q: 0.8 })),
  whooshDown: once("whoosh", 250, () => noise({ dur: 0.2, gain: 0.07, freq: 2200, to: 450, q: 0.8 })),
  menu: once("menu", 70, () => tone(1200, { dur: 0.025, type: "square", gain: 0.0176 })),
  ping: once("ping", 900, () => {
    tone(1568, { dur: 0.12, gain: 0.02 });
    tone(2093, { at: 0.1, dur: 0.2, gain: 0.016 });
  }),
  buzz: once("buzz", 500, () => [0, 0.14].forEach((at) => tone(150, { at, dur: 0.1, type: "square", gain: 0.012 }))),
  gotcha: once("gotcha", 1200, () => [494, 466, 440, 392].forEach((f, i) => tone(f, { at: i * 0.14, dur: 0.22, type: "triangle", gain: 0.03 }))),
  // mini-games
  slash: once("slash", 70, (power = 1) => noise({ dur: 0.13, gain: 0.05 + 0.05 * Math.min(1, power), freq: 3500, to: 700, q: 1.4 })),
  slice: once("slice", 60, () => {
    noise({ dur: 0.07, gain: 0.039, type: "highpass", freq: 2500 });
    tone(330, { at: 0.02, dur: 0.08, type: "triangle", gain: 0.026, slide: 0.6 });
  }),
  screech: once("screech", 700, () => noise({ dur: 0.4, gain: 0.144, freq: 2600, to: 1900, q: 9 })),
  horn: once("horn", 2500, () => {
    tone(349, { dur: 0.22, type: "square", gain: 0.0144 });
    tone(440, { dur: 0.22, type: "square", gain: 0.0108 });
  }),
  pass: once("pass", 900, () => noise({ dur: 0.45, gain: 0.054, type: "lowpass", freq: 700, to: 250, q: 0.7 })),
  crash: once("crash", 400, () => {
    noise({ dur: 0.35, gain: 0.05, type: "lowpass", freq: 1200, to: 200, q: 0.8 });
    tone(110, { dur: 0.25, type: "triangle", gain: 0.04, slide: 0.6 });
  }),
  flap: once("flap", 90, () => noise({ dur: 0.1, gain: 0.072, freq: 700, to: 1400, q: 1 })),
  poof: once("poof", 60, () => noise({ dur: 0.14, gain: 0.075, type: "lowpass", freq: 1800, to: 300, q: 0.7 })),
  pop: once("pop", 60, () => tone(600, { dur: 0.07, gain: 0.03, slide: 1.8 })),
  crunch: once("crunch", 60, () => noise({ dur: 0.08, gain: 0.14, freq: 900, to: 500, q: 2 })),
  shatter: once("shatter", 200, () => {
    noise({ dur: 0.25, gain: 0.035, type: "highpass", freq: 2500, to: 5000 });
    tone(1760, { at: 0.02, dur: 0.12, gain: 0.012, slide: 0.7 });
  }),
  marker: once("marker", 120, () => noise({ dur: 0.18, gain: 0.1, freq: 1200, to: 2200, q: 3 })),
  printer: once("printer", 70, () => noise({ dur: 0.03, gain: 0.03, type: "highpass", freq: 2000 })),
};

// The flood's splash: a short wash of noise, through the effects bus like everything else.
export const splash = once("splash", 120, () => noise({ dur: 0.4, gain: 0.07, freq: 1200, to: 480, q: 1 }));

let waterNoise = null;
function waterBuffer() {
  if (waterNoise) return waterNoise;
  const len = ctx.sampleRate * 2;
  waterNoise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = waterNoise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return waterNoise;
}

// Flowing water until stop(): a low rumble plus a softer rush that surges like waves, with the odd
// gurgle. set(0..1) makes it louder and brighter as the water rises.
export function waterLoop() {
  if (!enabled || !ctx) return { set() {}, stop() {} };
  if (ctx.state === "suspended") ctx.resume();
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = waterBuffer();
  src.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 420;
  const lowG = ctx.createGain();
  const rush = ctx.createBiquadFilter();
  rush.type = "bandpass";
  rush.frequency.value = 900;
  rush.Q.value = 0.8;
  const rushG = ctx.createGain();
  // A slow wobble on the rush, so it surges instead of hissing.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.35;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.1;
  lfo.connect(lfoG).connect(rushG.gain);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.setTargetAtTime(1, t, 0.4);
  lowG.gain.value = 0.35;
  rushG.gain.value = 0.2;
  src.connect(low).connect(lowG).connect(out);
  src.connect(rush).connect(rushG).connect(out);
  out.connect(ctx.destination);
  src.start(t);
  lfo.start(t);
  let level = 0;
  const gurgle = setInterval(() => {
    if (Math.random() < 0.5) return;
    const f = 180 + Math.random() * 120;
    tone(f, { dur: 0.12, gain: 0.04 + 0.03 * level, slide: 2.4 });
    tone(f * 1.3, { at: 0.09, dur: 0.1, gain: 0.02 + 0.02 * level, slide: 2.2 });
  }, 900);
  return {
    set(l) {
      level = l;
      const now = ctx.currentTime;
      low.frequency.setTargetAtTime(420 + 380 * l, now, 0.3);
      lowG.gain.setTargetAtTime(0.35 + 0.15 * l, now, 0.3);
      rushG.gain.setTargetAtTime(0.2 + 0.15 * l, now, 0.3);
    },
    stop() {
      clearInterval(gurgle);
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(0.0001, now, 0.3);
      src.stop(now + 1.6);
      lfo.stop(now + 1.6);
    },
  };
}
