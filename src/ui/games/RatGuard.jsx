import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Landmark, Lock, Package, SkipForward, Sparkles } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../PixelPortrait.jsx";
import { sounds } from "../sound.js";

// Rat Guard: the prologue's first scene, played instead of read.
//   pick1    only the tin box can be chosen (the bank is locked)
//   play1    mice pour in from every side; click to POOF them, stage after stage
//   swarm    "DANGER! HIGH FREQUENCY": too many to stop, one reaches the box
//   cutscene the mouse gets in and eats ₹500
//   pick2    now the bank is open too
//   play2    bank: mice bonk off the vault and vanish / tin box: they get in again
//   end      → onDone("bank" | "steel_box")
const W = 480;
const H = 270;
const BOX = { x: W / 2, y: H / 2 + 6 };
const STAGES = [
  { until: 9, every: 0.85, speed: 26 },
  { until: 18, every: 0.55, speed: 32 },
  { until: 27, every: 0.36, speed: 38 },
];
const SWARM_AT = 27;
const PLAY2_SECONDS = 12;
const REACH = 24;
const SPACE_MS = 350; // Space swats at most this often; clicking is faster.

const rand = (a, b) => a + Math.random() * (b - a);

function spawnMouse(speed) {
  // From any edge, aimed at the box.
  const side = Math.floor(Math.random() * 4);
  const x = side === 0 ? -10 : side === 1 ? W + 10 : rand(0, W);
  const y = side === 2 ? -10 : side === 3 ? H + 10 : rand(0, H);
  return { x, y, speed: speed * rand(0.8, 1.25), wob: Math.random() * 6, tone: Math.random() < 0.5 ? "grey" : "tan", alive: true };
}

// ---------- drawing (all code-drawn pixel art) ----------
function drawFloor(ctx, now, bank) {
  ctx.fillStyle = bank ? "#3a3f4a" : "#6b4527";
  ctx.fillRect(0, 0, W, H);
  // Planks (or the bank's tiles).
  for (let y = 0; y < H; y += bank ? 24 : 16) {
    ctx.fillStyle = bank ? (y / 24) % 2 ? "#454b57" : "#3f4551" : (y / 16) % 2 ? "#7a5030" : "#704a2c";
    ctx.fillRect(0, y, W, bank ? 23 : 15);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = ((y * 7) % 60) - 60; x < W; x += bank ? 24 : 60) ctx.fillRect(x, y, 1, bank ? 24 : 16);
  }
  // Shelves with jars at the back.
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
  // Vignette.
  const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 300);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  void now;
}

function drawTinBox(ctx, { open = 0, notes = 1, shake = 0 }) {
  const x = BOX.x + (shake ? Math.sin(performance.now() / 30) * shake : 0);
  const y = BOX.y;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(x - 31, y - 13, 62, 36);
  ctx.fillStyle = "#b9c3cf";
  ctx.fillRect(x - 29, y - 11, 58, 32);
  ctx.fillStyle = "#dfe6ee";
  ctx.fillRect(x - 29, y - 11, 58, 5);
  ctx.fillStyle = "#8b96a3";
  ctx.fillRect(x - 29, y + 15, 58, 6);
  // Notes inside, peeking out when the lid opens.
  if (open > 0 && notes > 0) {
    for (let i = 0; i < Math.ceil(notes * 4); i++) {
      ctx.fillStyle = i % 2 ? "#8ccf7e" : "#b6e3a4";
      ctx.fillRect(x - 20 + i * 10, y - 18 - (i % 2) * 3, 12, 8);
    }
  }
  // Lid.
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
  const x = BOX.x;
  const y = BOX.y;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 42, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c2027";
  ctx.fillRect(x - 38, y - 34, 76, 66);
  ctx.fillStyle = bonk > 0 ? "#9fb0c8" : "#7d8798";
  ctx.fillRect(x - 35, y - 31, 70, 60);
  ctx.fillStyle = "#5c6575";
  ctx.fillRect(x - 28, y - 24, 56, 46);
  // Dial and handle.
  ctx.fillStyle = "#c9d2de";
  ctx.beginPath();
  ctx.arc(x, y - 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2f36";
  ctx.beginPath();
  ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 16, y - 6, 8, 8);
  // "BANK" plate.
  ctx.fillStyle = "#ffd84a";
  ctx.fillRect(x - 18, y - 40, 36, 9);
  ctx.fillStyle = "#2b1d0e";
  ctx.font = '8px "Pixelify Sans", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹ BANK", x, y - 35);
  // Shield shimmer.
  if (bonk > 0) {
    ctx.strokeStyle = `rgba(150,220,255,${bonk})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 2, 48, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMouse(ctx, m, now) {
  const dx = BOX.x - m.x;
  const dy = BOX.y - m.y;
  const face = dx >= 0 ? 1 : -1;
  const step = Math.sin(now / 70 + m.wob) * 1.2;
  const x = Math.round(m.x);
  const y = Math.round(m.y + step * 0.4);
  const body = m.tone === "grey" ? "#c9c6cf" : "#e0b47a";
  const dark = m.tone === "grey" ? "#8e8a96" : "#a87a44";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * 1.4, 1.4);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 6, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.strokeStyle = "#e89aa8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.quadraticCurveTo(-15, -2 + step, -18, 3);
  ctx.stroke();
  // Body and head.
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, 1, 9.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(5, -7, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a0b4";
  ctx.beginPath();
  ctx.arc(5, -7, 2, 0, Math.PI * 2);
  ctx.fill();
  // Eye and nose.
  ctx.fillStyle = "#1c1420";
  ctx.fillRect(9, -4, 2, 2);
  ctx.fillStyle = "#f27a92";
  ctx.fillRect(12, -2, 2, 2);
  // Feet.
  ctx.fillStyle = "#f2a0b4";
  ctx.fillRect(-4 + step, 5, 2, 2);
  ctx.fillRect(4 - step, 5, 2, 2);
  ctx.restore();
  void dy;
}

function drawPoof(ctx, p, now) {
  const t = (now - p.at) / 500;
  if (t > 1) return false;
  ctx.fillStyle = `rgba(230,240,255,${1 - t})`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + p.spin;
    const r = 4 + t * 14;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, 4 * (1 - t) + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255,216,74,${1 - t})`;
  ctx.fillRect(p.x - 10 + t * 4, p.y - 12 - t * 8, 3, 3);
  ctx.fillRect(p.x + 9 - t * 3, p.y - 8 - t * 10, 2, 2);
  ctx.font = '9px "Pixelify Sans", monospace';
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
  ctx.fillText(p.label, p.x, p.y - 16 - t * 12);
  return true;
}

// ---------- the component ----------
export function RatGuard({ onDone }) {
  const { t, money } = useT();
  const canvas = useRef(null);
  const [phase, setPhase] = useState("pick1");
  const [hud, setHud] = useState({ score: 0, stage: 1, danger: 0 });
  const [choice, setChoice] = useState("tin"); // what round 2 protects
  const sim = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pointer = useRef(null);
  const lastSpace = useRef(0);

  // Behind the first question: the room and the tin box, quiet for now.
  useEffect(() => {
    if (phase !== "pick1") return;
    const ctx = canvas.current.getContext("2d");
    drawFloor(ctx, 0, false);
    drawTinBox(ctx, {});
  }, [phase]);

  // The game loop runs while a round (or the cutscene) is on screen.
  useEffect(() => {
    if (!["play1", "cutscene", "play2", "cutscene2"].includes(phase)) return undefined;
    const ctx = canvas.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (phase === "play1" || phase === "play2") {
      sim.current = { time: 0, mice: [], poofs: [], spawnIn: 0.4, score: sim.current?.score ?? 0, eater: null, cut: 0, bonk: 0, swarm: false };
    }
    let raf;
    let last = performance.now();
    const target = phase === "play2" ? choice : "tin";
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      const p = phaseRef.current;
      s.time += dt;

      if (p === "play1" || p === "play2") {
        // Pace: stages in round 1, a fast steady stream in round 2.
        let every;
        let speed;
        if (p === "play1") {
          const st = STAGES.find((x) => s.time < x.until);
          s.swarm = !st;
          every = st ? st.every : 0.07;
          speed = st ? st.speed : 46;
          if (!st && s.time > SWARM_AT + 5) {
            for (const m of s.mice) if (m.alive) m.speed = 220;
          }
          const stage = st ? STAGES.indexOf(st) + 1 : 4;
          const danger = Math.min(1, s.time / SWARM_AT);
          if (stage !== hudRef.stage || Math.abs(danger - hudRef.danger) > 0.04 || s.score !== hudRef.score) {
            hudRef = { score: s.score, stage, danger };
            setHud(hudRef);
          }
        } else {
          every = 0.32;
          speed = 40;
          if (s.score !== hudRef.score) setHud((hudRef = { ...hudRef, score: s.score }));
          if (s.time > PLAY2_SECONDS && target === "bank") {
            setPhase("end");
            return;
          }
        }
        s.spawnIn -= dt;
        while (s.spawnIn <= 0) {
          s.spawnIn += every;
          s.mice.push(spawnMouse(speed));
        }
        for (const m of s.mice) {
          if (!m.alive) continue;
          const dx = BOX.x - m.x;
          const dy = BOX.y - m.y;
          const d = Math.hypot(dx, dy);
          if (d < REACH + (target === "bank" ? 18 : 0)) {
            if (target === "bank") {
              // The vault: the mouse bonks and is gone.
              m.alive = false;
              s.bonk = 1;
              s.poofs.push({ x: m.x, y: m.y, at: now, spin: Math.random() * 6, label: t("ratguard.bonk") });
              sounds.tap?.();
              continue;
            }
            // Into the tin box: the cutscene (round 2 with the tin box ends the same way).
            m.alive = false;
            s.eater = { x: m.x, y: m.y };
            s.cut = 0;
            for (const o of s.mice) o.flee = true;
            sounds.thud?.();
            setPhase(p === "play1" ? "cutscene" : "cutscene2");
            break;
          }
          m.x += (dx / d) * m.speed * dt;
          m.y += (dy / d) * m.speed * dt;
        }
        s.bonk = Math.max(0, s.bonk - dt * 2);
      }

      // Cutscene: the others scatter; the eater climbs in and chews.
      if (p === "cutscene" || p === "cutscene2") {
        s.cut += dt;
        for (const m of s.mice) {
          if (!m.alive) continue;
          const dx = m.x - BOX.x;
          const dy = m.y - BOX.y;
          const d = Math.hypot(dx, dy) || 1;
          m.x += (dx / d) * 160 * dt;
          m.y += (dy / d) * 160 * dt;
        }
        if (s.eater) {
          s.eater.x += (BOX.x - s.eater.x) * Math.min(1, dt * 3);
          s.eater.y += (BOX.y - 14 - s.eater.y) * Math.min(1, dt * 3);
        }
        if (s.cut > 3.6) {
          setPhase(p === "cutscene" ? "pick2" : "end");
          return;
        }
      }
      s.mice = s.mice.filter((m) => m.alive && m.x > -40 && m.x < W + 40 && m.y > -40 && m.y < H + 40);

      // Draw.
      const bank = (p === "play2" || p === "end") && target === "bank";
      drawFloor(ctx, now, bank);
      const cutting = p === "cutscene" || p === "cutscene2";
      const open = cutting ? Math.min(1, s.cut / 0.6) : 0;
      if (bank) drawVault(ctx, { bonk: s.bonk });
      else drawTinBox(ctx, { open, notes: cutting ? Math.max(0.25, 1 - s.cut / 3) : 1, shake: cutting && s.cut > 0.6 ? 2 : 0 });
      const sorted = [...s.mice].sort((a, b) => a.y - b.y);
      for (const m of sorted) drawMouse(ctx, m, now);
      if (cutting && s.eater) {
        drawMouse(ctx, { ...s.eater, tone: "grey", wob: 0 }, now * 3);
        if (s.cut > 0.8) {
          // Chewed notes fly out.
          for (let i = 0; i < 5; i++) {
            const k = (s.cut * 2 + i * 0.37) % 1;
            ctx.fillStyle = i % 2 ? "#8ccf7e" : "#b6e3a4";
            ctx.fillRect(BOX.x - 20 + i * 10 + Math.sin(i + s.cut * 6) * 8, BOX.y - 20 - k * 40, 5, 4);
          }
          ctx.font = '20px "Pixelify Sans", monospace';
          ctx.textAlign = "center";
          ctx.fillStyle = "#2b1d0e";
          ctx.fillText(`−${money(500)}`, BOX.x + 2, BOX.y - 52);
          ctx.fillStyle = "#ff6a5a";
          ctx.fillText(`−${money(500)}`, BOX.x, BOX.y - 54);
        }
      }
      s.poofs = s.poofs.filter((pf) => drawPoof(ctx, pf, now));
      // The swatter's red target ring.
      const ptr = pointer.current;
      if (ptr && (p === "play1" || p === "play2")) {
        ctx.strokeStyle = "rgba(255,70,60,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,70,60,0.18)";
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    let hudRef = { score: sim.current.score, stage: 1, danger: 0 };
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
    let best = null;
    let bestD = 20;
    for (const m of s.mice) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - at.x, m.y - at.y);
      if (d < bestD) (best = m), (bestD = d);
    }
    if (!best) return;
    best.alive = false;
    s.score += 10;
    s.poofs.push({ x: best.x, y: best.y, at: performance.now(), spin: Math.random() * 6, label: t("ratguard.poof") });
    sounds.coin?.();
  }

  // Keyboard: Space swats the mouse nearest the box.
  useEffect(() => {
    const onKey = (e) => {
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
      s.eater = { x: BOX.x - 60, y: BOX.y + 40 };
      s.cut = 0;
      for (const m of s.mice) m.flee = true;
      setPhase("cutscene");
    } else if (phase === "play2") {
      if (choice === "bank") setPhase("end");
      else {
        s.eater = { x: BOX.x + 60, y: BOX.y + 40 };
        s.cut = 0;
        setPhase("cutscene2");
      }
    }
  }

  const playing = phase === "play1" || phase === "play2";
  const round2 = ["pick2", "play2", "cutscene2", "end"].includes(phase);
  const stageText = round2 ? t("ratguard.round2") : hud.stage === 4 ? t("ratguard.danger") : t("ratguard.stage", { n: hud.stage });
  return (
    <div className="rg-layer" role="dialog" aria-modal="true" aria-label={t("ratguard.title")}>
      <div className={`rg-cabinet phase-${phase} ${hud.stage === 4 && (phase === "play1" || phase === "cutscene") ? "swarming" : ""}`}>
        <div className="rg-hud">
          <span className="rg-chip">{t("ratguard.score", { n: hud.score.toLocaleString("en-IN") })}</span>
          <span className="rg-chip">{stageText}</span>
          <span className="rg-danger" aria-hidden="true">
            <small>{t("ratguard.frequency")}</small>
            <i style={{ width: `${(round2 ? 0.6 : hud.danger) * 100}%` }} />
          </span>
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
              <button className="primary-button big" autoFocus onClick={() => onDone(choice === "bank" ? "bank" : "steel_box")}>
                {t("ratguard.continue")} <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
        <div className="rg-foot">
          <span>{playing ? t("ratguard.how") : ""}</span>
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
