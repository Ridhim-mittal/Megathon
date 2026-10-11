import React from "react";
import { ArrowLeft, ArrowRight, Building2, Home, Lock, Sprout, Trees } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { storylines } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

// Each life is a little scene: who you live with, and where. One line of text, three chips.
const SCENE = {
  village: { cast: ["mentor", "sibling"], props: [Home, Trees, Sprout] },
  city: { cast: ["father", "mother"], props: [Building2, Building2, Building2] },
};

export function StorylineScreen({ settings, avatar = "boy", onPick, onBack, onMenu }) {
  const { t, pick } = useT();
  const list = storylines().sort((a, b) => Number(b.playable) - Number(a.playable));
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("storyline.eyebrow")} title={t("storyline.title")} wide>
        <div className="storyline-grid">
          {list.map((s, i) => {
            const scene = SCENE[s.id] ?? SCENE.village;
            const chips = t(`storyline.chips.${s.id}`);
            return (
              <article key={s.id} className={`storyline-card life-${s.id} ${s.playable ? "" : "locked"}`} style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                <div className={`storyline-art art-${s.id}`} aria-hidden="true">
                  <span className="sl-sun" />
                  <span className="sl-cloud" />
                  <span className="sl-props">
                    {scene.props.map((Icon, k) => (
                      <Icon key={k} size={k === 0 ? 40 : 30} strokeWidth={1.8} />
                    ))}
                  </span>
                  <span className="sl-people">
                    <PixelPortrait role={scene.cast[0]} />
                    <PixelPortrait role="player" avatar={avatar} stage="child" />
                    <PixelPortrait role={scene.cast[1]} />
                  </span>
                  {!s.playable && (
                    <span className="sl-soon">
                      <Lock size={14} /> {t("storyline.comingSoon")}
                    </span>
                  )}
                </div>
                <h2>{pick(s.title)}</h2>
                <p className="storyline-tagline">{pick(s.tagline)}</p>
                {Array.isArray(chips) && (
                  <ul className="sl-chips">
                    {chips.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {s.playable && (
                  <button className="primary-button big sl-go" onClick={() => onPick(s.id)}>
                    {t("storyline.play")} <ArrowRight size={18} />
                  </button>
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
