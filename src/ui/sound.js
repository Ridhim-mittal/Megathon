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

export function setSoundEnabled(on) {
  enabled = Boolean(on);
  if (enabled && !ctx && typeof window !== "undefined") {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (enabled && ctx?.state === "suspended") ctx.resume();
  if (enabled) playMusic();
  else pauseMusic();
}

function tone(freq, { at = 0, dur = 0.12, type = "sine", gain = 0.08, slide = 0 } = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sounds = {
  tap: () => tone(520, { dur: 0.06, type: "triangle", gain: 0.05 }),
  coin: () => {
    tone(988, { dur: 0.08, type: "square", gain: 0.03 });
    tone(1319, { at: 0.07, dur: 0.16, type: "square", gain: 0.03 });
  },
  spend: () => tone(440, { dur: 0.14, type: "triangle", gain: 0.05, slide: 0.7 }),
  chime: () => [660, 880, 1175].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.3, gain: 0.05 })),
  thud: () => tone(140, { dur: 0.3, type: "sawtooth", gain: 0.04, slide: 0.5 }),
  page: () => tone(300, { dur: 0.08, type: "triangle", gain: 0.03, slide: 1.6 }),
  ripple: () => tone(392, { dur: 0.5, gain: 0.025, slide: 1.02 }),
};

let noise = null;
function noiseBuffer() {
  if (noise) return noise;
  const len = ctx.sampleRate * 2;
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

// A splash: a short burst of filtered noise.
export function splash({ gain = 0.12, freq = 1200 } = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(freq, t);
  bp.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t, Math.random());
  src.stop(t + 0.45);
}

// Flowing water until stop(): a low rumble plus a softer rush that surges like waves, with the odd
// gurgle. set(0..1) makes it louder and brighter as the water rises.
export function waterLoop() {
  if (!enabled || !ctx) return { set() {}, stop() {} };
  if (ctx.state === "suspended") ctx.resume();
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
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
