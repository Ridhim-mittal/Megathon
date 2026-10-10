// Tiny synthesized sounds (no audio files). Off by default; the HUD toggle turns them on.

let ctx = null;
let enabled = false;

export function setSoundEnabled(on) {
  enabled = Boolean(on);
  if (enabled && !ctx && typeof window !== "undefined") {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (enabled && ctx?.state === "suspended") ctx.resume();
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
