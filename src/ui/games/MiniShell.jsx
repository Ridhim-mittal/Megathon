import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, Sparkles, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../PixelPortrait.jsx";

// The frame every story mini-game shares (same look as the Interest Race): an intro with three
// picture steps and the win rule, the game itself, then a result with "try again" or "go on".
//   steps: [{ art: <node>, text }]   play: ({ onFinish(won, scoreText) }) => <node>
export function MiniShell({ id, icon: Icon, ribbon, title, lead, steps, rule, mentor = "mentor", avatar = "boy", stage: lifeStage = "young", mode = "story", play, wonText, lostText, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  const [stage, setStage] = useState("intro"); // intro | play | done
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null); // { won, score }
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), [stage]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ir-layer" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div className={`ir-card mg-card mg-${id} stage-${stage}`}>
        <button type="button" className="ir-close" aria-label={t("common.back")} onClick={onClose}>
          <X size={18} />
        </button>
        <span className="ir-ribbon">
          <Icon size={14} aria-hidden="true" /> {ribbon}
        </span>

        {stage === "intro" && (
          <div className="ir-intro">
            <div className="ir-intro-head">
              <div className="ir-teacher">
                <PixelPortrait role={mentor} />
              </div>
              <div>
                <h2 id={`${id}-title`}>{title}</h2>
                <p className="ir-lead">{lead}</p>
              </div>
            </div>
            <ol className="ir-steps">
              {steps.map((s, i) => (
                <li key={i} style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                  <span className="ir-step-art mg-art" aria-hidden="true">
                    {s.art}
                  </span>
                  <b>{i + 1}</b>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
            <div className="ir-win-rule">
              <Sparkles size={16} aria-hidden="true" />
              <span>{rule}</span>
            </div>
            <button ref={btn} className="primary-button big ir-go" onClick={() => setStage("play")}>
              {t("minigame.start")} <ArrowRight size={18} />
            </button>
          </div>
        )}

        {stage === "play" && (
          <div className="mg-play" key={round}>
            {play({
              onFinish: (won, score) => {
                setResult({ won, score });
                setStage("done");
              },
            })}
          </div>
        )}

        {stage === "done" && result && (
          <div className={`ir-done ${result.won ? "won" : "lost"}`}>
            <div className="ir-done-hero">
              <PixelPortrait role="player" avatar={avatar} stage={lifeStage} />
              {result.won && <Sparkles className="ir-done-spark" size={22} aria-hidden="true" />}
            </div>
            <h2 id={`${id}-title`}>{result.won ? t("minigame.won") : t("minigame.lost")}</h2>
            {result.score && <p className="ir-done-score">{result.score}</p>}
            <p className="ir-done-text">{result.won ? wonText : lostText}</p>
            <div className="ir-done-actions">
              {result.won ? (
                <button ref={btn} className="primary-button big" onClick={() => (mode === "story" ? onWin?.() : onClose?.())}>
                  {t("minigame.collect")} <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button className="text-button" onClick={() => (mode === "story" ? onGiveUp?.() : onClose?.())}>
                    {t("minigame.otherWay")}
                  </button>
                  <button
                    ref={btn}
                    className="primary-button big"
                    onClick={() => {
                      setRound((r) => r + 1);
                      setResult(null);
                      setStage("play");
                    }}
                  >
                    <RotateCcw size={17} /> {t("minigame.again")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// A countdown in whole seconds that calls onEnd once at zero. Returns seconds left.
export function useCountdown(seconds, onEnd, running = true) {
  const [left, setLeft] = useState(seconds);
  const ended = useRef(false);
  useEffect(() => {
    if (!running) return undefined;
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - start) / 1000);
      setLeft(l);
      if (l <= 0 && !ended.current) {
        ended.current = true;
        clearInterval(id);
        onEnd();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}
