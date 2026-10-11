import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarPlus, Scale, ShoppingBasket } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { SNAKE, buysPct, createSnake, priceAt, snakeResult, stepEvery, stepSnake, turn } from "./priceSnake.js";

// Price Snake (L03 Inflation), drawn on a small canvas. Arcade contract (like InsuranceRush):
// <PriceSnake running onEnd />; onEnd(result) gets { score, years, price, history, reason }.

const CELL = 24;
const W = SNAKE.cols * CELL;
const H = SNAKE.rows * CELL;
const KEYS = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

// A few fixed flowers in the grass.
const FLOWERS = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 137) % W) + 6,
  y: ((i * 89 + 31) % H) + 4,
  c: ["#fff4f8", "#ffd6e4", "#fff2b3", "#e4dcff"][i % 4],
}));

export function PriceSnake({ running, onEnd }) {
  const { t, money } = useT();
  const canvasRef = useRef(null);
  const game = useRef(null);
  const runningRef = useRef(running);
  const onEndRef = useRef(onEnd);
  runningRef.current = running;
  onEndRef.current = onEnd;
  const [hud, setHud] = useState({
    year: 0,
    price: SNAKE.start,
    state: "running",
    reason: null,
  });

  useEffect(() => {
    const s = createSnake();
    game.current = s;
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    let raf;
    let last = performance.now();
    let year = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (runningRef.current) stepSnake(s, dt);
      if (s.year !== year) {
        year = s.year;
        sounds.coin?.();
        setHud({
          year: s.year,
          price: s.price,
          state: s.state,
          reason: s.reason,
        });
      }
      const alpha = s.state === "running" ? Math.min(1, s.acc / stepEvery(s.year)) : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, s, now / 1000, alpha);
      if (s.state === "running") raf = requestAnimationFrame(frame);
      else {
        if (s.reason === "win") sounds.chime?.();
        else sounds.thud?.();
        setHud({
          year: s.year,
          price: s.price,
          state: s.state,
          reason: s.reason,
        });
        setTimeout(() => onEndRef.current(snakeResult(s)), 1500);
      }
    };
    raf = requestAnimationFrame(frame);
    const onKey = (e) => {
      if (!KEYS[e.key]) return;
      e.preventDefault();
      turn(s, KEYS[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const press = (dir) => () => game.current && turn(game.current, dir);
  const growth = hud.price - SNAKE.start;
  return (
    <div className="arcade-field snake-field">
      <div className="snake-bar">
        <span className="snake-year" role="status" aria-live="polite">
          <CalendarPlus size={18} aria-hidden="true" />
          <span>
            <b>{t("arcade.snake.year", { n: hud.year })}</b>
            <small>{t("arcade.snake.age", { n: SNAKE.startAge + hud.year })}</small>
          </span>
        </span>
        <span className="snake-years" aria-hidden="true">
          <i style={{ width: `${(hud.year / SNAKE.maxYears) * 100}%` }} />
        </span>
        <span className="snake-weight" key={hud.year} title={t("arcade.snake.weightHint")}>
          <Scale size={20} aria-hidden="true" />
          <span>
            <small>{t("arcade.snake.weight")}</small>
            <b>{money(hud.price)}</b>
          </span>
          {growth > 0 && <em>+{Math.round((growth / SNAKE.start) * 100)}%</em>}
        </span>
      </div>
      <div className="snake-stage">
        <canvas ref={canvasRef} className="snake-canvas" role="img" aria-label={t("arcade.games.priceSnake.how")} />
        {hud.state === "over" && (
          <div className={`snake-over ${hud.reason}`} role="alert">
            <p>{hud.reason === "win" ? t("arcade.snake.win") : t("arcade.snake.bonk")}</p>
          </div>
        )}
      </div>
      <div className="snake-pad">
        <button type="button" className="secondary-button" aria-label={t("arcade.snake.left")} onPointerDown={press("left")}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" className="secondary-button" aria-label={t("arcade.snake.up")} onPointerDown={press("up")}>
          <ArrowUp size={18} />
        </button>
        <button type="button" className="secondary-button" aria-label={t("arcade.snake.down")} onPointerDown={press("down")}>
          <ArrowDown size={18} />
        </button>
        <button type="button" className="secondary-button" aria-label={t("arcade.snake.right")} onPointerDown={press("right")}>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------- drawing ----------

const center = (c) => c * CELL + CELL / 2;

function draw(ctx, s, now, alpha) {
  ctx.clearRect(0, 0, W, H);
  for (let y = 0; y < SNAKE.rows; y++)
    for (let x = 0; x < SNAKE.cols; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#b9e29a" : "#c6e9a8";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  for (const f of FLOWERS) drawFlower(ctx, f.x, f.y, f.c);
  if (s.food && s.state !== "over") drawCalendar(ctx, center(s.food.x), center(s.food.y), now);
  drawSnake(ctx, s, now, alpha);
  for (const p of s.pops) {
    const k = (s.time - p.at) / 1.1;
    ctx.globalAlpha = 1 - k;
    ctx.font = "800 15px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fffaf0";
    const px = center(p.x);
    const py = center(p.y) - 14 - k * 22;
    ctx.strokeText(p.text, px, py);
    ctx.fillStyle = "#d9572b";
    ctx.fillText(p.text, px, py);
    ctx.globalAlpha = 1;
  }
}

function drawFlower(ctx, x, y, c) {
  ctx.fillStyle = c;
  for (const [dx, dy] of [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f2b632";
  ctx.beginPath();
  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A little calendar page that says +1.
function drawCalendar(ctx, cx, cy, now) {
  const bob = Math.sin(now * 4) * 1.6;
  ctx.fillStyle = "rgba(60, 100, 40, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 8 - bob * 0.6, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const x = cx - 9;
  const y = cy - 10 + bob;
  roundRect(ctx, x, y, 18, 18, 4);
  ctx.fillStyle = "#fffdf6";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#8a6a4a";
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x, y, 18, 18, 4);
  ctx.clip();
  ctx.fillStyle = "#ef6b5b";
  ctx.fillRect(x, y, 18, 5.5);
  ctx.restore();
  ctx.fillStyle = "#8a6a4a";
  ctx.fillRect(x + 4, y - 2, 2, 4);
  ctx.fillRect(x + 12, y - 2, 2, 4);
  ctx.font = "800 9.5px 'DM Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#4a3a2a";
  ctx.fillText("+1", cx, y + 12);
  ctx.textBaseline = "alphabetic";
  // A twinkle.
  const tw = (Math.sin(now * 3) + 1) / 2;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + tw * 0.6})`;
  const sx = cx + 10;
  const sy = y - 1;
  const r = 1.5 + tw * 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy - r * 2);
  ctx.lineTo(sx + r * 0.5, sy - r * 0.5);
  ctx.lineTo(sx + r * 2, sy);
  ctx.lineTo(sx + r * 0.5, sy + r * 0.5);
  ctx.lineTo(sx, sy + r * 2);
  ctx.lineTo(sx - r * 0.5, sy + r * 0.5);
  ctx.lineTo(sx - r * 2, sy);
  ctx.lineTo(sx - r * 0.5, sy - r * 0.5);
  ctx.closePath();
  ctx.fill();
}

// The snake: a round, outlined body that gets thicker as prices get heavier, and a cute face.
function drawSnake(ctx, s, now, alpha) {
  const pts = s.body.map((b, i) => {
    const p = s.prev[i] ?? s.prev[s.prev.length - 1] ?? b;
    return {
      x: center(p.x + (b.x - p.x) * alpha),
      y: center(p.y + (b.y - p.y) * alpha),
    };
  });
  const heavy = Math.min(1, (s.price - SNAKE.start) / (priceAt(SNAKE.maxYears) - SNAKE.start));
  const th = CELL * (0.56 + 0.3 * heavy);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Soft shadow, outline, body, then a highlight along the back.
  ctx.save();
  ctx.translate(0, 3);
  path();
  ctx.strokeStyle = "rgba(50, 90, 30, 0.2)";
  ctx.lineWidth = th + 3;
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = "#3d7f34";
  ctx.lineWidth = th + 4;
  ctx.stroke();
  path();
  ctx.strokeStyle = "#78c95a";
  ctx.lineWidth = th;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -th * 0.18);
  path();
  ctx.strokeStyle = "#a5e27e";
  ctx.lineWidth = th * 0.34;
  ctx.stroke();
  ctx.restore();
  // Spots.
  ctx.fillStyle = "#f4e27a";
  for (let i = 2; i < pts.length; i += 2) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, th * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head.
  const head = pts[0];
  const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.dir];
  const hr = th * 0.64 + 2;
  if (Math.sin(now * 5) > 0.55 && s.state === "running") {
    ctx.strokeStyle = "#e0484f";
    ctx.lineWidth = 1.8;
    const tx = head.x + dir[0] * (hr + 6);
    const ty = head.y + dir[1] * (hr + 6);
    ctx.beginPath();
    ctx.moveTo(head.x + dir[0] * hr, head.y + dir[1] * hr);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx + dir[0] * 3 - dir[1] * 2.5, ty + dir[1] * 3 + dir[0] * 2.5);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + dir[0] * 3 + dir[1] * 2.5, ty + dir[1] * 3 - dir[0] * 2.5);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
  ctx.fillStyle = "#78c95a";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#3d7f34";
  ctx.stroke();
  const side = [-dir[1], dir[0]];
  const eye = (k) => ({
    x: head.x + dir[0] * hr * 0.25 + side[0] * hr * 0.45 * k,
    y: head.y + dir[1] * hr * 0.25 + side[1] * hr * 0.45 * k,
  });
  const blink = s.state === "over" || now % 3.2 < 0.12;
  for (const k of [-1, 1]) {
    const e = eye(k);
    if (blink) {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(e.x - 2.5, e.y);
      ctx.lineTo(e.x + 2.5, e.y);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(e.x + dir[0] * 1.2, e.y + dir[1] * 1.2, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(e.x + dir[0] * 1.2 - 0.6, e.y + dir[1] * 1.2 - 0.7, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Blush.
  ctx.fillStyle = "rgba(255, 130, 150, 0.55)";
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(head.x - dir[0] * hr * 0.2 + side[0] * hr * 0.72 * k, head.y - dir[1] * hr * 0.2 + side[1] * hr * 0.72 * k, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- intro and result ----------

export function SnakeIntro({ best, startRef, onStart }) {
  const { t } = useT();
  return (
    <div className="snake-intro">
      <p className="snake-lead">{t("arcade.snake.lead")}</p>
      <ol className="snake-steps">
        <li style={{ animationDelay: "0.05s" }}>
          <b>1</b>
          <span className="snake-step-art keys" aria-hidden="true">
            <kbd>←</kbd>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd>
          </span>
          <span>{t("arcade.snake.step1")}</span>
        </li>
        <li style={{ animationDelay: "0.15s" }}>
          <b>2</b>
          <span className="snake-step-art" aria-hidden="true">
            <span className="snake-cal">+1</span>
          </span>
          <span>{t("arcade.snake.step2")}</span>
        </li>
        <li style={{ animationDelay: "0.25s" }}>
          <b>3</b>
          <span className="snake-step-art weigh" aria-hidden="true">
            <Scale size={26} />
          </span>
          <span>{t("arcade.snake.step3")}</span>
        </li>
      </ol>
      <p className="snake-fact">
        <ShoppingBasket size={18} aria-hidden="true" /> {t("arcade.snake.fact")}
      </p>
      {best > 0 && <p className="snake-stars-line">{t("arcade.snake.best", { n: best })}</p>}
      <button ref={startRef} className="primary-button big snake-go" onClick={onStart}>
        {t("arcade.playEndless")} <ArrowRight size={18} />
      </button>
    </div>
  );
}

// How heavy prices got: one bar per year, against the ₹100 that stayed in a tin box.
export function SnakeResult({ final }) {
  const { t, money } = useT();
  const { years, price, history } = final;
  const top = Math.max(Math.max(...history) * 1.1, 160);
  const baseline = (SNAKE.start / top) * 100;
  return (
    <div className="snake-result">
      <p className="snake-headline">{years > 0 ? t("arcade.snake.headline", { n: years, price: money(price) }) : t("arcade.snake.headlineZero")}</p>
      {years > 0 && (
        <>
          <div className="snake-tags">
            <span className="snake-tag">
              <small>{t("arcade.snake.age", { n: SNAKE.startAge })}</small>
              <b>{money(SNAKE.start)}</b>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
            <span className="snake-tag heavy">
              <small>{t("arcade.snake.age", { n: SNAKE.startAge + years })}</small>
              <b>{money(price)}</b>
            </span>
          </div>
          <div
            className="snake-chart"
            role="img"
            aria-label={t("arcade.snake.chart", {
              from: money(SNAKE.start),
              to: money(price),
              n: years,
            })}
          >
            <div className="snake-bars">
              {history.map((p, i) => (
                <span
                  key={i}
                  className="snake-barcol"
                  style={{
                    "--h": `${(p / top) * 100}%`,
                    animationDelay: `${0.2 + i * 0.05}s`,
                  }}
                >
                  {(i === history.length - 1 || (history.length > 6 && i === Math.floor(history.length / 2))) && <em>{money(p)}</em>}
                </span>
              ))}
            </div>
            <span className="snake-tin" style={{ bottom: `calc(20px + (100% - 38px) * ${baseline / 100})` }}>
              <small>{t("arcade.snake.tin")}</small>
            </span>
            <span className="snake-axis">
              <small>{t("arcade.snake.age", { n: SNAKE.startAge })}</small>
              <small>{t("arcade.snake.age", { n: SNAKE.startAge + years })}</small>
            </span>
          </div>
        </>
      )}
      {years > 0 && (
        <p className="snake-buys">
          <span className="snake-meter" aria-hidden="true">
            <i style={{ width: `${buysPct(years)}%` }} />
          </span>
          {t("arcade.snake.buys", { pct: buysPct(years) })}
        </p>
      )}
    </div>
  );
}
