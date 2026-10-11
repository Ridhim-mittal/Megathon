import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CandlestickChart, Gamepad2, Landmark, MessageSquare, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { sounds } from "./sound.js";

// The phone has arrived: a little gift moment, then one app at a time on a phone mock-up (the app
// glows, the rest wait), one line each. The last page opens the real phone.
const APPS = [
  { id: "messages", icon: MessageSquare },
  { id: "bank", icon: Landmark },
  { id: "invest", icon: TrendingUp },
  { id: "exchange", icon: CandlestickChart },
  { id: "arcade", icon: Gamepad2 },
  { id: "gyaan", icon: BookOpen },
];
const PAGES = ["hello", ...APPS.map((a) => a.id), "ready"];

export function PhoneTour({ onOpen, onClose }) {
  const { t } = useT();
  const [at, setAt] = useState(0);
  const next = useRef(null);
  const page = PAGES[at];
  const app = APPS.find((a) => a.id === page);
  const last = at === PAGES.length - 1;
  useEffect(() => {
    sounds.chime?.();
  }, []);
  useEffect(() => next.current?.focus(), [at]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") setAt((n) => Math.min(PAGES.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setAt((n) => Math.max(0, n - 1));
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ptour-layer" role="dialog" aria-modal="true" aria-labelledby="ptour-title">
      <div className="ptour-card">
        <div className={`ptour-phone ${page === "hello" ? "is-gift" : ""}`} aria-hidden="true">
          <span className="ptour-notch" />
          {page === "hello" ? (
            <span className="ptour-hello">
              <Smartphone size={46} />
              <Sparkles className="ptour-spark s1" size={18} />
              <Sparkles className="ptour-spark s2" size={14} />
              <Sparkles className="ptour-spark s3" size={16} />
            </span>
          ) : (
            <span className="ptour-grid">
              {APPS.map((a) => (
                <span key={a.id} className={`ptour-app app-${a.id} ${page === a.id ? "on" : ""} ${page === "ready" ? "all" : ""}`}>
                  <a.icon size={20} />
                </span>
              ))}
            </span>
          )}
          <span className="ptour-home" />
        </div>
        <div className="ptour-text" key={page}>
          {app && (
            <span className={`ptour-chip app-${app.id}`}>
              <app.icon size={14} /> {t(`phone.apps.${app.id}`)}
            </span>
          )}
          <h2 id="ptour-title">{t(`phoneTour.${page}.title`)}</h2>
          <p>{t(`phoneTour.${page}.text`)}</p>
          {last && (
            <p className="ptour-key">
              <kbd>P</kbd> {t("phoneTour.keyHint")}
            </p>
          )}
        </div>
        <div className="ptour-foot">
          <span className="ptour-dots">
            {PAGES.map((p, i) => (
              <i key={p} className={i === at ? "on" : i < at ? "seen" : ""} />
            ))}
          </span>
          <span className="ptour-actions">
            {at > 0 ? (
              <button className="secondary-button" onClick={() => setAt(at - 1)} aria-label={t("common.back")}>
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button className="text-button" onClick={onClose}>
                {t("phoneTour.skip")}
              </button>
            )}
            <button ref={next} className="primary-button big" onClick={() => (last ? onOpen() : setAt(at + 1))}>
              {last ? t("phoneTour.open") : at === 0 ? t("phoneTour.show") : t("common.next")} <ArrowRight size={18} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
