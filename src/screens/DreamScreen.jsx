import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bike, Check, GraduationCap, HeartHandshake, Home, Store, TrendingUp } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { goalCost, goals } from "../ui/gameAdapter.js";
import { ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

export const GOAL_ICONS = { house: Home, business: Store, education: GraduationCap, vehicle: Bike, parents: HeartHandshake };
const WALK = [1, 0, 2, 0];

// You stand on the left, dreaming; tap a dream and it appears in your thought bubble with its story.
export function DreamScreen({ settings, avatar = "boy", playerName = "", onStart, onBack, onMenu }) {
  const { t, pick, money } = useT();
  const [goalId, setGoalId] = useState(null);
  const [tick, setTick] = useState(0);
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
    const id = setInterval(() => setTick((n) => n + 1), 240);
    return () => clearInterval(id);
  }, []);

  const list = goals();
  const goal = list.find((g) => g.id === goalId);
  const GoalIcon = goal ? GOAL_ICONS[goal.id] ?? Home : null;

  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <main className="sheet sheet-wide dream-fun">
        <span className="dream-ribbon">{t("dream.eyebrow")}</span>

        <div className="dream-top">
          <div className={`dream-hero ${goal ? "has-dream" : ""}`}>
            <span className={`dream-thought goal-${goal?.id ?? "none"}`} key={goalId ?? "none"} aria-hidden="true">
              {GoalIcon ? <GoalIcon size={30} strokeWidth={2.2} /> : <b>?</b>}
            </span>
            <span className="dream-thought-dot d1" aria-hidden="true" />
            <span className="dream-thought-dot d2" aria-hidden="true" />
            <span className="dream-hero-glow" aria-hidden="true" />
            <PixelPortrait role="player" avatar={avatar} stage="child" frame={goal ? WALK[tick % 4] : 0} />
            <span className="dream-you">{playerName || t("dream.namePlaceholder")}</span>
          </div>
          <div className="dream-heading">
            <h1 ref={heading} tabIndex={-1}>
              {t("dream.title")}
            </h1>
            <p>{t("dream.subtitle")}</p>
          </div>
        </div>

        <div className="dream-grid" role="radiogroup" aria-label={t("dream.title")}>
          {list.map((g, i) => {
            const Icon = GOAL_ICONS[g.id] ?? Home;
            const on = goalId === g.id;
            return (
              <button
                key={g.id}
                role="radio"
                aria-checked={on}
                className={`dream-tile goal-${g.id} ${on ? "selected" : ""}`}
                style={{ animationDelay: `${0.06 * i + 0.1}s` }}
                onClick={() => setGoalId(g.id)}
              >
                {on && (
                  <span className="dream-check" aria-hidden="true">
                    <Check size={14} strokeWidth={3.5} />
                  </span>
                )}
                <span className="dream-tile-icon">
                  <Icon size={30} strokeWidth={2} />
                </span>
                <strong>{pick(g.title)}</strong>
                <span className="dream-cost">{money(goalCost(g.id))}</span>
              </button>
            );
          })}
        </div>

        <div className={`dream-detail ${goal ? "on" : ""}`} aria-live="polite">
          {goal ? (
            <div key={goal.id} className="dream-detail-in">
              <p>{pick(goal.description)}</p>
              <p className="dream-note">
                <TrendingUp size={14} aria-hidden="true" /> {t("dream.cost", { amount: money(goalCost(goal.id)) })} · {t("dream.costNote")}
              </p>
            </div>
          ) : (
            <p className="dream-hint">{t("dream.pick")}</p>
          )}
        </div>

        <div className="dream-start">
          <button className="text-button" onClick={onBack}>
            <ArrowLeft size={15} /> {t("common.back")}
          </button>
          <button className={`primary-button big ${goal ? "ready" : ""}`} disabled={!goalId} onClick={() => onStart({ goalId })}>
            {t("dream.start")} <ArrowRight size={18} />
          </button>
        </div>
      </main>
    </>
  );
}
