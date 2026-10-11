import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, FolderSearch, MapPin, OctagonAlert, Siren, Smartphone } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../../ui/PixelPortrait.jsx";
import { sounds } from "../../ui/sound.js";

// The STOP flash before a very bad choice: Ammamma's warning, then "think again" or "do it anyway"
// (which unlocks after a moment, so the warning gets read).
export function WarningFlash({ choice, onHeed, onIgnore }) {
  const { t, plain, rich } = useT();
  const [ready, setReady] = useState(false);
  const back = useRef(null);
  useEffect(() => {
    sounds.thud();
    back.current?.focus();
    const id = setTimeout(() => setReady(true), 2200);
    const onKey = (e) => e.key === "Escape" && onHeed();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onHeed]);
  return (
    <div className="stop-flash" role="alertdialog" aria-modal="true" aria-labelledby="stop-title" aria-describedby="stop-text">
      <div className="stop-card">
        <div className="stop-sign" aria-hidden="true">
          <OctagonAlert size={46} />
        </div>
        <h2 id="stop-title">{t("story.stop")}</h2>
        <p className="stop-choice">“{plain(choice.label)}”</p>
        <div className="stop-mentor">
          <PixelPortrait role="mentor" />
          <p id="stop-text">{rich(choice.warn)}</p>
        </div>
        <div className="stop-actions">
          <button ref={back} className="primary-button big" onClick={onHeed}>
            {t("story.thinkAgain")}
          </button>
          <button className={`danger-button ${ready ? "ready" : ""}`} disabled={!ready} onClick={onIgnore}>
            <i aria-hidden="true" />
            <span>{t("story.doIt")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// A countdown for a scene that must be decided fast. Pauses while `paused`.
export function TimerBar({ seconds, paused, onTimeout, label }) {
  const [left, setLeft] = useState(seconds * 1000);
  const fired = useRef(false);
  useEffect(() => {
    if (paused) return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      setLeft((x) => Math.max(0, x - (now - last)));
      last = now;
    }, 100);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onTimeout();
    }
  }, [left, onTimeout]);
  const pct = (left / (seconds * 1000)) * 100;
  return (
    <div className={`timer-bar ${pct < 35 ? "low" : ""}`} role="timer" aria-live="off">
      <Clock size={15} aria-hidden="true" />
      <span>{label}</span>
      <i style={{ width: `${pct}%` }} />
      <b>{Math.ceil(left / 1000)}</b>
    </div>
  );
}

// The cinematic title card at the start of each chapter.
export function MissionIntro({ story, avatar, stage, previous, onBegin }) {
  const { t, pick, rich } = useT();
  const btn = useRef(null);
  const m = story.mission;
  useEffect(() => {
    sounds.page();
    btn.current?.focus();
  }, []);
  return (
    <div className="mission-intro" role="dialog" aria-modal="true" aria-labelledby="mission-title">
      <div className="letterbox top" />
      <div className="mission-card">
        <span className="mission-part">{pick(m.part)}</span>
        <h1 id="mission-title">{pick(m.title)}</h1>
        <span className="mission-ages">{t("chapter.ages", { from: m.from, to: m.to })}</span>
        <div className="mission-sprites" aria-hidden="true">
          <PixelPortrait role="player" avatar={avatar} stage={stage} />
        </div>
        {previous && (
          <p className={`mission-previously tone-${previous.tone}`}>
            <b>{t("story.previously")}</b> {pick(previous.title)}
          </p>
        )}
        <p className="mission-text">{rich(m.intro)}</p>
        <button ref={btn} className="primary-button big" onClick={onBegin}>
          {t("story.begin")} <ArrowRight size={18} />
        </button>
      </div>
      <div className="letterbox bottom" />
    </div>
  );
}

// Top-centre: what to do next, where, and how much time is left.
export function ObjectiveTracker({ story, placeName, rushLeft, onGo }) {
  const { t, pick, rich } = useT();
  const o = story.objective;
  const m = story.mission;
  if (!o) return null;
  const isPhone = o.location === "phone";
  return (
    <section className={`objective ${o.rush ? "urgent" : ""}`} aria-live="polite">
      <div className="objective-mission">
        <span>{pick(m.part)}</span> · <b>{pick(m.title)}</b>
      </div>
      <div className="objective-main">
        <span className="objective-diamond" aria-hidden="true">
          {o.rush ? <Siren size={18} /> : <MapPin size={18} />}
        </span>
        <p>{rich(o.text)}</p>
      </div>
      <div className="objective-row">
        <button className="objective-go" onClick={onGo}>
          {isPhone ? <Smartphone size={15} /> : <ArrowRight size={15} />}
          {isPhone ? t("story.openPhone") : t("story.walkTo", { place: placeName(o.location) })}
        </button>
        {o.rush && rushLeft != null && (
          <span className={`rush-clock ${rushLeft <= 8 ? "low" : ""}`}>
            <Clock size={14} /> {Math.ceil(rushLeft)}s
          </span>
        )}
      </div>
    </section>
  );
}

const EVIDENCE_TEXT = ["evidence_call", "evidence_prakash", "evidence_telegram", "evidence_mule", "evidence_loanapp", "evidence_goldharvest"];

export function EvidenceFile({ story, onClose }) {
  const { t } = useT();
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className="view evidence-file">
      <span className="eyebrow">{t("story.evidenceTitle")}</span>
      <h2>{t("story.evidenceCount", { n: story.evidence.length })}</h2>
      <p className="quiet">{t("story.evidenceHelp")}</p>
      <ul>
        {EVIDENCE_TEXT.map((f) => (
          <li key={f} className={story.evidence.includes(f) ? "have" : "missing"}>
            <FolderSearch size={14} aria-hidden="true" /> {story.evidence.includes(f) ? t(`story.evidence.${f}`) : "? ? ?"}
          </li>
        ))}
      </ul>
      <div className="action-row">
        <span />
        <button ref={btn} className="primary-button" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
