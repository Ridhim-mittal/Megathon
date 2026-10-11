import React, { useState } from "react";
import { ArrowRight, Eye, Landmark, Wallet } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { goals, select, storyline } from "../ui/gameAdapter.js";
import { PixelPortrait as Portrait } from "../ui/PixelPortrait.jsx";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { GOAL_ICONS } from "./DreamScreen.jsx";
import { StoryEnding } from "./story/StoryEnding.jsx";

// Age 36: a little scene of the life you lived, three numbers, the chapters as stamps, and one
// piece of advice from Ammamma. Everything else is one tap away.
export function EndingScreen({ life, settings, onNext, onMenu }) {
  const { t, pick, rich, money, castName } = useT();
  const ending = select.ending(life);
  const [revealed, setRevealed] = useState(false);
  const goal = goals().find((g) => g.id === life.goalId);
  const Icon = GOAL_ICONS[life.goalId];
  const rival = storyline(life.storylineId)?.rival;
  if (!ending) return null;
  const story = life.ending?.story;
  const tone = story?.tone ?? (ending.id.startsWith("dream") ? "good" : ending.id === "debt_trap" ? "bad" : "mixed");
  const tip = ending.modifiers.map((m) => ending.modifierTexts?.[m]).find(Boolean) ?? ending.text;
  const hero = (
    <div className={`end-scene tone-${tone}`} aria-hidden="true">
      <span className="end-sun" />
      {tone === "good" && (
        <span className="end-confetti">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 8) * 0.25}s` }} />
          ))}
        </span>
      )}
      <span className="end-people">
        <Portrait role="mentor" />
        <Portrait role="player" avatar={life.avatar ?? "boy"} stage={life.stage ?? "adult"} />
        <Portrait role="sibling" />
      </span>
    </div>
  );
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("ending.eyebrow")} title={story ? pick(story.title) : t(`ending.title.${ending.id}`)} className={`ending-sheet end-v2 ending-${ending.id}`} top={hero} wide>
        {story && <p className="end-line">{rich(story.text)}</p>}

        <div className="end-stats">
          <div className="end-stat dream">
            <span className="end-stat-icon">{Icon && <Icon size={22} />}</span>
            <small>{pick(goal?.title)}</small>
            <b>{ending.pct}%</b>
            <span className="end-meter">
              <i style={{ width: `${Math.min(100, ending.pct)}%` }} />
            </span>
            <em>{t(`ending.title.${ending.id}`)}</em>
          </div>
          <div className="end-stat worth">
            <span className="end-stat-icon">
              <Wallet size={22} />
            </span>
            <small>{t("ending.statNet")}</small>
            <b>{money(ending.netWorth)}</b>
          </div>
          <div className={`end-stat debt ${ending.debt > 0 ? "has-debt" : ""}`}>
            <span className="end-stat-icon">
              <Landmark size={22} />
            </span>
            <small>{t("ending.statDebt")}</small>
            <b>{money(ending.debt)}</b>
          </div>
        </div>

        <StoryEnding life={life} />

        {tip && (
          <div className="end-tip">
            <span className="end-tip-face">
              <Portrait role="mentor" />
            </span>
            <p>
              <b>{t("ending.ammamma")}</b> {rich(tip)}
            </p>
          </div>
        )}

        <div className="end-extras">
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
          {ending.storyteller &&
            (revealed ? (
              <div className="storyteller-reveal">
                <Portrait role="sibling" age={36} />
                <p>{rich(ending.storyteller)}</p>
              </div>
            ) : (
              <button className="secondary-button" onClick={() => setRevealed(true)}>
                <Eye size={16} /> {t("ending.storyteller")}
              </button>
            ))}
        </div>

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
