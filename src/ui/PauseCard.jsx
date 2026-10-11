import React, { useEffect, useRef } from "react";
import { useT } from "../i18n/index.jsx";
import { PixelIcon } from "./PixelIcon.jsx";

// The game is paused: everything behind is frozen. A wooden pixel panel with four big rows:
// resume, sound on/off, how to play, main menu.
export function PauseCard({ onResume, onMenu, onHelp, settings }) {
  const { t } = useT();
  const resume = useRef(null);
  useEffect(() => resume.current?.focus(), []);
  const sound = settings?.sound;
  return (
    <div className="pause-layer" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card">
        <h2 id="pause-title" className="pause-ribbon">
          {t("pause.title")}
        </h2>
        <div className="pause-list">
          <button ref={resume} className="pause-row go" onClick={onResume}>
            <PixelIcon name="play" size={18} />
            <span>{t("pause.resume")}</span>
            <kbd>T</kbd>
          </button>
          {settings && (
            <button className={`pause-row ${sound ? "" : "off"}`} aria-pressed={sound} onClick={() => settings.setSound(!sound)}>
              <PixelIcon name={sound ? "speaker" : "mute"} size={18} />
              <span>{sound ? t("pause.soundOn") : t("pause.soundOff")}</span>
              <i className={`pause-switch ${sound ? "on" : ""}`} aria-hidden="true" />
            </button>
          )}
          {onHelp && (
            <button className="pause-row" onClick={onHelp}>
              <PixelIcon name="book" size={16} />
              <span>{t("pause.help")}</span>
            </button>
          )}
          {onMenu && (
            <button className="pause-row quiet" onClick={onMenu}>
              <PixelIcon name="home" size={18} />
              <span>{t("pause.menu")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
