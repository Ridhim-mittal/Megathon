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
