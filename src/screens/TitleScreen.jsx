import React from "react";
import { ChevronRight, Sprout } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { HeroPicker } from "../ui/HeroPicker.jsx";
import { ArcadeGame, ArcadeMenu } from "../ui/arcade/Arcade.jsx";
import { PixelIcon } from "../ui/PixelIcon.jsx";

// Four big buttons, one under the other: New life, Continue, Arcade, How to play. A new life asks
// for your look and name right here before the language and story.
function TitleButton({ icon, label, hint, onClick, i }) {
  return (
    <button className="title-choice" onClick={onClick} aria-label={label} style={{ animationDelay: `${0.12 + i * 0.08}s` }}>
      <span className="title-choice-tile" aria-hidden="true">
        <PixelIcon name={icon} size={30} />
      </span>
      <span className="title-choice-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <ChevronRight className="title-choice-icon" size={22} aria-hidden="true" />
    </button>
  );
}

export function TitleScreen({ canContinue, onPlay, onNew, onHelp, settings, picking, onPicking, hero }) {
  const { t } = useT();
  const [arcade, setArcade] = React.useState(null); // null | "menu" | a game id
  const buttons = [
    { icon: "sprout", label: t("app.newLife"), hint: t("hero.newHint"), onClick: () => onPicking(true) },
    canContinue && { icon: "resume", label: t("app.continue"), hint: hero?.name, onClick: onPlay },
    { icon: "gamepad", label: t("arcade.title"), hint: t("app.arcadeHint"), onClick: () => setArcade("menu") },
    { icon: "book", label: t("app.howTo"), hint: t("app.howToHint"), onClick: onHelp },
  ].filter(Boolean);
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
        <nav className="title-actions" aria-label={t("app.menu")}>
          {buttons.map((b, i) => (
            <TitleButton key={b.icon} i={i} {...b} />
          ))}
        </nav>
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
