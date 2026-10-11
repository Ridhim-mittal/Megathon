import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { DECOYS, ESSENTIAL, FIELD, FLOOD, createFlood, floodResult, stepFlood } from "./floodRescue.js";
import { DOOR_X, ITEM_PX, PX, buffalo, haystack, itemSprite, paintHouse, plantSprite } from "./floodArt.js";

// Flood Rescue: buy crop insurance (or don't), then grab what matters before the water does.
// mode "story": the scene's pre-game (before the insurance choice); the end calls onWin.
// mode "practice" (the Arcade): play again or close.
const K = 2;
const W = FIELD.w;
const H = FIELD.h;
const PLANTS = Array.from({ length: 13 }, (_, i) => DOOR_X + 30 + i * 21);
const SPEED = (() => {
  try {
    return Math.max(1, Math.min(16, Number(new URLSearchParams(window.location.search).get("speed")) || 1));
  } catch {
    return 1;
  }
})();

const scenes = {};
function scene(storm) {
  const key = storm ? "storm" : "calm";
  if (!scenes[key]) {
    const c = document.createElement("canvas");
    c.width = W / PX;
    c.height = H / PX;
    paintHouse(c, storm);
    scenes[key] = c;
  }
  return scenes[key];
}

// An item as a little image, for the bag and the report.
function ItemIcon({ kind, size = 34 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const spr = itemSprite(kind);
    const s = Math.floor(Math.min(c.width / spr.width, c.height / spr.height));
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(spr, Math.round((c.width - spr.width * s) / 2), Math.round((c.height - spr.height * s) / 2), spr.width * s, spr.height * s);
  }, [kind]);
  return <canvas ref={ref} width={size * 2} height={size * 2} style={{ width: size, height: size, imageRendering: "pixelated" }} aria-hidden="true" />;
}

export function FloodRescue(props) {
  const [run, setRun] = useState(0);
  return <FloodRun key={run} {...props} onAgain={() => setRun((n) => n + 1)} />;
}

function FloodRun({ mode = "practice", onWin, onClose, onAgain }) {
  const { t, money } = useT();
  const story = mode === "story";
  const canvas = useRef(null);
  const game = useRef(null);
  const taps = useRef([]);
  const fx = useRef([]);
  const flash = useRef(0);
  const [screen, setScreen] = useState("prep"); // prep | flood | done
  const [bag, setBag] = useState([]);
  const [hud, setHud] = useState({ left: FLOOD.seconds, water: 0 });
  const [result, setResult] = useState(null);
  const names = useRef({});
  names.current = Object.fromEntries([...ESSENTIAL, ...DECOYS].map((k) => [k, t(`flood.item.${k}`)]));
  const screenRef = useRef(screen);
  screenRef.current = screen;
  if (import.meta.env?.DEV) window.__flood = game;

  function choose(insured) {
    game.current = createFlood({ insured });
    sounds.tap?.();
    setScreen("flood");
  }

  useEffect(() => {
    const ctx = canvas.current.getContext("2d");
    let raf;
    let last = performance.now();
    let hudAt = 0;
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = game.current;
      if (s && screenRef.current === "flood") {
        let over = stepFlood(s, dt, { taps: taps.current });
        taps.current = [];
        for (let n = 1; n < SPEED && !over; n++) over = stepFlood(s, dt, {});
        for (const e of s.fx) {
          if (e.kind === "grab") {
            fx.current.push({ ...e, at: now, life: 550 });
            setBag([...s.bag]);
            sounds.coin?.();
          } else if (e.kind === "float") fx.current.push({ ...e, at: now, life: 500 });
          else if (e.kind === "lost") sounds.thud?.();
        }
        s.fx.length = 0;
        if (now - hudAt > 120) {
          hudAt = now;
          setHud({ left: Math.max(0, Math.ceil(FLOOD.seconds - s.time)), water: (FIELD.h - s.level) / (FIELD.h - FLOOD.top) });
        }
        if (over) {
          setResult(floodResult(s));
          setTimeout(() => setScreen("done"), 700);
        }
      }
      draw(ctx, s, now, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function draw(ctx, s, now, dt) {
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const storm = Boolean(s);
    ctx.drawImage(scene(storm), 0, 0, W, H);
    const level = s?.level ?? H;
    // The canal bursts first: the field floods before the house.
    const outside = s ? Math.max(FLOOD.top, Math.min(H, level - 90 * Math.min(1, s.time / 3))) : H;
    // Rice plants: they drown as soon as the field water covers them.
    for (const x of PLANTS) {
      const drowned = outside < 440;
      const sway = storm ? Math.round(Math.sin(now / 160 + x) * 1) * PX : Math.round(Math.sin(now / 700 + x) * 0.6) * PX;
      const spr = plantSprite(drowned);
      ctx.drawImage(spr, x + sway, 470 - spr.height * PX, spr.width * PX, spr.height * PX);
    }
    // Bujji on her haystack; when the water reaches it, the haystack floats.
    const hayY = Math.min(470, outside + 18) + (outside < 452 ? Math.sin(now / 300) * 4 : 0);
    const hay = haystack();
    ctx.drawImage(hay, 840, hayY - hay.height * PX, hay.width * PX, hay.height * PX);
    const bu = buffalo();
    ctx.drawImage(bu, 846, hayY - hay.height * PX - bu.height * PX + 12, bu.width * PX, bu.height * PX);

    // The things in the house.
    if (s)
      for (const it of s.items) {
        if (it.taken || it.lost || it.floating) continue;
        drawItem(ctx, it.kind, it.x, it.y + (it.floating ? Math.sin(now / 200 + it.bob) * 3 : 0), it.floating ? Math.sin(now / 300 + it.bob) * 0.25 : 0);
      }
    else {
      // Before the flood: the house as it is, things in their places.
      const preview = createFlood({ insured: true, rng: () => 0.5 });
      for (const it of preview.items) drawItem(ctx, it.kind, it.x, it.y, 0);
    }

    if (s) {
      drawWater(ctx, 0, DOOR_X, level, now, "rgba(70,110,150,0.82)");
      drawWater(ctx, DOOR_X, W, outside, now, "rgba(90,105,110,0.85)");
      // Things the water has picked up bob on top, carried off towards the back door.
      for (const it of s.items) if (it.floating && !it.taken && !it.lost) drawItem(ctx, it.kind, it.x, it.y + Math.sin(now / 200 + it.bob) * 3, Math.sin(now / 300 + it.bob) * 0.25);
      // The rush through the doorway.
      if (outside < level) {
        ctx.fillStyle = "rgba(200,225,240,0.75)";
        for (let y = outside; y < level; y += 6) {
          const off = ((now / 30 + y) % 12) - 6;
          ctx.fillRect(DOOR_X - 10 + off, y, 10, 3);
        }
      }
      // Rain and lightning.
      ctx.fillStyle = "rgba(190,215,255,0.55)";
      for (let i = 0; i < 90; i++) {
        const x = (i * 97 + now * 0.35) % (W + 60) - 30;
        const y = (i * 53 + now * 0.9) % H;
        ctx.fillRect(Math.round(x - y * 0.15), Math.round(y), 2, 10);
      }
      flash.current = Math.max(0, flash.current - dt * 2.5);
      if (Math.random() < dt / 4) {
        flash.current = 0.7;
        sounds.thud?.();
      }
      if (flash.current > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash.current * 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Grabs fly up to the bag (top right); floats splash.
    fx.current = fx.current.filter((p) => now - p.at < p.life);
    for (const p of fx.current) {
      const k = (now - p.at) / p.life;
      if (p.kind === "grab") {
        drawItem(ctx, p.item, p.x + (W - 120 - p.x) * k * k, p.y + (30 - p.y) * k * k - Math.sin(k * Math.PI) * 60, k * 2, false);
      } else if (p.kind === "float") {
        ctx.fillStyle = `rgba(230,244,255,${1 - k})`;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          ctx.fillRect(Math.round(p.x + Math.cos(a) * k * 30), Math.round(p.y - Math.sin(a) * k * 24), PX, PX);
        }
      }
    }
  }

  function drawItem(ctx, kind, x, y, rot, label = true) {
    const spr = itemSprite(kind);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rot) ctx.rotate(rot);
    ctx.drawImage(spr, Math.round((-spr.width * ITEM_PX) / 2), Math.round((-spr.height * ITEM_PX) / 2), spr.width * ITEM_PX, spr.height * ITEM_PX);
    ctx.restore();
    if (!label) return;
    // A small name tag under every item (all of them, so it isn't a hint).
    const name = names.current[kind];
    ctx.font = '700 12px "Pixelify Sans", system-ui, sans-serif';
    const w = ctx.measureText(name).width + 10;
    const ty = Math.round(y + (spr.height * ITEM_PX) / 2 + 4);
    ctx.fillStyle = "rgba(20,14,30,0.78)";
    ctx.fillRect(Math.round(x - w / 2), ty, Math.round(w), 16);
    ctx.fillStyle = "#fff6e0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, Math.round(x), ty + 8.5);
  }

  function drawWater(ctx, x0, x1, level, now, color) {
    if (level >= H) return;
    ctx.fillStyle = color;
    ctx.fillRect(x0, level, x1 - x0, H - level);
    // Waves rolling left, with foam on the crests and streaks of current below.
    for (let x = x0; x < x1; x += PX * 2) {
      const wave = Math.round(Math.sin((x + now * 0.25) / 22) * 2) * PX;
      ctx.fillStyle = "rgba(230,244,255,0.9)";
      ctx.fillRect(x, level + wave - PX, PX * 2, PX);
      ctx.fillStyle = color;
      ctx.fillRect(x, level + wave, PX * 2, Math.max(0, -wave));
    }
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 18; i++) {
      const x = x1 - ((i * 131 + now * 0.18) % (x1 - x0));
      const y = level + 20 + ((i * 47) % Math.max(20, H - level - 20));
      ctx.fillRect(Math.round(x), Math.round(y), 24, 2);
    }
  }

  const toField = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !story) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const r = result;
  const verdict = !r ? null : !r.insured ? "noCover" : r.claimShare < 1 ? "lostPapers" : "covered";
  return createPortal(
    <div className="sg-layer fr-layer" role="dialog" aria-modal="true" aria-label={t("flood.title")}>
      <div className="sg-cabinet">
        <div className="sg-stage fr-stage">
          <canvas ref={canvas} width={W * K} height={H * K} className="sg-canvas" onPointerDown={(e) => screen === "flood" && taps.current.push(toField(e))} />

          {screen === "flood" && (
            <>
              <div className="fr-hud">
                <span className="fr-water" aria-label={t("flood.water")}>
                  🌊 <i style={{ width: `${Math.min(1, hud.water) * 100}%` }} />
                </span>
                <b className={`fr-time ${hud.left <= 5 ? "hurry" : ""}`}>{hud.left}</b>
              </div>
              <div className="fr-bag" aria-label={t("flood.bag")}>
                <span className="fr-bag-icon" aria-hidden="true">
                  🎒
                </span>
                {Array.from({ length: FLOOD.bag }, (_, i) => (
                  <span key={i} className={`fr-slot ${bag[i] ? "full" : ""}`}>
                    {bag[i] && <ItemIcon kind={bag[i]} size={30} />}
                  </span>
                ))}
              </div>
              {hud.left > FLOOD.seconds - 4 && <p className="fr-hint">{t("flood.hint")}</p>}
            </>
          )}

          {!story && (
            <button className="fr-close" onClick={onClose} aria-label={t("common.close")}>
              <X size={18} />
            </button>
          )}

          {screen === "prep" && (
            <div className="sg-over fr-prep">
              <div className="sg-card fr-card">
                <span className="sg-ribbon">{t("flood.ribbon")}</span>
                <h2>🌧️ {t("flood.monsoon")}</h2>
                <div className="fr-crop">
                  <span aria-hidden="true">🌾</span>
                  <b>{money(FLOOD.crop)}</b>
                  <small>{t("flood.crop")}</small>
                </div>
                <div className="fr-choices">
                  <button className="fr-choice insure" onClick={() => choose(true)} autoFocus>
                    <span aria-hidden="true">🛡️</span>
                    <b>{t("flood.buy")}</b>
                    <em>{money(FLOOD.premium)}</em>
                    <small>{t("flood.covers", { n: money(FLOOD.crop) })}</small>
                  </button>
                  <button className="fr-choice skip" onClick={() => choose(false)}>
                    <span aria-hidden="true">🙅</span>
                    <b>{t("flood.skip")}</b>
                    <em>+{money(FLOOD.premium)}</em>
                    <small>{t("flood.keep")}</small>
                  </button>
                </div>
                <p className="fr-then">
                  🎒 {t("flood.then", { n: FLOOD.bag })}
                </p>
              </div>
            </div>
          )}

          {screen === "done" && r && (
            <div className="sg-over sg-end">
              <div className="sg-card fr-card">
                <span className={`sg-ribbon ${verdict === "covered" ? "" : "lost"}`}>{"⭐".repeat(r.stars) + "☆".repeat(3 - r.stars)}</span>
                <h2>{t(`flood.title_${verdict}`)}</h2>
                <ul className="fr-lines">
                  <li>
                    <span aria-hidden="true">🌾</span>
                    <span>{t("flood.cropLost")}</span>
                    <b className="down">−{money(FLOOD.crop)}</b>
                    <span aria-hidden="true">→</span>
                    {r.insured ? (
                      <b className="up">🛡️ +{money(r.claim)}</b>
                    ) : (
                      <b className="down">❌ {t("flood.noClaim")}</b>
                    )}
                  </li>
                  <li>
                    <span aria-hidden="true">🏠</span>
                    <span>{t("flood.repairs")}</span>
                    <b className="down">−{money(FLOOD.repairs)}</b>
                    <span aria-hidden="true">→</span>
                    {r.fromTin >= FLOOD.repairs ? <b className="up">💰 {t("flood.tin")}</b> : <b className="down">😬 {t("flood.loan", { n: money(r.loan) })}</b>}
                  </li>
                </ul>
                <div className="fr-saved">
                  {r.bag.map((k, i) => (
                    <span key={i} className={ESSENTIAL.includes(k) ? "good" : "bad"} title={t(`flood.item.${k}`)}>
                      <ItemIcon kind={k} size={36} />
                      <small>{t(`flood.item.${k}`)}</small>
                      <i aria-hidden="true">{ESSENTIAL.includes(k) ? "✓" : "✗"}</i>
                    </span>
                  ))}
                  {r.bag.length === 0 && <em>{t("flood.empty")}</em>}
                </div>
                <p className="sg-lesson">{t(`flood.lesson_${verdict}`, { premium: money(FLOOD.premium), crop: money(FLOOD.crop) })}</p>
                <div className="sg-actions">
                  {story ? (
                    <button className="sg-btn" autoFocus onClick={onWin}>
                      {t("flood.continue")} <ArrowRight size={18} />
                    </button>
                  ) : (
                    <>
                      <button className="sg-btn ghost" onClick={onClose}>
                        {t("common.close")}
                      </button>
                      <button className="sg-btn" autoFocus onClick={onAgain}>
                        <RotateCcw size={18} /> {t("flood.again")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export { DECOYS };
