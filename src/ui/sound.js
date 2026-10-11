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

function playMusic() {
  if (!enabled || typeof window === "undefined" || document.hidden) return;
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
  const kick = () => enabled && playMusic();
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);
  document.addEventListener("visibilitychange", () => (document.hidden ? pauseMusic() : kick()));
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

// A soft, low rush of water that keeps going until stop(). set(0..1) makes it a little louder and
// brighter as the water rises.
export function waterLoop() {
  if (!enabled || !ctx) return { set() {}, stop() {} };
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
  const drift = d[len - 1] - d[0]; // so the loop has no click where it wraps
  for (let i = 0; i < len; i++) d[i] = (d[i] - (drift * i) / len) * 3.5;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start();
  g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.5);
  return {
    set(level) {
      lp.frequency.setTargetAtTime(200 + 250 * level, ctx.currentTime, 0.3);
      g.gain.setTargetAtTime(0.05 + 0.07 * level, ctx.currentTime, 0.3);
    },
    stop() {
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
      src.stop(ctx.currentTime + 1.5);
    },
  };
}
