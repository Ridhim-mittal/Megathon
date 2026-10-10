import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock, GraduationCap, Landmark, PiggyBank, RotateCcw, Sparkles, Store, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../PixelPortrait.jsx";
import { sounds } from "../sound.js";

// "Interest race": five rounds, three offers each. Work out simple interest (P × R × T ÷ 100) and
// pick the one that earns the most before the clock runs out. 4 of 5 wins the scholarship.
const ROUNDS = 5;
const NEED = 4;
const SECONDS = 15;
const P = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 8000, 10000];
const R = [2, 3, 4, 5, 6, 8, 10, 12];
const T = [1, 2, 3, 4, 5];
const OFFER_ICONS = [Landmark, PiggyBank, Store];

const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
export const simpleInterest = ({ p, r, t }) => (p * r * t) / 100;

// Three offers with clearly different interest, and the biggest principal not always the winner.
export function makeRound() {
  for (let tries = 0; tries < 200; tries++) {
    const offers = [0, 1, 2].map(() => ({ p: pickOf(P), r: pickOf(R), t: pickOf(T) }));
    const si = offers.map(simpleInterest);
    const sorted = [...si].sort((a, b) => b - a);
    if (sorted[0] < sorted[1] * 1.08 || sorted[1] < sorted[2] * 1.05) continue;
    const best = si.indexOf(sorted[0]);
    const bigP = offers.map((o) => o.p).indexOf(Math.max(...offers.map((o) => o.p)));
    if (best === bigP && Math.random() < 0.6) continue;
    return { offers, best };
  }
  return { offers: [{ p: 1000, r: 5, t: 2 }, { p: 2000, r: 3, t: 1 }, { p: 500, r: 10, t: 3 }], best: 1 };
}

function Confetti() {
  return (
    <span className="ir-confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.05}s`, background: ["#ffd84a", "#ff6f91", "#57b85a", "#4f8fe0", "#ff9a3c"][i % 5] }} />
      ))}
    </span>
  );
}

export function InterestRace({ mode = "practice", avatar = "boy", onWin, onClose, onGiveUp }) {
  const { t, money } = useT();
  const [stage, setStage] = useState("intro"); // intro | play | done
  const [round, setRound] = useState(0);
  const [game, setGame] = useState(() => Array.from({ length: ROUNDS }, makeRound));
  const [results, setResults] = useState([]); // true/false per round
  const [picked, setPicked] = useState(null); // index, or -1 for time up
  const [left, setLeft] = useState(SECONDS);
  const startBtn = useRef(null);
  useEffect(() => startBtn.current?.focus(), [stage]);

  const current = game[round];
  const score = results.filter(Boolean).length;
  const won = score >= NEED;

  const choose = useCallback(
    (i) => {
      if (stage !== "play" || picked !== null) return;
      const ok = i === current.best;
      setPicked(i);
      setResults((r) => [...r, ok]);
      if (ok) sounds.coin();
      else sounds.thud();
    },
    [stage, picked, current],
  );

  // The clock.
  useEffect(() => {
    if (stage !== "play" || picked !== null) return undefined;
    if (left <= 0) {
      setPicked(-1);
      setResults((r) => [...r, false]);
      sounds.thud();
      return undefined;
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [stage, picked, left]);

  function next() {
    if (round + 1 >= ROUNDS) {
      setStage("done");
      if (results.filter(Boolean).length >= NEED) sounds.chime();
      return;
    }
    setRound((r) => r + 1);
    setPicked(null);
    setLeft(SECONDS);
  }

  function restart() {
    setGame(Array.from({ length: ROUNDS }, makeRound));
    setRound(0);
    setResults([]);
    setPicked(null);
    setLeft(SECONDS);
    setStage("play");
  }

  // Keys: 1–3 pick, Enter goes on, Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (stage === "play" && picked === null && ["1", "2", "3"].includes(e.key)) choose(Number(e.key) - 1);
      else if (stage === "play" && picked !== null && e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const coins = useMemo(
    () =>
      Array.from({ length: ROUNDS }, (_, i) => (
        <span key={i} className={`ir-coin ${results[i] === true ? "win" : results[i] === false ? "miss" : i === round && stage === "play" ? "now" : ""}`}>
          {results[i] === true ? <Check size={13} strokeWidth={3.5} /> : results[i] === false ? <X size={13} strokeWidth={3.5} /> : i + 1}
        </span>
      )),
    [results, round, stage],
  );

  return (
    <div className="ir-layer" role="dialog" aria-modal="true" aria-labelledby="ir-title">
      <div className={`ir-card stage-${stage}`}>
        <button type="button" className="ir-close" aria-label={t("common.back")} onClick={onClose}>
          <X size={18} />
        </button>
        <span className="ir-ribbon">
          <GraduationCap size={14} aria-hidden="true" /> {t("interest.ribbon")}
        </span>

        {stage === "intro" && (
          <div className="ir-intro">
            <div className="ir-teacher">
              <PixelPortrait role="teacher" />
            </div>
            <div className="ir-intro-text">
              <h2 id="ir-title">{t("interest.title")}</h2>
              <p>{t(mode === "story" ? "interest.introStory" : "interest.introPractice", { need: NEED, rounds: ROUNDS })}</p>
              <div className="ir-board">
                <b>{t("interest.formulaName")}</b>
                <span className="ir-formula">
                  <i className="v-p">P</i> × <i className="v-r">R</i> × <i className="v-t">T</i> ÷ 100
                </span>
                <small>{t("interest.legend")}</small>
                <small className="ir-example">{t("interest.example")}</small>
              </div>
              <button ref={startBtn} className="primary-button big ir-go" onClick={() => setStage("play")}>
                {t("interest.start")} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {stage === "play" && current && (
          <div className="ir-play">
            <div className="ir-top">
              <div className="ir-coins" aria-label={t("interest.score", { n: score, total: ROUNDS })}>
                {coins}
              </div>
              <div className={`ir-clock ${left <= 5 && picked === null ? "hurry" : ""}`}>
                <Clock size={15} aria-hidden="true" />
                <span className="ir-clock-bar">
                  <span style={{ width: `${(left / SECONDS) * 100}%` }} />
                </span>
                <b>{left}</b>
              </div>
            </div>
            <h2 id="ir-title" className="ir-question">
              {t("interest.question")}
            </h2>
            <div className="ir-offers" key={round}>
              {current.offers.map((o, i) => {
                const Icon = OFFER_ICONS[i];
                const si = simpleInterest(o);
                const state = picked === null ? "" : i === current.best ? "best" : i === picked ? "wrong" : "other";
                return (
                  <button key={i} className={`ir-offer offer-${i} ${state}`} style={{ animationDelay: `${i * 0.09}s` }} onClick={() => choose(i)} disabled={picked !== null}>
                    {state === "best" && <Confetti />}
                    <span className="ir-offer-head">
                      <span className="ir-offer-icon">
                        <Icon size={18} />
                      </span>
                      {t("interest.offer", { n: "ABC"[i] })}
                      <kbd>{i + 1}</kbd>
                    </span>
                    <span className="ir-row">
                      <i className="v-p">P</i> <b>{money(o.p)}</b>
                    </span>
                    <span className="ir-row">
                      <i className="v-r">R</i> <b>{t("interest.rate", { r: o.r })}</b>
                    </span>
                    <span className="ir-row">
                      <i className="v-t">T</i> <b>{t("interest.years", { n: o.t })}</b>
                    </span>
                    <span className="ir-answer">
                      {picked === null ? (
                        <span className="ir-q">?</span>
                      ) : (
                        <>
                          <small>
                            {o.p.toLocaleString("en-IN")} × {o.r} × {o.t} ÷ 100
                          </small>
                          <strong>{money(si)}</strong>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="ir-feedback" aria-live="polite">
              {picked !== null && (
                <>
                  <span className={`ir-verdict ${results[round] ? "good" : "bad"}`}>
                    {picked === -1 ? t("interest.timeUp") : results[round] ? t("interest.right") : t("interest.wrong")}
                  </span>
                  <button className="primary-button" onClick={next} autoFocus>
                    {round + 1 >= ROUNDS ? t("interest.finish") : t("interest.next")} <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className={`ir-done ${won ? "won" : "lost"}`}>
            {won && <Confetti />}
            <div className="ir-done-hero">
              <PixelPortrait role="player" avatar={avatar} stage="teen" />
              {won ? <Sparkles className="ir-done-spark" size={22} aria-hidden="true" /> : null}
            </div>
            <h2 id="ir-title">{won ? t("interest.wonTitle") : t("interest.lostTitle")}</h2>
            <p className="ir-done-score">{t("interest.score", { n: score, total: ROUNDS })}</p>
            {won ? (
              <div className="ir-certificate">
                <GraduationCap size={26} aria-hidden="true" />
                <span>{t(mode === "story" ? "interest.certificate" : "interest.certificatePractice")}</span>
                <b className="ir-stamp">{t("interest.stamp")}</b>
              </div>
            ) : (
              <p className="ir-done-text">{t("interest.lostText", { need: NEED })}</p>
            )}
            <div className="ir-done-actions">
              {won ? (
                <button ref={startBtn} className="primary-button big" onClick={() => (mode === "story" ? onWin?.() : onClose?.())}>
                  {mode === "story" ? t("interest.collect") : t("interest.done")} <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button className="text-button" onClick={() => (mode === "story" ? onGiveUp?.() : onClose?.())}>
                    {mode === "story" ? t("interest.otherWay") : t("interest.done")}
                  </button>
                  <button ref={startBtn} className="primary-button big" onClick={restart}>
                    <RotateCcw size={17} /> {t("interest.again")}
                  </button>
                </>
              )}
              {won && mode === "practice" && (
                <button className="text-button" onClick={restart}>
                  <RotateCcw size={15} /> {t("interest.again")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Choices in the story that need a mini-game won first.
export const CHOICE_GAMES = { scholarship_job: "interest" };
