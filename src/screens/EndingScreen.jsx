import React, { useState } from "react";
import { ArrowRight, Eye, Route, ShieldAlert } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { goals, select, storyline } from "../ui/gameAdapter.js";
import { PixelPortrait as Portrait } from "../ui/PixelPortrait.jsx";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { GOAL_ICONS } from "./DreamScreen.jsx";
import { StoryEnding } from "./story/StoryEnding.jsx";

export function EndingScreen({ life, settings, onNext, onMenu }) {
  const { t, pick, rich, money, castName } = useT();
  const ending = select.ending(life);
  const [revealed, setRevealed] = useState(false);
  const goal = goals().find((g) => g.id === life.goalId);
  const Icon = GOAL_ICONS[life.goalId];
  const rival = storyline(life.storylineId)?.rival;
  if (!ending) return null;
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("ending.eyebrow")} title={t(`ending.title.${ending.id}`)} className={`ending-sheet ending-${ending.id}`} wide>
        {/* Story mode: the ending the choices led to comes first; the money ending follows. */}
        <StoryEnding life={life} />
        <div className="ending-hero">
          <span className="ending-badge">{Icon && <Icon size={34} />}</span>
          <div>
            <strong>{pick(goal?.title)}</strong>
            <p className="ending-stats">
              {t("ending.stats", { pct: ending.pct, netWorth: money(ending.netWorth), debt: money(ending.debt) })}
            </p>
          </div>
        </div>
        {/* secure_no_dream text describes a safety net; with no_safety_net its own text replaces it. */}
        {ending.text && !(ending.modifiers.includes("no_safety_net") && ending.modifierTexts?.no_safety_net) && (
          <p className="ending-text">{rich(ending.text)}</p>
        )}
        {ending.modifiers.map((m) => (
          <section key={m} className={`ending-modifier mod-${m}`}>
            <h2>
              {m === "wrong_path" ? <Route size={18} /> : <ShieldAlert size={18} />} {t(`ending.modifier.${m}`)}
            </h2>
            {ending.modifierTexts?.[m] && <p>{rich(ending.modifierTexts[m])}</p>}
          </section>
        ))}
        {rival?.milestones?.length > 0 && (
          <details className="rival">
            <summary>
              <Portrait role={rival.roleId ?? "friend"} age={36} />
              {t("ending.rival", { name: castName(rival.roleId ?? "friend") })}
            </summary>
            <ol>
              {rival.milestones.map((m) => (
                <li key={m.age}>
                  <b>{t("common.age", { age: m.age })}</b> {rich(m.text)}
                </li>
              ))}
            </ol>
          </details>
        )}
        {ending.storyteller && (
          <section className={`storyteller ${revealed ? "revealed" : ""}`}>
            <h2>{t("ending.storyteller")}</h2>
            {revealed ? (
              <div className="storyteller-reveal">
                <Portrait role="sibling" age={36} />
                <p>{rich(ending.storyteller)}</p>
              </div>
            ) : (
              <button className="secondary-button" onClick={() => setRevealed(true)}>
                <Eye size={16} /> {t("ending.reveal")}
              </button>
            )}
          </section>
        )}
        <div className="action-row">
          <span />
          <button className="primary-button big" onClick={onNext}>
            {t("ending.next")} <ArrowRight size={18} />
          </button>
        </div>
      </Sheet>
    </>
  );
}
