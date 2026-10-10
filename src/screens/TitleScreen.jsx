import React from "react";
import { Building2, Calculator, Play, Snowflake, Sparkles, Sprout, Sun } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { HeroPicker } from "../ui/HeroPicker.jsx";
import { InterestRace } from "../ui/games/InterestRace.jsx";
import { ArcadeGame } from "../ui/arcade/Arcade.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

// Continue and Start a new life sit side by side, the same size. A new life asks for your look and
// name right here before the language and story.
export function TitleScreen({ canContinue, onPlay, onNew, onTown, onHelp, settings, picking, onPicking, hero }) {
  const { t } = useT();
  const [playing, setPlaying] = React.useState(false);
  const [snow, setSnow] = React.useState(false);
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
        <div className={`title-actions ${canContinue ? "two" : "one"}`}>
          {canContinue && (
            <button className="title-choice continue" onClick={onPlay} aria-label={t("app.continue")}>
              <span className="title-choice-face" aria-hidden="true">
                <PixelPortrait role="player" avatar={hero?.avatar ?? "boy"} stage={hero?.stage ?? "child"} />
              </span>
              <span className="title-choice-text">
                <strong>{t("app.continue")}</strong>
                {hero?.name && <small>{hero.name}</small>}
              </span>
              <Play className="title-choice-icon" size={20} fill="currentColor" aria-hidden="true" />
            </button>
          )}
          <button className="title-choice new" onClick={() => onPicking(true)} aria-label={canContinue ? t("app.newLife") : t("app.play")}>
            <span className="title-choice-face pair" aria-hidden="true">
              <PixelPortrait role="player" avatar="boy" stage="child" />
              <PixelPortrait role="player" avatar="girl" stage="child" />
            </span>
            <span className="title-choice-text">
              <strong>{canContinue ? t("app.newLife") : t("app.play")}</strong>
              <small>{t("hero.newHint")}</small>
            </span>
            <Sparkles className="title-choice-icon" size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="title-extras">
          <button className="title-game" onClick={() => setPlaying(true)}>
            <Calculator size={16} aria-hidden="true" /> {t("interest.menu")}
          </button>
          <button className="title-game snow" onClick={() => setSnow(true)}>
            <Snowflake size={16} aria-hidden="true" /> {t("arcade.snowMenu")}
          </button>
          <button className="title-game town" onClick={onTown}>
            <Building2 size={16} aria-hidden="true" /> {t("app.town")}
          </button>
        </div>
        <button className="title-help" onClick={onHelp}>
          {t("app.howToPlay")}
        </button>
      </div>
      <span className="title-bottom">
        <Sun size={14} /> {t("app.made")}
      </span>
      <span className="title-version">{t("app.chapter")}</span>
      {snow && (
        <div className="ir-layer" role="dialog" aria-modal="true" aria-label={t("arcade.snowMenu")}>
          <section className="game-window window-arcade title-arcade">
            <ArcadeGame gameId="snowball" onClose={() => setSnow(false)} />
          </section>
        </div>
      )}
      {playing && <InterestRace mode="practice" avatar={hero?.avatar ?? "boy"} onClose={() => setPlaying(false)} />}
      {picking && <HeroPicker initialAvatar={hero?.pickAvatar} initialName={hero?.pickName} onClose={() => onPicking(false)} onDone={onNew} />}
    </div>
  );
}
