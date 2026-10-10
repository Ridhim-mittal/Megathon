import React from "react";
import { ArrowRight, Play, RotateCcw, Sprout, Sun } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { TopControls } from "../ui/Hud.jsx";

export function TitleScreen({ canContinue, onPlay, onNew, onHelp, settings }) {
  const { t } = useT();
  return (
    <div className="title-screen">
      <div className="title-vignette" />
      <div className="title-controls">
        <TopControls settings={settings} />
      </div>
      <div className="title-content">
        <div className="title-kicker">
          <span /> {t("app.kicker")} <span />
        </div>
        <div className="title-sprout">
          <Sprout size={43} />
        </div>
        <h1>
          lakshyam<span>.</span>
        </h1>
        <p className="title-tagline">{t("app.tagline")}</p>
        <div className="title-rule">✦</div>
        <p className="title-description">{t("app.description")}</p>
        <button className="play-button" onClick={onPlay}>
          <Play size={23} fill="currentColor" />
          {canContinue ? t("app.continue") : t("app.play")}
          <span>
            <ArrowRight size={20} />
          </span>
        </button>
        {canContinue && (
          <button className="title-help" onClick={onNew}>
            <RotateCcw size={13} /> {t("app.newLife")}
          </button>
        )}
        <button className="title-help" onClick={onHelp}>
          {t("app.howToPlay")}
        </button>
      </div>
      <span className="title-bottom">
        <Sun size={14} /> {t("app.made")}
      </span>
      <span className="title-version">{t("app.chapter")}</span>
    </div>
  );
}
