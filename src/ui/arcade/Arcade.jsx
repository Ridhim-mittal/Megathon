import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Gamepad2, Heart, Lightbulb, PiggyBank, RotateCcw, ShieldBan, Snowflake, Star, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { loadArcade, saveArcadeBest } from "../persist.js";
import { sounds } from "../sound.js";
import { FIELD, GAMES, ballRadius, createGame, gameById, laneY, result, stepGame } from "./games.js";

// The arcade: three one-minute games with a tiny lesson each. Practice only, no money moves.
export const GAME_ICON = { jarDash: PiggyBank, scamSmash: ShieldBan, snowball: Snowflake };
const STARS = { jarDash: [60, 120, 170], scamSmash: [120, 260, 400], snowball: [400, 650, 850] };
export const starsFor = (id, score) => STARS[id].filter((x) => score >= x).length;

// A list of the three games (the phone's Arcade app).
export function ArcadeMenu({ onPick, onClose }) {
  const { t } = useT();
  const best = loadArcade();
  return (
    <div className="view arcade arcade-menu">
      <header className="arcade-head">
        <Gamepad2 size={22} aria-hidden="true" />
        <h2>{t("arcade.title")}</h2>
        <button className="panel-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={17} />
        </button>
      </header>
      <div className="arcade-tiles">
        {GAMES.map((g) => {
          const Icon = GAME_ICON[g.id];
          return (
            <button key={g.id} className={`arcade-tile game-${g.id}`} onClick={() => onPick(g.id)}>
              <span className="arcade-icon" aria-hidden="true">
                <Icon size={34} />
              </span>
              <b>{t(`arcade.games.${g.id}.name`)}</b>
              <small>{t(`arcade.games.${g.id}.tag`)}</small>
              <Stars n={starsFor(g.id, best[g.id] ?? 0)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stars({ n, big = false }) {
  return (
    <span className={`arcade-stars ${big ? "big" : ""}`} aria-label={`${n}/3`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} size={big ? 30 : 14} className={i < n ? "on" : ""} style={big ? { animationDelay: `${0.25 + i * 0.25}s` } : undefined} />
      ))}
    </span>
  );
}

// One game, from its title card to the result.
export function ArcadeGame({ gameId, onClose, onBack }) {
  const { t } = useT();
  const [stage, setStage] = useState("intro"); // intro | count | play | done
  const [count, setCount] = useState(3);
  const [final, setFinal] = useState(null);
  const [best, setBest] = useState(() => loadArcade()[gameId] ?? 0);
  const [round, setRound] = useState(0);
  const Icon = GAME_ICON[gameId];
  const start = useRef(null);
  useEffect(() => start.current?.focus(), [stage]);

  useEffect(() => {
    if (stage !== "count") return undefined;
    if (count === 0) {
      setStage("play");
      return undefined;
    }
    sounds.tap?.();
    const id = setTimeout(() => setCount(count - 1), 600);
    return () => clearTimeout(id);
  }, [stage, count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" && stage === "intro") begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function begin() {
    setCount(3);
    setStage("count");
    setRound((r) => r + 1);
  }
  function finish(state) {
    const r = { ...result(state), isNew: result(state).score > best && result(state).score > 0 };
    setFinal(r);
    if (r.score > best) {
      saveArcadeBest(gameId, r.score);
      setBest(r.score);
    }
    setStage("done");
    if (starsFor(gameId, r.score) >= 2) sounds.chime?.();
  }

  return (
    <div className={`view arcade arcade-game game-${gameId} stage-${stage}`}>
      <header className="arcade-head">
        {onBack ? (
          <button className="panel-close" onClick={onBack} aria-label={t("arcade.back")}>
            <ArrowLeft size={17} />
          </button>
        ) : (
          <Gamepad2 size={20} aria-hidden="true" />
        )}
        <h2>{t(`arcade.games.${gameId}.name`)}</h2>
        <button className="panel-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={17} />
        </button>
      </header>

      {stage === "intro" && (
        <div className="arcade-intro">
          <span className="arcade-icon huge" aria-hidden="true">
            <Icon size={64} />
          </span>
          <p className="arcade-goal">{t(`arcade.games.${gameId}.goal`)}</p>
          <HowTo gameId={gameId} />
          {best > 0 && (
            <p className="quiet">
              {t("arcade.best", { score: best })} <Stars n={starsFor(gameId, best)} />
            </p>
          )}
          <button ref={start} className="primary-button big" onClick={begin}>
            {t("arcade.play", { s: gameById[gameId].seconds })} <ArrowRight size={18} />
          </button>
        </div>
      )}

      {(stage === "count" || stage === "play") && (
        <div className="arcade-stage">
          {gameId === "scamSmash" ? (
            <ScamSmash key={round} running={stage === "play"} onEnd={finish} />
          ) : (
            <CanvasGame key={round} gameId={gameId} running={stage === "play"} onEnd={finish} />
          )}
          {stage === "count" && (
            <div className="arcade-count" aria-live="assertive">
              <b key={count}>{count || t("arcade.go")}</b>
            </div>
          )}
        </div>
      )}

      {stage === "done" && final && (
        <div className="arcade-done">
          <Stars n={starsFor(gameId, final.score)} big />
          <p className="arcade-score">
            <CountUp value={final.score} prefix={gameId === "scamSmash" ? "" : "₹"} />
            {final.isNew && <span className="arcade-new">{t("arcade.newBest")}</span>}
          </p>
          <ul className="arcade-chips">
            {Object.entries(final)
              .filter(([k]) => k !== "score" && k !== "isNew")
              .map(([k, v]) => (
                <li key={k} className={`chip-${k}`}>
                  {t(`arcade.stat.${k}`, { n: v })}
                </li>
              ))}
          </ul>
          <p className="arcade-lesson">
            <Lightbulb size={20} aria-hidden="true" />
            <span>{t(`arcade.games.${gameId}.lesson`)}</span>
          </p>
          <div className="action-row">
            <button className="secondary-button" onClick={begin}>
              <RotateCcw size={16} /> {t("arcade.again")}
            </button>
            <button ref={start} className="primary-button big" onClick={onBack ?? onClose}>
              {t("arcade.done")} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HowTo({ gameId }) {
  const { t } = useT();
  const keys = { jarDash: ["←", "→"], scamSmash: ["1", "…", "6"], snowball: ["↑", "↓"] }[gameId];
  return (
    <p className="arcade-howto">
      <span className="keys" aria-hidden="true">
        {keys.map((k, i) => (
          <kbd key={i}>{k}</kbd>
        ))}
      </span>
      {t(`arcade.games.${gameId}.how`)}
    </p>
  );
}

function CountUp({ value, prefix = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      setN(Math.round(value * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <b>
      {prefix}
      {n.toLocaleString("en-IN")}
    </b>
  );
}

// ---------- keyboard + pointer input shared by the canvas games ----------
function useInput(target) {
  const input = useRef({ left: false, right: false, up: false, down: false, pointerX: null, pointerY: null, taps: [] });
  useEffect(() => {
    const map = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down" };
    const down = (e) => {
      const k = map[e.key];
      if (k) {
        input.current[k] = true;
        input.current.pointerX = null;
        input.current.pointerY = null;
        e.preventDefault();
      }
      if (/^[1-6]$/.test(e.key)) input.current.taps.push(Number(e.key) - 1);
    };
    const up = (e) => {
      const k = map[e.key];
      if (k) input.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const el = target.current;
    const move = (e) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      input.current.pointerX = ((e.clientX - r.left) / r.width) * FIELD.w;
      input.current.pointerY = ((e.clientY - r.top) / r.height) * FIELD.h;
    };
    el?.addEventListener("pointermove", move);
    el?.addEventListener("pointerdown", move);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      el?.removeEventListener("pointermove", move);
      el?.removeEventListener("pointerdown", move);
    };
  }, [target]);
  return input;
}

function useLoop(running, stepFn) {
  const fn = useRef(stepFn);
  fn.current = stepFn;
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      fn.current(running ? dt : 0, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

// ---------- Jar Dash and Snowball: drawn on a canvas ----------
function CanvasGame({ gameId, running, onEnd }) {
  const { t } = useT();
  const canvas = useRef(null);
  const game = useRef(createGame(gameId));
  const ended = useRef(false);
  const input = useInput(canvas);
  const [hud, setHud] = useState({ left: gameById[gameId].seconds, score: 0 });
  useLoop(running, (dt, now) => {
    const s = game.current;
    if (dt > 0 && !ended.current && stepGame(s, dt, input.current)) {
      ended.current = true;
      setTimeout(() => onEnd(s), 350);
    }
    const ctx = canvas.current?.getContext("2d");
    if (ctx) (gameId === "jarDash" ? drawJarDash : drawSnowball)(ctx, s, now);
    const left = Math.max(0, Math.ceil(gameById[gameId].seconds - s.time));
    const score = gameId === "jarDash" ? s.score : s.value;
    if (left !== hud.left || score !== hud.score) setHud({ left, score });
  });
  return (
    <div className="arcade-field">
      <div className="arcade-bar">
        <span className="arcade-timer">
          <i style={{ width: `${(hud.left / gameById[gameId].seconds) * 100}%` }} />
          <b>{hud.left}</b>
        </span>
        <strong className="arcade-live">₹{hud.score.toLocaleString("en-IN")}</strong>
      </div>
      <canvas ref={canvas} width={FIELD.w * 2} height={FIELD.h * 2} aria-label={t(`arcade.games.${gameId}.goal`)} />
    </div>
  );
}

function coin(ctx, x, y, r, label) {
  ctx.fillStyle = "#b07a12";
  ctx.beginPath();
  ctx.arc(x, y + 1.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff3b0";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = "#7a4f00";
    ctx.font = `700 ${Math.round(r * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 1);
  }
}

function pop(ctx, p, color) {
  ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9);
  ctx.fillStyle = color;
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.text ?? (p.value > 0 ? `+₹${p.value}` : `−₹${-p.value}`), p.x, p.y - p.t * 30);
  ctx.globalAlpha = 1;
}

function drawJarDash(ctx, s, now) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.h);
  sky.addColorStop(0, "#ffe9b8");
  sky.addColorStop(1, "#fff7e4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  // Shop shelves in the back.
  ctx.fillStyle = "rgba(160, 110, 60, 0.18)";
  for (let i = 0; i < 4; i++) ctx.fillRect(0, 40 + i * 44, FIELD.w, 6);
  ctx.fillStyle = "#c9a46a";
  ctx.fillRect(0, FIELD.h - 8, FIELD.w, 8);

  for (const it of s.items) {
    if (it.kind === "coin") coin(ctx, it.x, it.y, it.value >= 5 ? 11 : 9, `${it.value}`);
    else spendItem(ctx, it, now);
  }
  // The jar: glass, with coins filling it up.
  const jw = 54;
  const jh = 40;
  const shake = s.jar.shake ? Math.sin(now / 25) * 4 : 0;
  const x = s.jar.x - jw / 2 + shake;
  const y = FIELD.h - jh - 8;
  const fill = Math.min(1, s.score / 200);
  ctx.fillStyle = "rgba(190, 230, 240, 0.55)";
  ctx.strokeStyle = "#5b8ea0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, jw, jh, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2c230";
  ctx.beginPath();
  ctx.roundRect(x + 4, y + jh - 4 - (jh - 10) * fill, jw - 8, (jh - 10) * fill + 1, 4);
  ctx.fill();
  ctx.fillStyle = "#8a5a2c";
  ctx.fillRect(x + 6, y - 6, jw - 12, 7);
  for (const p of s.pops) pop(ctx, { ...p, text: p.value > 0 ? `+₹${p.value}` : `−₹${-p.value}` }, p.value > 0 ? "#2f7d3a" : "#c0392b");
}

function spendItem(ctx, it, now) {
  const x = it.x;
  const y = it.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(now / 200 + x) * 0.25);
  if (it.kind === "sweet") {
    ctx.fillStyle = "#ff7eb6";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.moveTo(11, 0);
    ctx.lineTo(18, -6);
    ctx.lineTo(18, 6);
    ctx.fill();
  } else if (it.kind === "toy") {
    ctx.fillStyle = "#e0453a";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, -0.6, 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#7d62b0";
    ctx.beginPath();
    ctx.roundRect(-14, -8, 28, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-9, -1, 7, 2);
    ctx.fillRect(-6.5, -3.5, 2, 7);
    ctx.beginPath();
    ctx.arc(7, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#c0392b";
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("−₹10", x, y - 13);
}

function drawSnowball(ctx, s, now) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.h);
  sky.addColorStop(0, "#cfe9ff");
  sky.addColorStop(1, "#f4fbff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  // Lanes scrolling by.
  const off = (s.time * (150 + s.time * 3)) % 40;
  for (let i = 0; i < 3; i++) {
    const y = laneY(i);
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.7)" : "rgba(220,238,250,0.8)";
    ctx.fillRect(0, y - 28, FIELD.w, 56);
    ctx.fillStyle = "rgba(120,160,190,0.25)";
    for (let x = -off; x < FIELD.w; x += 40) ctx.fillRect(x, y + 26, 18, 2);
  }
  for (const it of s.things) {
    const y = laneY(it.lane);
    if (it.kind === "coin") coin(ctx, it.x, y, it.value >= 50 ? 12 : 10, `${it.value}`);
    else {
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.moveTo(it.x - 22, y - 12);
      ctx.lineTo(it.x + 16, y - 12);
      ctx.lineTo(it.x + 26, y);
      ctx.lineTo(it.x + 16, y + 12);
      ctx.lineTo(it.x - 22, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SALE!", it.x, y + 1);
    }
  }
  // The savings ball: bigger as it holds more, rolling.
  const r = ballRadius(s.value);
  const x = 80;
  const y = s.y;
  ctx.fillStyle = "rgba(60, 90, 120, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.9, r, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  g.addColorStop(0, s.hit ? "#ffd0c8" : "#fff8d8");
  g.addColorStop(1, s.hit ? "#e0705f" : "#f2c230");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(150, 100, 0, 0.35)";
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    const a = s.roll + (k * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, a, a + 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = "#6b4500";
  ctx.font = `800 ${Math.max(10, Math.round(r * 0.55))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`₹${s.value}`, x, y + 1);
  for (const p of s.pops) pop(ctx, p, p.kind === "sale" ? "#c0392b" : p.kind === "interest" ? "#2a7fbf" : "#2f7d3a");
  void now;
}

// ---------- Scam Smash: six phones, built from buttons ----------
function ScamSmash({ running, onEnd }) {
  const { t } = useT();
  const game = useRef(createGame("scamSmash"));
  const ended = useRef(false);
  const taps = useRef([]);
  const [, setFrame] = useState(0);
  useEffect(() => {
    const onKey = (e) => {
      if (/^[1-6]$/.test(e.key)) taps.current.push(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useLoop(running, (dt) => {
    const s = game.current;
    if (dt > 0 && !ended.current) {
      const input = { taps: taps.current };
      taps.current = [];
      if (stepGame(s, dt, input)) {
        ended.current = true;
        setTimeout(() => onEnd(s), 400);
      }
    }
    setFrame((f) => (f + 1) % 1000000);
  });
  const s = game.current;
  const left = Math.max(0, Math.ceil(gameById.scamSmash.seconds - s.time));
  return (
    <div className="arcade-field smash">
      <div className="arcade-bar">
        <span className="arcade-timer">
          <i style={{ width: `${(left / gameById.scamSmash.seconds) * 100}%` }} />
          <b>{left}</b>
        </span>
        <span className="arcade-hearts" aria-label={t("arcade.hearts", { n: s.hearts })}>
          {[0, 1, 2].map((i) => (
            <Heart key={i} size={18} className={i < s.hearts ? "on" : ""} />
          ))}
        </span>
        <strong className="arcade-live">{s.score}</strong>
      </div>
      <div className="smash-grid">
        {s.slots.map((m, i) => {
          const flash = s.flashes.find((f) => f.slot === i);
          return (
            <button
              key={i}
              className={`smash-phone ${m ? "on" : ""} ${flash ? `flash-${flash.kind}` : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                if (m) taps.current.push(i);
              }}
              aria-label={m ? `${i + 1}: ${t(`arcade.msg.${m.msg}`)}` : `${i + 1}`}
            >
              <kbd>{i + 1}</kbd>
              {m && (
                <span className="smash-msg" key={m.id}>
                  <span className="smash-text">{t(`arcade.msg.${m.msg}`)}</span>
                  <i className="smash-life" style={{ width: `${(m.left / m.life) * 100}%` }} />
                </span>
              )}
              {flash && <span className="smash-flash">{flash.kind === "good" ? "🛡️" : flash.kind === "bad" ? "💸" : "🙈"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
