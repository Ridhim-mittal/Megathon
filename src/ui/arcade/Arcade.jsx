import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, CarFront, Flower2, Gamepad2, Lightbulb, Rat, RotateCcw, FileSearch, ShoppingBag, Snowflake, Star, Weight, Wind, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { loadArcade, saveArcadeBest } from "../persist.js";
import { sounds } from "../sound.js";
import { FIELD, GAMES, ballRadius, createGame, gameById, laneY, result, stepGame } from "./games.js";
import { maybeAd } from "./ads.js";
import { AdInterstitial, ScamSite } from "./ScamAds.jsx";
import { InsuranceRush } from "./InsuranceRush.jsx";
import { PatangIntro, PatangMarket, PatangReport } from "./PatangMarket.jsx";
import { PriceSnake, SnakeIntro, SnakeResult } from "./PriceSnake.jsx";
import { SwipeBazaar, SwipeBazaarIntro } from "./SwipeBazaar.jsx";
import { SWIPE_CONFIG } from "./swipeBazaarConfig.js";
import { RatGuard } from "../games/RatGuard.jsx";
import { InterestRace } from "../games/InterestRace.jsx";
import { FinePrintHunter } from "../games/FinePrintHunter.jsx";
import { SipGarden } from "../games/SipGarden.jsx";

// The arcade: three one-minute games with a tiny lesson each. Practice only, no money moves.
export const GAME_ICON = { snowball: Snowflake, insuranceRush: CarFront, patangMarket: Wind, priceSnake: Weight, swipeBazaar: ShoppingBag };
const STARS = { snowball: [400, 650, 850], insuranceRush: [600, 1500, 3000], patangMarket: [8000, 18000, 25000], priceSnake: [5, 12, 20], swipeBazaar: SWIPE_CONFIG.stars };
export const starsFor = (id, score) => STARS[id].filter((x) => score >= x).length;

// The story's mini-games, playable here as practice (mode "practice": no money moves).
const STORY_GAMES = [
  { id: "ratGuard", title: "ratguard.title", icon: Rat, Game: RatGuard },
  { id: "interest", title: "interest.title", icon: Calculator, Game: InterestRace },
  { id: "fineprint", title: "fineprint.title", icon: FileSearch, Game: FinePrintHunter },
  { id: "garden", title: "garden.title", icon: Flower2, Game: SipGarden },
];

// Every mini-game in one place (the title's Arcade and the phone's Arcade app): the quick arcade
// games, then the story's mini-games. A story game shows one ad as it starts, like the arcade games.
export function ArcadeMenu({ onPick, onClose, avatar = "boy" }) {
  const { t } = useT();
  const best = loadArcade();
  const [story, setStory] = useState(null); // { id, ad } while the ad shows, then { id }
  const [scam, setScam] = useState(null);
  const playing = story && !story.ad ? STORY_GAMES.find((g) => g.id === story.id) : null;
  return (
    <div className="view arcade arcade-menu">
      <header className="arcade-head">
        <Gamepad2 size={22} aria-hidden="true" />
        <h2>{t("arcade.title")}</h2>
        <button className="panel-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={17} />
        </button>
      </header>
      <div className="arcade-tiles all-games">
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
        {STORY_GAMES.map((g) => (
          <button key={g.id} className={`arcade-tile story-${g.id}`} onClick={() => setStory({ id: g.id, ad: maybeAd() })}>
            <span className="arcade-icon" aria-hidden="true">
              <g.icon size={34} />
            </span>
            <b>{t(g.title)}</b>
            <small>{t(`arcade.storyTags.${g.id}`)}</small>
          </button>
        ))}
      </div>
      {story?.ad && <AdInterstitial ad={story.ad} onOpen={(a) => setScam(a.id)} onSkip={() => setStory({ id: story.id })} />}
      {scam && (
        <ScamSite
          adId={scam}
          onClose={() => {
            setScam(null);
            if (story?.ad) setStory({ id: story.id });
          }}
        />
      )}
      {playing && <playing.Game mode="practice" avatar={avatar} onClose={() => setStory(null)} onGiveUp={() => setStory(null)} />}
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

// One game, from its title card to the result. With `story` ({ onWin, onGiveUp }) it unlocks a
// story choice: one star wins it; otherwise "try again" or "pick another choice". No ads in the story.
export function ArcadeGame({ gameId, onClose, onBack, story = null }) {
  const { t } = useT();
  const [stage, setStage] = useState("intro"); // intro | count | play | done
  const [count, setCount] = useState(3);
  const [final, setFinal] = useState(null);
  const [best, setBest] = useState(() => loadArcade()[gameId] ?? 0);
  const [round, setRound] = useState(0);
  // Now and then an ad as the game starts (see maybeAd); none after it ends or on "play again".
  const [interstitial, setInterstitial] = useState(() => (story ? null : maybeAd()));
  const [scam, setScam] = useState(null);
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
      if (scam || interstitial) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" && stage === "intro") begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function begin() {
    setInterstitial(null);
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

      {stage === "intro" && gameId === "snowball" && <SnowballIntro best={best} startRef={start} onStart={begin} />}
      {stage === "intro" && gameId === "patangMarket" && (
        <PatangIntro
          startRef={start}
          onStart={begin}
          playLabel={
            <>
              {t("arcade.play", { s: gameById.patangMarket.seconds })} <ArrowRight size={18} />
            </>
          }
        />
      )}

      {stage === "intro" && gameId === "priceSnake" && <SnakeIntro best={best} startRef={start} onStart={begin} />}

      {stage === "intro" && gameId === "swipeBazaar" && <SwipeBazaarIntro best={best} startRef={start} onStart={begin} />}

      {stage === "intro" && gameId !== "snowball" && gameId !== "patangMarket" && gameId !== "priceSnake" && gameId !== "swipeBazaar" && (
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
            {gameById[gameId].seconds ? t("arcade.play", { s: gameById[gameId].seconds }) : t("arcade.playEndless")} <ArrowRight size={18} />
          </button>
        </div>
      )}

      {(stage === "count" || stage === "play") && (
        <div className="arcade-stage">
          {gameId === "priceSnake" ? (
            <PriceSnake key={round} running={stage === "play"} onEnd={finish} />
          ) : gameId === "insuranceRush" ? (
            <InsuranceRush key={round} running={stage === "play"} onEnd={finish} />
          ) : gameId === "patangMarket" ? (
            <PatangMarket key={round} running={stage === "play"} onEnd={finish} />
          ) : gameId === "swipeBazaar" ? (
            <SwipeBazaar key={round} running={stage === "play"} onEnd={finish} />
          ) : (
            <CanvasGame key={round} gameId={gameId} running={stage === "play"} onEnd={finish} />
          )}
          {stage === "count" && !interstitial && (
            <div className="arcade-count" aria-live="assertive">
              <b key={count}>{count || t("arcade.go")}</b>
            </div>
          )}
        </div>
      )}

      {stage === "done" && final && (
        <div className="arcade-done">
          <Stars n={starsFor(gameId, final.score)} big />
          {gameId === "priceSnake" && <SnakeResult final={final} />}
          {gameId !== "priceSnake" && (
            <>
              <p className="arcade-score">
                <CountUp value={final.score} prefix={gameId === "insuranceRush" ? "" : "₹"} />
                {final.isNew && <span className="arcade-new">{t("arcade.newBest")}</span>}
              </p>
              <ul className="arcade-chips">
                {Object.entries(final)
                  .filter(([k, v]) => typeof v === "number" && k !== "score" && !(["shielded", "claims", "renewals", "emisLeft"].includes(k) && !v))
                  .map(([k, v]) => (
                    <li key={k} className={`chip-${k}`}>
                      {t(`arcade.stat.${k}`, { n: v.toLocaleString("en-IN") })}
                    </li>
                  ))}
              </ul>
            </>
          )}
          {gameId === "patangMarket" && final.report && <PatangReport report={final.report} reason={final.reason} />}
          <p className="arcade-lesson">
            <Lightbulb size={20} aria-hidden="true" />
            <span>{t(`arcade.games.${gameId}.lesson`)}</span>
          </p>
          {story ? (
            <StoryVerdict won={starsFor(gameId, final.score) >= 1} startRef={start} onWin={story.onWin} onAgain={begin} onGiveUp={story.onGiveUp} />
          ) : (
            <div className="action-row">
              <button className="secondary-button" onClick={begin}>
                <RotateCcw size={16} /> {t("arcade.again")}
              </button>
              <button ref={start} className="primary-button big" onClick={onBack ?? onClose}>
                {t("arcade.done")} <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
      {interstitial && <AdInterstitial ad={interstitial} onOpen={(a) => setScam(a.id)} onSkip={() => setInterstitial(null)} />}
      {scam && (
        <ScamSite
          adId={scam}
          onClose={() => {
            setScam(null);
            setInterstitial(null);
          }}
        />
      )}
    </div>
  );
}

// The end of an arcade game played inside the story: did it unlock the choice?
function StoryVerdict({ won, startRef, onWin, onAgain, onGiveUp }) {
  const { t } = useT();
  return (
    <div className={`story-verdict ${won ? "won" : "lost"}`}>
      <p>
        <b>{won ? t("arcade.story.wonTitle") : t("arcade.story.lostTitle")}</b> {won ? t("arcade.story.won") : t("arcade.story.lost")}
      </p>
      <div className="action-row">
        {won ? (
          <span />
        ) : (
          <button className="text-button" onClick={onGiveUp}>
            {t("arcade.story.other")}
          </button>
        )}
        <button ref={startRef} className="primary-button big" onClick={won ? onWin : onAgain}>
          {won ? t("arcade.story.go") : t("arcade.again")} {won ? <ArrowRight size={18} /> : <RotateCcw size={16} />}
        </button>
      </div>
    </div>
  );
}

// An arcade game as a story mini-game, on its own full-screen layer.
export function ArcadeChoiceGame({ gameId, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  return (
    <div className="ir-layer" role="dialog" aria-modal="true" aria-label={t(`arcade.games.${gameId}.name`)}>
      <section className="game-window window-arcade title-arcade">
        <ArcadeGame gameId={gameId} onClose={onClose} story={{ onWin, onGiveUp: onGiveUp ?? onClose }} />
      </section>
    </div>
  );
}

// A tiny canvas with one snowball item on it, for the intro's legend.
function SnowIcon({ kind, value = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const ctx = ref.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, 30, 30);
        drawSnowThing(ctx, kind, 15, kind === "scam" ? 19 : kind === "shark" ? 13 : 15, value, now / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, value]);
  return <canvas ref={ref} width={60} height={60} className="snow-icon" aria-hidden="true" />;
}

const SNOW_GOOD = ["coin", "gold", "shield"];
const SNOW_BAD = ["sale", "phone", "fee", "emi", "scam", "shark"];

// The snowball's own intro: the goal, three picture steps, what to grab and what to dodge.
function SnowballIntro({ best, startRef, onStart }) {
  const { t } = useT();
  return (
    <div className="snow-intro">
      <p className="snow-lead">{t("arcade.snow.lead")}</p>
      <ol className="snow-steps">
        <li style={{ animationDelay: "0.05s" }}>
          <b>1</b>
          <span className="snow-step-art keys" aria-hidden="true">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
          </span>
          <span>{t("arcade.snow.step1")}</span>
        </li>
        <li style={{ animationDelay: "0.15s" }}>
          <b>2</b>
          <span className="snow-step-art grow" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{t("arcade.snow.step2")}</span>
        </li>
        <li style={{ animationDelay: "0.25s" }}>
          <b>3</b>
          <span className="snow-step-art" aria-hidden="true">
            <SnowIcon kind="sale" />
          </span>
          <span>{t("arcade.snow.step3")}</span>
        </li>
      </ol>
      <div className="snow-legend">
        <section className="good">
          <h3>{t("arcade.snow.grab")}</h3>
          {SNOW_GOOD.map((k) => (
            <p key={k}>
              <SnowIcon kind={k} value={k === "coin" ? 20 : 0} />
              <span>
                <b>{t(`arcade.snow.items.${k}.name`)}</b>
                <small>{t(`arcade.snow.items.${k}.effect`)}</small>
              </span>
            </p>
          ))}
        </section>
        <section className="bad">
          <h3>{t("arcade.snow.dodge")}</h3>
          <div className="snow-bad-grid">
            {SNOW_BAD.map((k) => (
              <p key={k}>
                <SnowIcon kind={k} />
                <span>
                  <b>{t(`arcade.snow.items.${k}.name`)}</b>
                  <small>{t(`arcade.snow.items.${k}.effect`)}</small>
                </span>
              </p>
            ))}
          </div>
        </section>
      </div>
      <p className="snow-stars">
        <Stars n={3} /> {t("arcade.snow.stars", { a: "₹400", b: "₹650", c: "₹850" })}
        {best > 0 && <em> · {t("arcade.best", { score: `₹${best.toLocaleString("en-IN")}` })}</em>}
      </p>
      <button ref={startRef} className="primary-button big snow-go" onClick={onStart}>
        {t("arcade.play", { s: gameById.snowball.seconds })} <ArrowRight size={18} />
      </button>
    </div>
  );
}

function HowTo({ gameId }) {
  const { t } = useT();
  const keys = { snowball: ["↑", "↓"], insuranceRush: ["←", "→"], patangMarket: ["Space", "↑"] }[gameId];
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

// ---------- Snowball: drawn on a canvas ----------
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
    if (ctx) drawSnowball(ctx, s, now);
    const left = Math.max(0, Math.ceil(gameById[gameId].seconds - s.time));
    const score = s.value;
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

// ---------- Snowball: a snowy hill, a cute snowball, coins, helpers and money traps ----------
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
};
function label(ctx, text, x, y, color = "#fff", size = 8) {
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

// One item, centred on (x, y). Also used for the little icons on the intro card.
export function drawSnowThing(ctx, kind, x, y, value = 0, t = 0) {
  ctx.save();
  ctx.lineJoin = "round";
  if (kind === "coin") coin(ctx, x, y, value >= 50 ? 12 : 10, value ? `${value}` : "₹");
  else if (kind === "gold") {
    for (const [dx, dy] of [[-8, 4], [8, 4], [0, -5]]) {
      ctx.fillStyle = "#b07a12";
      ctx.beginPath();
      ctx.moveTo(x + dx - 9, y + dy + 5);
      ctx.lineTo(x + dx - 5, y + dy - 4);
      ctx.lineTo(x + dx + 5, y + dy - 4);
      ctx.lineTo(x + dx + 9, y + dy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(x + dx - 5, y + dy - 3, 10, 6);
      ctx.fillStyle = "#fff3b0";
      ctx.fillRect(x + dx - 4, y + dy - 3, 4, 2);
    }
    ctx.fillStyle = "#fff8c8";
    const tw = Math.sin(t * 6) > 0 ? 3 : 2;
    ctx.fillRect(x + 10, y - 13, tw, tw);
  } else if (kind === "shield") {
    // The insurance umbrella in a bubble.
    ctx.fillStyle = "rgba(127, 211, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7fd3ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#3f8fd8";
    ctx.beginPath();
    ctx.arc(x, y + 1, 11, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    for (const dx of [-6, 2]) {
      ctx.beginPath();
      ctx.arc(x + dx + 2, y + 1, 3, Math.PI, 0);
      ctx.fill();
    }
    ctx.strokeStyle = "#2b4a6e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x, y + 10);
    ctx.arc(x - 2.5, y + 10, 2.5, 0, Math.PI);
    ctx.stroke();
  } else if (kind === "sale") {
    // A red price tag with a hole and string.
    ctx.fillStyle = "#e0453a";
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 11);
    ctx.lineTo(x + 12, y - 11);
    ctx.lineTo(x + 22, y);
    ctx.lineTo(x + 12, y + 11);
    ctx.lineTo(x - 20, y + 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#9c2a22";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + 13, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, "SALE!", x - 4, y + 0.5, "#fff", 9);
  } else if (kind === "phone") {
    // A shiny new phone ("I need it!").
    ctx.fillStyle = "#2b2f3a";
    rr(ctx, x - 9, y - 15, 18, 30, 4);
    ctx.fill();
    const g = ctx.createLinearGradient(x - 7, y - 12, x + 7, y + 10);
    g.addColorStop(0, "#9fe0ff");
    g.addColorStop(1, "#b07ae0");
    ctx.fillStyle = g;
    rr(ctx, x - 7, y - 12, 14, 22, 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 5, y - 10, 3, 8);
    label(ctx, "NEW", x, y + 2, "#3a1f6a", 6);
    ctx.fillStyle = "#ffd84a";
    const tw = 2 + (Math.sin(t * 8) > 0 ? 1 : 0);
    ctx.fillRect(x + 10, y - 16, tw, tw);
    ctx.fillRect(x - 13, y - 6, 2, 2);
  } else if (kind === "fee") {
    // Late-fee icicles hanging from a little sign.
    ctx.fillStyle = "#8a5a2c";
    rr(ctx, x - 16, y - 16, 32, 10, 2);
    ctx.fill();
    label(ctx, "FEE", x, y - 11, "#fff", 7);
    ctx.fillStyle = "#bfe8ff";
    ctx.strokeStyle = "#5fa7d0";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const ix = x - 13 + i * 8.5;
      const len = 14 + (i % 2) * 6;
      ctx.beginPath();
      ctx.moveTo(ix, y - 6);
      ctx.lineTo(ix + 6, y - 6);
      ctx.lineTo(ix + 3, y - 6 + len);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === "emi") {
    // A "no-cost EMI" padlock on a chain.
    ctx.strokeStyle = "#8d96a3";
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 7, y - 12, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#6f767f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 4, 6, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#e8b53a";
    rr(ctx, x - 10, y - 4, 20, 17, 3);
    ctx.fill();
    ctx.strokeStyle = "#a87a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, "EMI", x, y + 4.5, "#5a3a00", 8);
  } else if (kind === "scam") {
    // A "You won!" envelope on a fishing hook.
    ctx.strokeStyle = "#6f767f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x, y - 12);
    ctx.arc(x - 3, y - 12, 3, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = "#f4f4f0";
    rr(ctx, x - 15, y - 9, 30, 20, 2);
    ctx.fill();
    ctx.strokeStyle = "#b07ae0";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 9);
    ctx.lineTo(x, y + 2);
    ctx.lineTo(x + 15, y - 9);
    ctx.stroke();
    ctx.fillStyle = "#b07ae0";
    rr(ctx, x - 13, y + 3, 26, 9, 2);
    ctx.fill();
    label(ctx, "YOU WON!", x, y + 7.5, "#fff", 5.5);
  } else if (kind === "shark") {
    // A loan shark's fin cutting through the snow.
    ctx.fillStyle = "#5f6b7a";
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 10);
    ctx.quadraticCurveTo(x - 2, y - 4, x + 6, y - 20);
    ctx.quadraticCurveTo(x + 8, y - 4, x + 18, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a96a6";
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 10);
    ctx.quadraticCurveTo(x + 1, y, x + 6, y - 12);
    ctx.lineTo(x + 6, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 18, y + 10, 38, 3);
    rr(ctx, x - 14, y + 13, 28, 9, 2);
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    label(ctx, "LOAN", x, y + 17.5, "#fff", 6.5);
  }
  ctx.restore();
}

function drawSnowball(ctx, s, now) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const t = now / 1000;
  const speed = 150 + s.time * 3;
  const dist = s.time * speed;
  // Sky and far hills (slow), then pine trees (faster): a little parallax.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.h);
  sky.addColorStop(0, "#bfe3ff");
  sky.addColorStop(0.45, "#e9f6ff");
  sky.addColorStop(1, "#ffffff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath();
  ctx.arc(410, 30, 16, 0, Math.PI * 2);
  ctx.fill();
  const hills = (color, base, amp, period, shift) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.h);
    for (let x = 0; x <= FIELD.w; x += 8) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x + shift) / period)));
    ctx.lineTo(FIELD.w, FIELD.h);
    ctx.fill();
  };
  hills("#d7ecfa", 66, 26, 46, dist * 0.08);
  hills("#eef7fd", 74, 16, 30, dist * 0.15);
  // Pines along the top edge.
  const pineOff = (dist * 0.3) % 60;
  for (let x = -pineOff; x < FIELD.w + 30; x += 60) {
    ctx.fillStyle = "#6a4a2c";
    ctx.fillRect(x + 9, 62, 4, 8);
    ctx.fillStyle = "#3f8a5a";
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + 11, 34 + k * 8);
      ctx.lineTo(x + 2 - k * 1.5, 52 + k * 6);
      ctx.lineTo(x + 20 + k * 1.5, 52 + k * 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 8, 40, 6, 2);
    ctx.fillRect(x + 5, 51, 4, 2);
  }
  // Three snowy tracks.
  const off = dist % 40;
  for (let i = 0; i < 3; i++) {
    const y = laneY(i);
    ctx.fillStyle = i % 2 ? "#f6fbff" : "#ecf6fd";
    ctx.fillRect(0, y - 30, FIELD.w, 60);
    ctx.fillStyle = "rgba(150, 190, 220, 0.35)";
    for (let x = -off; x < FIELD.w; x += 40) {
      ctx.fillRect(x, y + 27, 18, 2);
      ctx.fillRect(x + 20, y - 29, 10, 1);
    }
  }
  // Items.
  for (const it of s.things) drawSnowThing(ctx, it.kind, it.x, laneY(it.lane), it.value, t);

  // The snowball: a round, rolling ball of snow with coins stuck in it and a happy face.
  const r = ballRadius(s.value);
  const x = 80;
  const y = s.y + (s.hit ? Math.sin(t * 60) * 2 : 0);
  ctx.fillStyle = "rgba(60, 90, 120, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.92, r * 1.05, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.15, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, s.hit ? "#ffc8c0" : "#cfe6f7");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 140, 180, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Coins rolling round inside the snow (more coins as it grows).
  const n = Math.min(10, 2 + Math.floor(s.value / 120));
  for (let k = 0; k < n; k++) {
    const a = s.roll + (k * Math.PI * 2) / n;
    const cx = x + Math.cos(a) * r * 0.68;
    const cy = y + Math.sin(a) * r * 0.68;
    if (Math.sin(a) < -0.2) continue;
    ctx.fillStyle = "#e8b53a";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, r * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
  // Face.
  const ey = y - r * 0.12;
  ctx.fillStyle = "#2b2f3a";
  if (s.hit) {
    ctx.fillRect(x - r * 0.32 - 2, ey, 5, 1.5);
    ctx.fillRect(x + r * 0.32 - 3, ey, 5, 1.5);
  } else {
    const blink = Math.floor(t * 1.2) % 5 === 0 && t % 0.83 < 0.12;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.32, ey, 2, blink ? 0.6 : 2.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.32, ey, 2, blink ? 0.6 : 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 130, 150, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.52, ey + 5, 3, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.52, ey + 5, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2b2f3a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (s.hit) ctx.arc(x, ey + 9, 3, Math.PI * 1.1, Math.PI * 1.9);
  else ctx.arc(x, ey + 3, s.happy ? 4 : 3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // The insurance umbrella over the ball while it lasts.
  if (s.shield > 0) {
    const fade = s.shield < 2 ? 0.4 + 0.4 * Math.sin(t * 20) : 0.9;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = "#7fd3ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#3f8fd8";
    ctx.beginPath();
    ctx.arc(x, y - r - 4, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // The amount on a little tag above.
  const tag = `₹${s.value.toLocaleString("en-IN")}`;
  ctx.font = "900 11px system-ui, sans-serif";
  const tw = ctx.measureText(tag).width + 12;
  ctx.fillStyle = s.hit ? "#e0453a" : "#2f7d4f";
  rr(ctx, x - tw / 2, y - r - 24, tw, 15, 7);
  ctx.fill();
  label(ctx, tag, x, y - r - 16.5, "#fff", 11);
  // Falling snow.
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let k = 0; k < 26; k++) {
    const fx = ((k * 73 + t * (14 + (k % 5) * 3)) % (FIELD.w + 20)) - 10;
    const fy = ((k * 41 + t * (22 + (k % 4) * 6)) % (FIELD.h + 10)) - 5;
    ctx.fillRect(FIELD.w - fx, fy, k % 3 ? 2 : 3, k % 3 ? 2 : 3);
  }
  for (const p of s.pops) pop(ctx, p, p.kind === "sale" ? "#c0392b" : p.kind === "interest" ? "#2a7fbf" : p.kind === "shield" ? "#3f8fd8" : "#2f7d3a");
}
