import React, { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PATANG, candleX, createPatang, stepPatang, yearOf } from "./patang.js";
import { sounds } from "../sound.js";

// Patang Market: fly a Sankranti kite through ten years of a stock chart (see patang.js).
// Arcade contract (like InsuranceRush): <PatangMarket running onEnd />. `running` is false during
// the countdown; onEnd(state) gets the finished game state.

const W = PATANG.w;
const H = PATANG.h;
const rs = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function PatangMarket({ running, onEnd }) {
  const { t } = useT();
  const canvas = useRef(null);
  const game = useRef(createPatang());
  const flap = useRef(false);
  const ended = useRef(false);
  const [hud, setHud] = useState({ year: 1, value: 0, units: 0, shield: 1 });

  useEffect(() => {
    const onKey = (e) => {
      if ([" ", "ArrowUp", "w", "W"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) flap.current = true;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = game.current;
      if (running && !ended.current) {
        if (flap.current) sounds.flap();
        const done = stepPatang(s, dt, { flap: flap.current });
        flap.current = false;
        for (const p of s.pops) {
          if (p.heard) continue;
          p.heard = true;
          if (p.kind === "rocket") sounds.whooshUp();
          else if (p.kind === "shield") sounds.chime();
          else sounds.coin();
        }
        if (done) {
          ended.current = true;
          const how = s.exit?.reason;
          if (how === "panic") sounds.alarm();
          else if (how === "crashed") sounds.crash();
          else sounds.stingGood();
          setTimeout(() => onEnd(s), 900);
        }
      } else flap.current = false;
      const ctx = canvas.current?.getContext("2d");
      if (ctx) draw(ctx, s, now, t);
      const c = s.candles[Math.max(0, Math.min(s.candles.length - 1, Math.round((s.scroll - 220) / PATANG.spacing)))];
      const next = { year: yearOf(c.i), value: Math.round(s.units * c.price), units: Math.round(s.units * 10) / 10, shield: s.shield };
      setHud((h) => (h.year === next.year && h.value === next.value && h.shield === next.shield && h.units === next.units ? h : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, onEnd, t]);

  return (
    <div className="arcade-field patang">
      <div className="arcade-bar patang-bar">
        <span className="patang-year">{t("arcade.patang.year", { n: hud.year, total: PATANG.years })}</span>
        <span className="patang-units">{t("arcade.patang.units", { n: hud.units })}</span>
        <span className="arcade-hearts" title={t("arcade.patang.shield")} aria-label={t("arcade.patang.shield")}>
          <Heart size={18} className={hud.shield ? "on" : ""} />
        </span>
        <strong className="arcade-live">{rs(hud.value)}</strong>
      </div>
      <canvas
        ref={canvas}
        width={W * 2}
        height={H * 2}
        onPointerDown={(e) => {
          e.preventDefault();
          flap.current = true;
        }}
        aria-label={t("arcade.games.patangMarket.goal")}
      />
    </div>
  );
}

// ---------- drawing ----------

function draw(ctx, s, now, t) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const sx = (worldX) => worldX - s.scroll + PATANG.kiteX;

  // Sankranti morning sky with a faint chart grid.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#ffd9a0");
  sky.addColorStop(0.55, "#ffeccb");
  sky.addColorStop(1, "#e9f4ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255, 190, 90, 0.55)";
  ctx.beginPath();
  ctx.arc(W - 70, 46, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120, 90, 50, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 30; y < H - 12; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // The crash years, tinted.
  const [c0, c1] = s.market.crash;
  const x0 = sx(candleX(c0) - PATANG.spacing / 2);
  const x1 = sx(candleX(c1) + PATANG.spacing / 2);
  if (x1 > 0 && x0 < W) {
    ctx.fillStyle = "rgba(220, 70, 50, 0.1)";
    ctx.fillRect(x0, 0, x1 - x0, H);
    ctx.fillStyle = "rgba(180, 50, 40, 0.75)";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`📉 ${t("arcade.patang.crash")}`, Math.max(60, Math.min(W - 60, (x0 + x1) / 2)), 18);
  }

  // The market's price line through the gaps.
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(160, 110, 20, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (const c of s.candles) {
    const x = sx(candleX(c.i));
    if (x < -PATANG.spacing || x > W + PATANG.spacing) continue;
    if (!started) ctx.moveTo(x, c.y);
    else ctx.lineTo(x, c.y);
    started = true;
  }
  ctx.stroke();
  ctx.restore();

  // Candles: solid above and below the gap, green on an up move and red on a down move.
  for (const c of s.candles) {
    const x = sx(candleX(c.i));
    if (x < -40 || x > W + 40) continue;
    const top = c.y - c.gap / 2;
    const bottom = c.y + c.gap / 2;
    const body = c.up ? "#5f9e46" : "#c94b3c";
    const dark = c.up ? "#2f4a26" : "#7a2318";
    const w = PATANG.candleW;
    for (const [y0, y1] of [
      [-4, top],
      [bottom, H - 10],
    ]) {
      if (y1 <= y0) continue;
      ctx.fillStyle = dark;
      ctx.fillRect(x - w / 2 - 2, y0, w + 4, y1 - y0);
      ctx.fillStyle = body;
      ctx.fillRect(x - w / 2, y0, w, y1 - y0);
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(x - w / 2 + 4, y0, 5, y1 - y0);
    }
    // Wicks into the gap.
    ctx.fillStyle = dark;
    ctx.fillRect(x - 1, top, 2, 9);
    ctx.fillRect(x - 1, bottom - 9, 2, 9);

    for (const th of c.things) {
      if (th.taken) continue;
      const tx = x + (th.x ?? 0);
      const ty = c.y + th.dy;
      if (th.kind === "coin") coin(ctx, tx, ty + Math.sin(now / 300 + c.i) * 1.5);
      else if (th.kind === "panic") panic(ctx, tx, ty, now, t);
      else rocket(ctx, tx, ty, now);
    }
  }

  // Ground with the years marked.
  ctx.fillStyle = "#c9a46a";
  ctx.fillRect(0, H - 10, W, 10);
  ctx.fillStyle = "#8a6a3a";
  ctx.fillRect(0, H - 10, W, 2);
  ctx.font = "700 8px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const c of s.candles) {
    if (c.i === 0 || yearOf(c.i) === yearOf(c.i - 1)) continue;
    const x = sx(candleX(c.i) - PATANG.spacing / 2);
    if (x < -10 || x > W + 10) continue;
    ctx.fillStyle = "#5c3b16";
    ctx.fillText(`Y${yearOf(c.i)}`, x, H - 2);
  }

  kite(ctx, s, now);

  for (const p of s.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t);
    ctx.fillStyle = { cheap: "#1f7a3a", coin: "#2f7d3a", rocket: "#c0392b", shield: "#2a6390" }[p.kind] ?? "#333";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    const label = p.kind === "shield" ? `💙 ${t("arcade.patang.breathe")}` : p.kind === "rocket" ? p.text : `${p.text} ${t("arcade.patang.unitsShort")}`;
    ctx.fillText(label, p.x, p.y - p.t * 26);
    ctx.globalAlpha = 1;
  }

  if (s.exit && s.exit.reason !== "stayed") {
    ctx.fillStyle = "rgba(40, 20, 10, 0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "900 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.exit.reason === "panic" ? t("arcade.patang.soldPanic") : t("arcade.patang.soldCrash"), W / 2, H / 2);
  } else if (s.exit) {
    ctx.fillStyle = "rgba(255, 240, 200, 0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2f4a26";
    ctx.font = "900 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🎉 ${t("arcade.patang.stayedBanner")}`, W / 2, H / 2);
  }
}

function coin(ctx, x, y) {
  ctx.fillStyle = "#b07a12";
  ctx.beginPath();
  ctx.arc(x, y + 1.5, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4f00";
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹", x, y + 0.5);
  ctx.textBaseline = "alphabetic";
}

function panic(ctx, x, y, now, t) {
  const shake = Math.sin(now / 40) * 1.2;
  const label = t("arcade.patang.sellNow");
  ctx.font = "900 8px system-ui, sans-serif";
  const w = Math.max(44, ctx.measureText(label).width + 10);
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.roundRect(x - w / 2 + shake, y - 9, w, 18, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4 + shake, y + 8);
  ctx.lineTo(x + shake, y + 14);
  ctx.lineTo(x + 4 + shake, y + 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + shake, y + 0.5);
  ctx.textBaseline = "alphabetic";
}

function rocket(ctx, x, y, now) {
  const bob = Math.sin(now / 160) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-18, -3 + Math.sin(now / 50) * 2);
  ctx.lineTo(-18, 3 - Math.sin(now / 50) * 2);
  ctx.fill();
  ctx.fillStyle = "#e9e9f2";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(6, -4.5);
  ctx.lineTo(6, 4.5);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#c0392b";
  ctx.font = "900 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("10x!", x, y - 10 + bob);
}

function kite(ctx, s, now) {
  const x = PATANG.kiteX;
  const y = s.kite.y;
  if (s.safeFor > 0 && Math.floor(now / 90) % 2) return;
  // The string, down to someone on a rooftop off screen.
  ctx.strokeStyle = "rgba(60, 40, 20, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 8);
  ctx.quadraticCurveTo(x - 40, y + 60, -10, H + 10);
  ctx.stroke();
  // The tail: three bows that wave.
  for (let i = 1; i <= 3; i++) {
    const tx = x - 4 - i * 7;
    const ty = y + 12 + i * 5 + Math.sin(now / 140 + i) * 3;
    ctx.fillStyle = i % 2 ? "#e0453a" : "#ffd24a";
    ctx.beginPath();
    ctx.moveTo(tx - 3, ty - 2);
    ctx.lineTo(tx + 3, ty + 2);
    ctx.lineTo(tx + 3, ty - 2);
    ctx.lineTo(tx - 3, ty + 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.max(-0.5, Math.min(0.5, s.kite.vy / 500)));
  const r = PATANG.kiteR + 3;
  ctx.fillStyle = "#3a1f5c";
  ctx.beginPath();
  ctx.moveTo(0, -r - 2);
  ctx.lineTo(r + 2, 0);
  ctx.lineTo(0, r + 2);
  ctx.lineTo(-r - 2, 0);
  ctx.closePath();
  ctx.fill();
  const halves = [
    ["#d6336c", [0, -r], [r, 0], [0, r]],
    ["#7048e8", [0, -r], [-r, 0], [0, r]],
  ];
  for (const [col, a, b, c] of halves) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.lineTo(...c);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- the result: your flight on the chart ----------

export function PatangReport({ report, reason }) {
  const { t } = useT();
  const r = report;
  const n = r.prices.length;
  const lo = Math.min(...r.prices);
  const hi = Math.max(...r.prices);
  const px = (i) => 6 + (i / (n - 1)) * 288;
  const py = (p) => 86 - ((p - lo) / Math.max(1, hi - lo)) * 76;
  const line = r.prices.map((p, i) => `${px(i)},${py(p)}`).join(" ");
  const stayed = reason === "stayed";
  return (
    <div className="patang-report">
      <svg viewBox="0 0 300 96" className="patang-chart" role="img" aria-label={t("arcade.patang.chart")}>
        <rect x={px(r.crash[0] - 0.5)} y="0" width={px(r.crash[1] + 0.5) - px(r.crash[0] - 0.5)} height="96" className="crash" />
        <polyline points={line} className="price" />
        {r.buys.map((b) => (
          <circle key={b.i} cx={px(b.i)} cy={py(r.prices[b.i])} r={1.5 + b.units * 0.55} className="buy" />
        ))}
        <g transform={`translate(${px(r.exitIndex)},${py(r.prices[r.exitIndex])})`} className={stayed ? "exit stayed" : "exit quit"}>
          <circle r="5" />
          <text y="-8">{stayed ? "🏁" : "✋"}</text>
        </g>
      </svg>
      <div className="patang-compare">
        <p className={stayed ? "good" : "bad"}>
          <small>{stayed ? t("arcade.patang.youStayed") : reason === "panic" ? t("arcade.patang.youPanicked") : t("arcade.patang.youQuit")}</small>
          <b>{rs(r.value)}</b>
        </p>
        <p className={stayed ? "bad" : "good"}>
          <small>{stayed ? t("arcade.patang.ifBottom") : t("arcade.patang.ifStayed")}</small>
          <b>{rs(stayed ? r.bottomValue : r.stayValue)}</b>
        </p>
      </div>
      {r.avgUnitsCheap > 0 && r.avgUnitsDear > 0 && (
        <p className="patang-dip">{t("arcade.patang.dip", { cheap: r.avgUnitsCheap.toFixed(1), dear: r.avgUnitsDear.toFixed(1) })}</p>
      )}
    </div>
  );
}

// ---------- the start card: the goal and every symbol, in a few words ----------

function PatangIcon({ kind }) {
  const { t } = useT();
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const ctx = ref.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 128, 96);
        // Drawn half again as big as in the game (canvas 128×96 shown at 64×48).
        ctx.setTransform(3, 0, 0, 3, 0, 0);
        if (kind === "kite") {
          ctx.save();
          ctx.translate(-PATANG.kiteX + 24, Math.sin(now / 300) * 2);
          kite(ctx, { kite: { y: 11, vy: 0 }, safeFor: 0 }, now);
          ctx.restore();
        } else if (kind === "coin") coin(ctx, 21, 16);
        else if (kind === "panic") panic(ctx, 21, 14, now, t);
        else if (kind === "rocket") rocket(ctx, 21, 19, now);
        else if (kind === "candle") {
          ctx.setTransform(2, 0, 0, 2, 0, 0);
          for (const [x, up] of [
            [22, true],
            [42, false],
          ]) {
            ctx.fillStyle = up ? "#2f4a26" : "#7a2318";
            ctx.fillRect(x - 7, 6, 14, 36);
            ctx.fillStyle = up ? "#5f9e46" : "#c94b3c";
            ctx.fillRect(x - 5, 8, 10, 32);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, t]);
  if (kind === "shield")
    return (
      <span className="patang-icon heart" aria-hidden="true">
        <Heart size={26} />
      </span>
    );
  return <canvas ref={ref} className="patang-icon" width={128} height={96} aria-hidden="true" />;
}

const RULES = [
  { kind: "kite", tone: "how" },
  { kind: "coin", tone: "good" },
  { kind: "shield", tone: "good" },
  { kind: "candle", tone: "bad" },
  { kind: "panic", tone: "bad" },
  { kind: "rocket", tone: "bad" },
];

export function PatangIntro({ startRef, onStart, playLabel }) {
  const { t } = useT();
  return (
    <div className="patang-intro">
      <p className="patang-lead">{t("arcade.patang.rules.lead")}</p>
      <ul className="patang-rules">
        {RULES.map((r, i) => (
          <li key={r.kind} className={r.tone} style={{ animationDelay: `${0.05 + i * 0.08}s` }}>
            <PatangIcon kind={r.kind} />
            <b>{t(`arcade.patang.rules.${r.kind}.name`)}</b>
            <small>{t(`arcade.patang.rules.${r.kind}.does`)}</small>
          </li>
        ))}
      </ul>
      <button ref={startRef} className="primary-button big" onClick={onStart}>
        {playLabel}
      </button>
    </div>
  );
}
