import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Coins, Heart, Landmark, Pause, Play, RotateCcw, Shield, ShieldCheck, Sprout, TrendingUp, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { DEFENDER, DEF_X, FIELD, FUNDS, LANES, RULES, WAVES, createGarden, gardenResult, laneY, level, needsMore, stepGarden, worth } from "./sipGarden.js";
import { LANE_COLOR, PX, coinSprite, defenderSprite, feetY, noteSprite, paintYard, piggy, puff, put, shotSprite, thiefSprite } from "./gardenArt.js";

// SIP Garden: defend your portfolio vault by keeping money in every investment lane. The rules
// live in sipGarden.js; this file draws them (pixel art from gardenArt.js) and takes your taps.
// mode "story": winning calls onWin (the choice it gates); losing offers Try again or onGiveUp.
// mode "practice" (the Arcade): Play again or close.
const K = 2; // canvas pixels per field unit
const W = FIELD.w;
const H = FIELD.h;
const THIEVES = ["inflation", "debt", "raccoon", "scam"];
const LANE_ICON = { equity: TrendingUp, debt: Shield, gold: Coins, fd: Landmark };
// ?speed=4 runs the game four times faster: for testing and debugging.
const SPEED = (() => {
  try {
    return Math.max(1, Math.min(16, Number(new URLSearchParams(window.location.search).get("speed")) || 1));
  } catch {
    return 1;
  }
})();
const pct = (v, of) => `${(v / of) * 100}%`;
const FONT = '"Pixelify Sans", system-ui, "Noto Sans Devanagari Variable", "Noto Sans Telugu Variable", sans-serif';

let yardCanvas = null;
function yard() {
  if (!yardCanvas) {
    yardCanvas = document.createElement("canvas");
    yardCanvas.width = W / PX;
    yardCanvas.height = H / PX;
    paintYard(yardCanvas);
  }
  return yardCanvas;
}

// A small canvas with one defender or thief on it, for the intro.
function Portrait({ kind, thief = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let raf;
    const draw = (now) => {
      ctx.clearRect(0, 0, c.width, c.height);
      const spr = thief ? thiefSprite(kind, Math.floor(now / 160)) : defenderSprite(kind, { lv: 3 });
      const s = Math.floor(Math.min(c.width / spr.width, c.height / spr.height));
      ctx.drawImage(spr, Math.round((c.width - spr.width * s) / 2), c.height - spr.height * s, spr.width * s, spr.height * s);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind, thief]);
  return <canvas ref={ref} width={84} height={84} className="sg-portrait" aria-hidden="true" />;
}

export function SipGarden(props) {
  const [run, setRun] = useState(0);
  return <GardenRun key={run} {...props} onAgain={() => setRun((n) => n + 1)} />;
}

function GardenRun({ mode = "practice", onWin, onClose, onGiveUp, onAgain }) {
  const { t, money } = useT();
  const story = mode === "story";
  const canvas = useRef(null);
  const game = useRef(null);
  if (!game.current) game.current = createGarden();
  // In development the live state is on window, for debugging.
  if (import.meta.env?.DEV) window.__sipGarden = game.current;
  const input = useRef({ taps: [], invest: [], toggleSip: false, crashChoice: null });
  const navHistory = useRef(LANES.map(() => []));
  const fx = useRef([]);
  const [screen, setScreen] = useState("intro"); // intro | play | end
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused || screen !== "play";
  const ready = useRef(0);
  const shake = useRef(0);
  const vaultHit = useRef(0);
  const [hud, setHud] = useState(() => snapshot(game.current));
  const [result, setResult] = useState(null);
  const words = useRef({});
  words.current = {
    ready: [t("garden.ready"), t("garden.set"), t("garden.go")],
    year: (n) => t("garden.year", { n }),
    huge: t("garden.huge"),
    crash: t("garden.crash"),
    crashSub: t("garden.crashSub"),
    payday: (n) => t("garden.payday", { n: money(n) }),
    sipShort: t("garden.sipShort"),
    vault: t("garden.vaultHit"),
    reported: t("garden.reported"),
    scammed: t("garden.scammed"),
    levelUp: t("garden.levelUp"),
    broke: t("garden.broke"),
    warn: t("garden.needMore"),
    interest: t("garden.interest"),
    units: (n) => t("garden.units", { n }),
    sip: t("garden.sipStamp"),
    nav: (p) => t("garden.navYear", { p }),
    money,
  };

  useEffect(() => {
    const c = canvas.current;
    const ctx = c.getContext("2d");
    let raf;
    let last = performance.now();
    let hudAt = 0;
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = game.current;
      if (!pausedRef.current) {
        if (ready.current > 0) ready.current = Math.max(0, ready.current - dt);
        else {
          let over = stepGarden(s, dt, input.current);
          input.current = { taps: [], invest: [], toggleSip: false, crashChoice: null };
          for (let n = 1; n < SPEED && !over; n++) over = stepGarden(s, dt, input.current);
          for (const e of s.fx) react(e, now);
          if (s.phase === "play" && (navHistory.current[0].at ?? 0) + 250 < now) {
            navHistory.current.forEach((h, i) => {
              h.push(s.lanes[i].nav);
              if (h.length > 120) h.shift();
            });
            navHistory.current[0].at = now;
          }
          s.fx.length = 0;
          if (over) {
            setResult(gardenResult(s));
            setTimeout(() => setScreen("end"), 900);
          }
        }
      }
      if (now - hudAt > 120) {
        hudAt = now;
        setHud(snapshot(s));
      }
      draw(ctx, s, now, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Game events become particles, banners and sounds.
  function react(e, now) {
    const w = words.current;
    const add = (p) => fx.current.push({ at: now, ...p });
    const defY = (lane) => feetY(lane) - 70;
    if (e.kind === "coin") {
      add({ type: "fly", x: e.x, y: e.y, life: 600 });
      add({ type: "text", x: e.x, y: e.y - 20, text: `+${w.money(e.value)}${e.interest ? ` ${w.interest}` : ""}`, color: "#ffe066", life: 900 });
      sounds.coin?.();
    } else if (e.kind === "hit") add({ type: "spark", x: e.x, y: e.y, shot: e.shot, life: 220 });
    else if (e.kind === "poof") {
      add({ type: "puff", x: e.x, y: feetY(LANES.findIndex((_, i) => laneY(i) === e.y)) - 30, life: 450 });
      sounds.tap?.();
    } else if (e.kind === "feed") {
      if (e.sip) add({ type: "text", x: DEF_X + 64, y: defY(e.lane) + 26, text: `${w.sip} +${LANES[e.lane] === "fd" ? w.money(e.amount) : w.units(e.units.toFixed(1))}`, color: "#9fd0ff", life: 1000 });
      else add({ type: "text", x: DEF_X + 6, y: defY(e.lane), text: LANES[e.lane] === "fd" ? `+${w.money(e.amount)}` : `+${w.money(e.amount)} → ${w.units(e.units.toFixed(1))}`, color: "#b9f6a0", life: 1100, big: true });
      if (e.levelUp) add({ type: "text", x: DEF_X + 6, y: defY(e.lane) - 22, text: w.levelUp, color: "#ffd23f", life: 1200 });
      add({ type: "sparkle", x: DEF_X, y: feetY(e.lane) - 30, life: 600 });
      sounds.tap?.();
    } else if (e.kind === "steal") add({ type: "loot", lane: e.lane, x: e.x, life: 500 });
    else if (e.kind === "broke") add({ type: "text", x: DEF_X, y: defY(e.lane), text: w.broke, color: "#ff6b5e", life: 1500 });
    else if (e.kind === "scammed") {
      add({ type: "text", x: DEF_X + 30, y: defY(e.lane), text: `${w.scammed} −${w.money(e.value)}`, color: "#ff6b5e", life: 1500 });
      sounds.thud?.();
    } else if (e.kind === "reported") {
      add({ type: "text", x: e.x, y: e.y, text: `${w.reported} +${w.money(e.value)}`, color: "#80deea", life: 1200 });
      add({ type: "puff", x: e.x, y: e.y + 20, life: 400, color: "#ffeb3b" });
      sounds.chime?.();
    } else if (e.kind === "wave") {
      add({ type: "banner", text: e.huge ? w.huge : w.year(e.wave + 1), sub: e.huge ? w.year(e.wave + 1) : "", color: e.huge ? "#ff5a4a" : "#fff3c4", life: 2400 });
    } else if (e.kind === "crash") {
      add({ type: "banner", text: w.crash, sub: w.crashSub, color: "#ff5a4a", life: 2800 });
      add({ type: "text", x: DEF_X + 10, y: defY(0), text: `−${w.money(e.cut)}`, color: "#ff6b5e", life: 1600, big: true });
      shake.current = 0.8;
      sounds.thud?.();
    } else if (e.kind === "payday") {
      add({ type: "text", x: W / 2, y: 130, text: w.payday(e.amount), color: "#ffe066", life: 1800, big: true });
      sounds.coin?.();
    } else if (e.kind === "sip") {
      add({ type: "text", x: 135, y: 452, text: `${w.sip} ✓`, color: "#9fd0ff", life: 900, big: true });
      sounds.ripple?.();
    }
    else if (e.kind === "sipShort") add({ type: "text", x: 160, y: 455, text: w.sipShort, color: "#ffcc80", life: 1500 });
    else if (e.kind === "growth") {
      e.change.forEach((c, i) => {
        if (LANES[i] === "fd") return;
        const p = `${c >= 0 ? "+" : "−"}${Math.abs(Math.round(c * 100))}%`;
        add({ type: "text", x: 600, y: laneY(i) - 6, text: w.nav(p), color: c >= 0 ? "#b9f6a0" : "#ff8a80", life: 2000, big: true });
      });
      sounds.chime?.();
    } else if (e.kind === "vault") {
      add({ type: "text", x: 90, y: 230, text: w.vault, color: "#ff5a4a", life: 1800, big: true });
      add({ type: "flash", life: 500 });
      shake.current = 0.5;
      vaultHit.current = 0.6;
      sounds.thud?.();
    }
  }

  function draw(ctx, s, now, dt) {
    const w = words.current;
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.imageSmoothingEnabled = false;
    shake.current = Math.max(0, shake.current - dt);
    vaultHit.current = Math.max(0, vaultHit.current - dt);
    if (shake.current > 0) ctx.translate(Math.round(Math.sin(now / 22) * 5 * shake.current), Math.round(Math.cos(now / 27) * 3 * shake.current));
    ctx.drawImage(yard(), 0, 0, W, H);
    // The vault.
    const hop = vaultHit.current > 0 ? Math.round(Math.sin(now / 30) * 4) : 0;
    const breathe = Math.floor(now / 600) % 2 ? 0 : -PX;
    put(ctx, piggy(), 84 + hop, 318 + breathe, 18, 30);

    // Lanes flagged for more money.
    LANES.forEach((_, i) => {
      if (!needsMore(s, i)) return;
      const a = 0.28 + Math.sin(now / 180) * 0.12;
      ctx.fillStyle = `rgba(230,40,30,${a})`;
      ctx.fillRect(330, laneY(i) - 33, W - 330, 66);
      text(ctx, `⚠ ${w.warn} ⚠`, 660, laneY(i) - 2, 17, "#ffd9d4", "#5a0f0a");
    });

    // Each fund's NAV, drawn faintly along its lane.
    LANES.forEach((kind, i) => {
      const h = navHistory.current[i];
      if (kind === "fd" || h.length < 2) return;
      const lo = Math.min(...h);
      const hi = Math.max(...h);
      const span = Math.max(hi - lo, hi * 0.04);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      h.forEach((v, k) => {
        const x = 440 + (k / 119) * 500;
        const y = laneY(i) + 22 - ((v - lo) / span) * 44;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    });

    // FD interest coins and salary coins/notes.
    for (const c of s.coins) {
      if (c.life < 2 && Math.floor(now / 120) % 2) continue;
      const bob = c.y >= c.to ? Math.round(Math.sin(now / 260 + c.id) * 1.5) * PX : 0;
      if (c.interest) put(ctx, coinSprite(4), c.x, c.y + bob, 4.5, 4.5);
      else if (c.note) put(ctx, noteSprite(), c.x, c.y + bob, 7, 4);
      else put(ctx, coinSprite(5), c.x, c.y + bob, 5.5, 5.5);
    }

    // Defenders.
    s.lanes.forEach((L, i) => {
      const lv = level(L.money);
      const wilt = L.kind === "equity" && s.crash > 0;
      const spr = defenderSprite(L.kind, { lv, wilt, broke: !lv });
      const idle = Math.floor(now / 400 + i) % 2 ? 0 : -PX;
      const pop = L.grow > 0.5 ? -PX : 0;
      put(ctx, spr, DEF_X - Math.round(L.shot * 2) * PX, feetY(i) + idle + pop, Math.floor(spr.width / 2), spr.height);
      if (lv) text(ctx, `LV${lv}`, DEF_X - 34, feetY(i) - spr.height * PX + 4, 11, "#ffd23f", "#2a1606");
      if (wilt) {
        ctx.fillStyle = "#4fc3f7";
        ctx.fillRect(DEF_X + 24, Math.round(feetY(i) - 64 + ((now / 10) % 14)), PX, PX * 2);
      }
    });

    // Thieves, then shots, lane by lane.
    LANES.forEach((_, i) => {
      for (const th of s.thieves.filter((x) => x.lane === i).sort((a, b) => b.x - a.x)) {
        const frame = th.stealing ? Math.floor(now / 140) : Math.floor(th.step / 7);
        const spr = thiefSprite(th.kind, frame, th.stealing);
        ctx.save();
        if (!th.alive) ctx.globalAlpha = Math.max(0, th.dying / 0.5);
        else if (th.kind === "scam") ctx.globalAlpha = 0.78 + Math.sin(now / 150 + th.id) * 0.14;
        if (th.flash > 0) ctx.filter = "brightness(2.2)";
        const bob = !th.stealing && Math.floor(th.step / 7) % 2 ? -PX : 0;
        put(ctx, spr, th.x, feetY(i) + bob, Math.floor(spr.width / 2), spr.height);
        ctx.restore();
        if (th.alive && th.kind === "scam") {
          ctx.strokeStyle = `rgba(255,235,59,${0.55 + Math.sin(now / 150) * 0.3})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.ellipse(th.x, feetY(i) - 42, 30, 48, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (th.alive && th.hp < th.maxHp && th.kind !== "scam") {
          ctx.fillStyle = "#2a1606";
          ctx.fillRect(th.x - 16, feetY(i) - 84, 32, 5);
          ctx.fillStyle = "#ff5a4a";
          ctx.fillRect(th.x - 15, feetY(i) - 83, (30 * Math.max(0, th.hp)) / th.maxHp, 3);
        }
      }
      for (const sh of s.shots) {
        if (sh.lane !== i) continue;
        const y = laneY(i) - 18 + sh.dy;
        if (sh.kind === "rocket") {
          ctx.fillStyle = Math.floor(now / 60) % 2 ? "#ffb300" : "#ff6d00";
          ctx.fillRect(Math.round(sh.x - 22), Math.round(y - 3), 6, 6);
          ctx.fillStyle = "#ffe082";
          ctx.fillRect(Math.round(sh.x - 28), Math.round(y - 1), 6, 3);
        }
        const spr = shotSprite(sh.kind);
        put(ctx, spr, sh.x, y, Math.floor(spr.width / 2), Math.floor(spr.height / 2));
      }
    });

    // Particles.
    fx.current = fx.current.filter((p) => now - p.at < p.life);
    for (const p of fx.current) {
      const k = (now - p.at) / p.life;
      if (p.type === "text") {
        ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
        text(ctx, p.text, p.x, p.y - k * 26, p.big ? 20 : 14, p.color, "#2a1606");
        ctx.globalAlpha = 1;
      } else if (p.type === "fly") put(ctx, coinSprite(5), p.x + (40 - p.x) * k * k, p.y + (20 - p.y) * k * k, 5.5, 5.5);
      else if (p.type === "puff") puff(ctx, p.x, p.y, k, p.color);
      else if (p.type === "spark") {
        ctx.fillStyle = { rocket: "#ffb300", bolt: "#7fe0ff", nugget: "#ffd23f", coin: "#ffd23f" }[p.shot] ?? "#fff";
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p.at;
          ctx.fillRect(Math.round(p.x + Math.cos(a) * k * 18), Math.round(p.y + Math.sin(a) * k * 14), PX, PX);
        }
        ctx.globalAlpha = 1;
      } else if (p.type === "sparkle") {
        ctx.fillStyle = "#ffd23f";
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k * 2;
          const r = 14 + k * 26;
          const x = Math.round(p.x + Math.cos(a) * r);
          const y = Math.round(p.y + Math.sin(a) * r);
          ctx.fillRect(x, y - PX, PX, PX * 3);
          ctx.fillRect(x - PX, y, PX * 3, PX);
        }
        ctx.globalAlpha = 1;
      } else if (p.type === "loot") {
        // A coin hops from the defender into the thief's sack.
        const x = DEF_X + (p.x + 14 - DEF_X) * k;
        const y = feetY(p.lane) - 40 - Math.sin(k * Math.PI) * 30;
        put(ctx, coinSprite(4), x, y, 4.5, 4.5);
      } else if (p.type === "banner") {
        ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        text(ctx, p.text, W / 2 + 60, H / 2 - 20, 44 * (0.8 + Math.min(1, k * 8) * 0.2), p.color, "#2a1606", true);
        if (p.sub) text(ctx, p.sub, W / 2 + 60, H / 2 + 22, 18, "#fff", "#2a1606");
        ctx.globalAlpha = 1;
      } else if (p.type === "flash") {
        ctx.fillStyle = `rgba(255,40,30,${0.35 * (1 - k)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    if (ready.current > 0) {
      const i = Math.min(2, Math.floor((2.4 - ready.current) / 0.8));
      const k = ((2.4 - ready.current) % 0.8) / 0.8;
      text(ctx, w.ready[i], W / 2 + 60, H / 2, 60 * (1.3 - k * 0.3), i === 2 ? "#7ddc3c" : "#fff3c4", "#2a1606", true);
    }
  }

  // ---- input ----
  const toField = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const investIn = (lane) => {
    if (pausedRef.current) return;
    if (game.current.wallet < RULES.feed) {
      sounds.thud?.();
      return;
    }
    input.current.invest.push(lane);
  };
  const toggleSip = () => {
    if (screen !== "play") return;
    input.current.toggleSip = true;
    sounds.tap?.();
  };
  function start() {
    setScreen("play");
    ready.current = 2.4;
    sounds.chime?.();
  }
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea,select")) return;
      if (e.key === "Escape" && !story) onClose?.();
      if (screen !== "play") return;
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0) investIn(i);
      else if (e.key === "s" || e.key === "S") toggleSip();
      else if (e.key === "p" || e.key === "P" || e.key === " ") {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const years = WAVES.length;
  const stability = hud.hearts >= 3 ? "high" : hud.hearts >= 2 ? "medium" : "low";
  const answerCrash = (keep) => {
    input.current.crashChoice = keep ? "keep" : "stop";
    sounds.tap?.();
  };
  const weakest = result ? result.invested.indexOf(Math.min(...result.invested)) : 0;
  const playing = screen === "play";
  return createPortal(
    <div className="sg-layer" role="dialog" aria-modal="true" aria-label={t("garden.title")}>
      <div className="sg-cabinet">
        <div className="sg-stage">
          <canvas ref={canvas} width={W * K} height={H * K} className="sg-canvas" onPointerDown={(e) => playing && !paused && input.current.taps.push(toField(e))} />

          <div className="sg-panel sg-worth">
            <small>{t("garden.worthLabel")}</small>
            <b>{money(hud.worth)}</b>
          </div>
          <div className="sg-panel sg-wave">
            <small>{t("garden.wave")}</small>
            <span className="sg-wavebar">
              <i style={{ width: `${(Math.min(years, hud.wave + hud.waveK) / years) * 100}%` }} />
            </span>
            <em>{t("garden.yearOf", { n: Math.min(years, hud.wave + 1), total: years })}</em>
          </div>
          <div className={`sg-panel sg-stab ${stability}`}>
            <small>
              {t("garden.stability")} <b>{t(`garden.stab.${stability}`)}</b>
            </small>
            <span className="sg-hearts" aria-label={t("garden.hearts", { n: hud.hearts })}>
              {Array.from({ length: RULES.hearts }, (_, i) => (
                <Heart key={i} className={i < hud.hearts ? "full" : ""} />
              ))}
            </span>
          </div>

          <span className="sg-tag sg-lanes-title">{t("garden.lanesTitle")}</span>
          {LANES.map((kind, i) => {
            const Icon = LANE_ICON[kind];
            return (
              <button
                key={kind}
                className={`sg-lane lane-${kind} ${hud.need[i] ? "need" : ""}`}
                style={{ top: pct(laneY(i) - 31, H) }}
                disabled={!playing || hud.wallet < RULES.feed}
                onClick={() => investIn(i)}
                aria-label={t("garden.investIn", { lane: t(`garden.lane.${kind}`), n: money(RULES.feed) })}
              >
                <b>
                  {t(`garden.short.${kind}`)} <Icon aria-hidden="true" />
                </b>
                <small>{money(hud.lanes[i])}</small>
                {kind === "fd" ? (
                  <em className="sg-nav">{t("garden.fdRate", { p: Math.round(RULES.interestRate * 100) })}</em>
                ) : (
                  <em className={`sg-nav ${hud.navUp[i] ? "up" : "down"}`}>
                    {t("garden.nav", { n: hud.navs[i].toFixed(2) })} {hud.navUp[i] ? "▲" : "▼"}
                  </em>
                )}
                <kbd>{i + 1}</kbd>
              </button>
            );
          })}
          <span className="sg-tag sg-vault-label">{t("garden.vault")}</span>
          <span className="sg-cash" title={t("garden.cashHint")}>
            <i aria-hidden="true">₹</i> {t("garden.cash", { n: money(hud.wallet) })}
          </span>
          <button className={`sg-autosip ${hud.sip ? "on" : ""}`} onClick={toggleSip} disabled={!playing} aria-pressed={hud.sip}>
            <b>{hud.sip ? t("garden.sipOn") : t("garden.sipOff")}</b>
            <small>{t("garden.sipSplit", { n: money(RULES.sipEach) })}</small>
          </button>
          <div className="sg-tools">
            <button onClick={() => setPaused((v) => !v)} disabled={!playing} aria-label={paused ? t("garden.resume") : t("garden.pause")}>
              {paused ? <Play /> : <Pause />}
            </button>
            {!story && (
              <button onClick={onClose} aria-label={t("common.close")}>
                <X />
              </button>
            )}
          </div>

          {hud.asking && playing && (
            <div className="sg-ask" role="alert">
              <b>{t("garden.crashAskTitle")}</b>
              <p>{hud.sip ? t("garden.crashAskOn") : t("garden.crashAskOff")}</p>
              <div>
                <button className="sg-btn" onClick={() => answerCrash(true)}>
                  {hud.sip ? t("garden.crashKeep") : t("garden.crashStart")}
                </button>
                <button className="sg-btn ghost" onClick={() => answerCrash(false)}>
                  {hud.sip ? t("garden.crashStop") : t("garden.crashSkip")}
                </button>
              </div>
            </div>
          )}

          {paused && playing && (
            <div className="sg-over sg-paused">
              <b>{t("garden.paused")}</b>
              <button className="sg-btn" onClick={() => setPaused(false)}>
                <Play size={18} /> {t("garden.resume")}
              </button>
            </div>
          )}

          {screen === "intro" && (
            <div className="sg-over">
              <div className="sg-card">
                <span className="sg-ribbon">{t("garden.ribbon")}</span>
                <h2>{t("garden.title")}</h2>
                <p className="sg-lead">{t("garden.lead")}</p>
                <ul className="sg-cast">
                  {LANES.map((k) => (
                    <li key={k} className={`lane-${k}`}>
                      <Portrait kind={k} />
                      <b>{t(`garden.lane.${k}`)}</b>
                      <small>{t(`garden.def.${k}`)}</small>
                    </li>
                  ))}
                </ul>
                <h3>{t("garden.meet")}</h3>
                <ul className="sg-cast thieves">
                  {THIEVES.map((k) => (
                    <li key={k}>
                      <Portrait kind={k} thief />
                      <b>{t(`garden.thief.${k}.name`)}</b>
                      <small>{t(`garden.thief.${k}.tip`)}</small>
                    </li>
                  ))}
                </ul>
                <ol className="sg-steps">
                  <li>
                    <Coins size={18} aria-hidden="true" /> {t("garden.step1", { n: money(RULES.coin) })}
                  </li>
                  <li>
                    <Sprout size={18} aria-hidden="true" /> {t("garden.step2", { n: money(RULES.feed) })}
                  </li>
                  <li>
                    <ShieldCheck size={18} aria-hidden="true" /> {t("garden.step3")}
                  </li>
                </ol>
                <div className="sg-actions">
                  {story && onGiveUp && (
                    <button className="sg-btn ghost" onClick={onGiveUp}>
                      {t("garden.notNow")}
                    </button>
                  )}
                  {!story && (
                    <button className="sg-btn ghost" onClick={onClose}>
                      {t("common.close")}
                    </button>
                  )}
                  <button className="sg-btn" autoFocus onClick={start}>
                    {t("garden.start")} <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === "end" && result && (
            <div className="sg-over sg-end">
              <div className="sg-card">
                <span className={`sg-ribbon ${result.won ? "" : "lost"}`}>{result.won ? t("garden.wonRibbon") : t("garden.lostRibbon")}</span>
                <h2>{result.won ? t("garden.wonTitle", { n: years }) : t("garden.lostTitle")}</h2>
                <div className="sg-stats">
                  <span>
                    <small>{t("garden.statWorth")}</small>
                    <b>{money(result.worth)}</b>
                  </span>
                  <span>
                    <small>{t("garden.statGrowth")}</small>
                    <b className="up">+{money(result.growth)}</b>
                  </span>
                  <span>
                    <small>{t("garden.statStolen")}</small>
                    <b className="down">−{money(result.stolen)}</b>
                  </span>
                  <span>
                    <small>{t("garden.statSpread")}</small>
                    <b>{Math.round(result.spread * 100)}%</b>
                  </span>
                </div>
                <ul className="sg-bars" aria-label={t("garden.youPut")}>
                  {LANES.map((kind, i) => (
                    <li key={kind} className={!result.won && i === weakest ? "weak" : ""}>
                      <small>{t(`garden.lane.${kind}`)}</small>
                      <span>
                        <i style={{ width: `${(result.invested[i] / Math.max(...result.invested)) * 100}%`, background: LANE_COLOR[kind] }} />
                      </span>
                      <b>{money(result.invested[i])}</b>
                    </li>
                  ))}
                </ul>
                <p className="sg-lesson">{result.won ? t("garden.wonLesson") : t("garden.lostLesson", { lane: t(`garden.lane.${LANES[weakest]}`), n: money(result.invested[weakest]) })}</p>
                <div className="sg-sipbox">
                  <b>{t("garden.sipBox")}</b>
                  <ul>
                    {result.funds.map((f) => (
                      <li key={f.kind}>
                        <span>{t(`garden.lane.${f.kind}`)}</span>
                        <span>{t("garden.unitsHeld", { n: f.units.toFixed(1) })}</span>
                        <span>{f.sipUnits ? t("garden.sipAvg", { n: `₹${f.sipAvg.toFixed(2)}` }) : t("garden.noSip")}</span>
                        <span className={f.nav >= (f.sipAvg || f.startNav) ? "up" : "down"}>{t("garden.navNow", { n: `₹${f.nav.toFixed(2)}` })}</span>
                      </li>
                    ))}
                  </ul>
                  {result.crashChoice && <p>{t(`garden.crash_${result.crashChoice}`)}</p>}
                  {result.sips > 0 && <p className="sg-sipnote">{t("garden.sipNote", { n: result.sips })}</p>}
                </div>
                <div className="sg-actions">
                  {story && result.won && (
                    <button className="sg-btn" autoFocus onClick={onWin}>
                      {t("garden.continue")} <ArrowRight size={18} />
                    </button>
                  )}
                  {story && !result.won && (
                    <>
                      <button className="sg-btn ghost" onClick={onGiveUp}>
                        {t("garden.other")}
                      </button>
                      <button className="sg-btn" autoFocus onClick={onAgain}>
                        <RotateCcw size={18} /> {t("garden.tryAgain")}
                      </button>
                    </>
                  )}
                  {!story && (
                    <>
                      <button className="sg-btn ghost" onClick={onClose}>
                        {t("common.close")}
                      </button>
                      <button className="sg-btn" autoFocus onClick={onAgain}>
                        <RotateCcw size={18} /> {t("garden.again")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="sg-foot">{t("garden.how")}</p>
      </div>
    </div>,
    document.body,
  );
}

function snapshot(s) {
  const w = WAVES[Math.min(s.wave, WAVES.length - 1)];
  return {
    wallet: Math.floor(s.wallet),
    hearts: s.hearts,
    sip: s.sip,
    wave: s.wave,
    waveK: s.phase === "play" ? Math.min(1, s.waveTime / w.seconds) : 0,
    worth: worth(s),
    lanes: s.lanes.map((L) => Math.round(L.money)),
    need: LANES.map((_, i) => needsMore(s, i)),
    navs: s.lanes.map((L) => L.nav),
    navUp: s.lanes.map((L) => L.nav >= L.navStart),
    asking: Boolean(s.asking),
  };
}

function text(ctx, str, x, y, size, color, outline, heavy = false) {
  ctx.save();
  ctx.font = `700 ${Math.round(size)}px ${FONT}`;
  const fit = Math.min(1, (W - 40) / Math.max(1, ctx.measureText(str).width));
  ctx.translate(x, y);
  ctx.scale(fit, fit);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / (heavy ? 4 : 5));
  ctx.strokeStyle = outline;
  if (heavy) ctx.strokeText(str, 0, 3);
  ctx.strokeText(str, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
