import React, { useEffect, useRef } from "react";
import { Coffee, Home, Play } from "lucide-react";
import { useT } from "../i18n/index.jsx";

// The game is paused: everything behind is frozen until Resume (or T / Esc).
export function PauseCard({ onResume, onMenu }) {
  const { t } = useT();
  const resume = useRef(null);
  useEffect(() => resume.current?.focus(), []);
  return (
    <div className="pause-layer" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card">
        <span className="pause-icon" aria-hidden="true">
          <Coffee size={34} />
        </span>
        <h2 id="pause-title">{t("pause.title")}</h2>
        <p>{t("pause.text")}</p>
        <button ref={resume} className="primary-button big" onClick={onResume}>
          <Play size={18} fill="currentColor" /> {t("pause.resume")}
        </button>
        {onMenu && (
          <button className="text-button" onClick={onMenu}>
            <Home size={15} /> {t("pause.menu")}
          </button>
        )}
        <small className="pause-key">
          <kbd>T</kbd> {t("pause.key")}
        </small>
      </div>
    </div>
  );
}
