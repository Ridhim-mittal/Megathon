import React from "react";
import { ArrowRight, Lock } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { goals } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { GOAL_ICONS } from "./DreamScreen.jsx";

const ENDINGS = ["dream_on_time", "dream_with_debt", "dream_close", "secure_no_dream", "debt_trap"];

export function GalleryScreen({ endings, settings, onPlayAgain, onMenu }) {
  const { t, pick } = useT();
  const found = new Set(endings.map((e) => e.id));
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet
        eyebrow={t("gallery.eyebrow")}
        title={t("gallery.title")}
        subtitle={t("gallery.subtitle", { n: found.size, total: ENDINGS.length })}
        wide
      >
        <ul className="gallery-grid">
          {ENDINGS.map((id) => {
            const lives = endings.filter((e) => e.id === id);
            return (
              <li key={id} className={`gallery-card ending-${id} ${lives.length ? "found" : "locked"}`}>
                <strong>{lives.length ? t(`ending.title.${id}`) : t("gallery.locked")}</strong>
                {lives.length ? (
                  <span className="gallery-goals">
                    {lives.map((e) => {
                      const Icon = GOAL_ICONS[e.goalId];
                      const g = goals().find((x) => x.id === e.goalId);
                      return (
                        <span key={e.goalId} title={pick(g?.title)} className="goal-chip">
                          {Icon && <Icon size={14} aria-hidden="true" />} {pick(g?.title)}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <Lock size={20} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
        <div className="action-row">
          <span />
          <button className="primary-button big" onClick={onPlayAgain}>
            {t("gallery.playAgain")} <ArrowRight size={18} />
          </button>
        </div>
      </Sheet>
    </>
  );
}
