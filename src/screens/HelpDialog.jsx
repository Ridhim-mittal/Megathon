import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Gamepad2, Home, MapPin, OctagonAlert, Star, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

// "How to play": five little animated pictures, one line each. Arrow keys or the buttons move
// between them; the last one starts the game.
const SLIDES = ["walk", "jars", "choose", "learn", "dream"];

function Art({ kind }) {
  if (kind === "walk")
    return (
      <div className="tour-art art-walk">
        <span className="tour-path" />
        <span className="tour-walker">
          <PixelPortrait role="player" avatar="girl" stage="child" />
        </span>
        <span className="tour-pin">
          <MapPin size={30} />
        </span>
        <span className="tour-keys">
          <kbd>←</kbd>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>→</kbd>
        </span>
      </div>
    );
  if (kind === "jars")
    return (
      <div className="tour-art art-jars">
        {["needs", "joys", "dream"].map((j, i) => (
          <span key={j} className={`tour-jar jar-${j}`} style={{ "--d": `${i * 0.5}s` }}>
            <i className="tour-coin">₹</i>
            <b />
          </span>
        ))}
      </div>
    );
  if (kind === "choose")
    return (
      <div className="tour-art art-choose">
        <span className="tour-card good">
          <b>1</b>
          <i />
          <i className="short" />
        </span>
        <span className="tour-card bad">
          <b>2</b>
          <i />
          <i className="short" />
          <span className="tour-stop">
            <OctagonAlert size={34} />
          </span>
        </span>
      </div>
    );
  if (kind === "learn")
    return (
      <div className="tour-art art-learn">
        <span className="tour-granny">
          <PixelPortrait role="mentor" />
        </span>
        <span className="tour-bubble">💡</span>
      </div>
    );
  return (
    <div className="tour-art art-dream">
      <span className="tour-home">
        <Home size={54} strokeWidth={1.8} />
        <Star className="tour-star" size={22} fill="currentColor" />
      </span>
      <span className="tour-hopper">
        <PixelPortrait role="player" avatar="boy" stage="young" />
      </span>
      <span className="tour-pad">
        <Gamepad2 size={30} />
      </span>
    </div>
  );
}

export function HelpDialog({ onClose }) {
  const { t } = useT();
  const ref = useRef(null);
  const next = useRef(null);
  const [at, setAt] = useState(0);
  const last = at === SLIDES.length - 1;
  const kind = SLIDES[at];
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    next.current?.focus();
    return () => d?.open && d.close();
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setAt((n) => Math.min(SLIDES.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setAt((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <dialog ref={ref} className="guide-dialog tour" onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="tour-title">
      <button className="dialog-close quiet-button" aria-label={t("common.close")} onClick={onClose}>
        <X size={21} />
      </button>
      <span className="tour-eyebrow">{t("tour.eyebrow", { n: at + 1, total: SLIDES.length })}</span>
      <div className="tour-slide" key={kind}>
        <Art kind={kind} />
        <h2 id="tour-title">{t(`tour.${kind}.title`)}</h2>
        <p>{t(`tour.${kind}.text`)}</p>
        {last && <small className="tour-note">{t("app.illustrative")}</small>}
      </div>
      <div className="tour-dots" role="tablist">
        {SLIDES.map((s, i) => (
          <button key={s} role="tab" aria-selected={i === at} aria-label={t(`tour.${s}.title`)} className={i === at ? "on" : i < at ? "seen" : ""} onClick={() => setAt(i)} />
        ))}
      </div>
      <div className="tour-actions">
        <button className="secondary-button" onClick={() => setAt(at - 1)} disabled={at === 0}>
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <button ref={next} className="primary-button big" onClick={() => (last ? onClose() : setAt(at + 1))}>
          {last ? t("help.start") : t("common.next")} <ArrowRight size={18} />
        </button>
      </div>
    </dialog>
  );
}
