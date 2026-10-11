import React from "react";
import { BookOpen, Building2, Gamepad2, Play, Sparkles, Sprout } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { HeroPicker } from "../ui/HeroPicker.jsx";
import { ArcadeGame, ArcadeMenu } from "../ui/arcade/Arcade.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

// Continue and Start a new life sit side by side, the same size. A new life asks for your look and
// name right here before the language and story.
export function TitleScreen({ canContinue, onPlay, onNew, onTown, onHelp, settings, picking, onPicking, hero }) {
  const { t } = useT();
  const [arcade, setArcade] = React.useState(null); // null | "menu" | a game id
  return (
    <div className="title-screen">
      <div className="title-vignette" />
      <div className="title-controls">
        <TopControls settings={settings} />
      </div>
      <div className="title-content">
        <div className="title-sprout">
          <Sprout size={64} strokeWidth={2.2} />
        </div>
        <h1>
          lakshyam<span>.</span>
        </h1>
        <p className="title-tagline">{t("app.tagline")}</p>
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
          <button className="title-game title-arcade-btn" onClick={() => setArcade("menu")}>
            <Gamepad2 size={16} aria-hidden="true" /> {t("arcade.title")}
          </button>
          <button className="title-game town" onClick={onTown}>
            <Building2 size={16} aria-hidden="true" /> {t("app.town")}
          </button>
        </div>
        <button className="title-help title-howto" onClick={onHelp}>
          <span className="title-howto-icon" aria-hidden="true">
            <BookOpen size={18} />
          </span>
          {t("app.howToPlay")}
        </button>
      </div>
      {arcade && (
        <div className="dialog-layer title-arcade">
          <section className="game-window window-arcade">
            {arcade === "menu" ? (
              <ArcadeMenu onPick={setArcade} onClose={() => setArcade(null)} avatar={hero?.avatar ?? "boy"} />
            ) : (
              <ArcadeGame key={arcade} gameId={arcade} onBack={() => setArcade("menu")} onClose={() => setArcade(null)} />
            )}
          </section>
        </div>
      )}
      {picking && <HeroPicker initialAvatar={hero?.pickAvatar} initialName={hero?.pickName} onClose={() => onPicking(false)} onDone={onNew} />}
    </div>
  );
}
