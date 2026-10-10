import React from "react";
import { ArrowLeft, ArrowRight, Building2, Lock, Trees } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { storylines } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

const ICONS = { village: Trees, city: Building2 };

export function StorylineScreen({ settings, onPick, onBack, onMenu }) {
  const { t, pick } = useT();
  const list = storylines().sort((a, b) => Number(b.playable) - Number(a.playable));
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("storyline.eyebrow")} title={t("storyline.title")} subtitle={t("storyline.subtitle")} wide>
        <div className="storyline-grid">
          {list.map((s) => {
            const Icon = ICONS[s.id] ?? Trees;
            return (
              <article key={s.id} className={`storyline-card ${s.playable ? "" : "locked"}`}>
                <div className={`storyline-art art-${s.id}`} aria-hidden="true">
                  <Icon size={46} strokeWidth={1.4} />
                </div>
                <h2>{pick(s.title)}</h2>
                <p className="storyline-tagline">{pick(s.tagline)}</p>
                <p>{pick(s.persona)}</p>
                {s.playable ? (
                  <button className="primary-button" onClick={() => onPick(s.id)}>
                    {t("storyline.play")} <ArrowRight size={17} />
                  </button>
                ) : (
                  <span className="coming-soon">
                    <Lock size={14} /> {t("storyline.comingSoon")}
                  </span>
                )}
              </article>
            );
          })}
        </div>
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={15} /> {t("common.back")}
        </button>
      </Sheet>
    </>
  );
}
