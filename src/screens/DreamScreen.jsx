import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Bike, GraduationCap, HeartHandshake, Home, Store } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { goalCost, goals } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";
import { PixelPortrait } from "../ui/PixelPortrait.jsx";

export const GOAL_ICONS = { house: Home, business: Store, education: GraduationCap, vehicle: Bike, parents: HeartHandshake };

export function DreamScreen({ settings, initialName, onStart, onBack, onMenu }) {
  const { t, pick, money } = useT();
  const [goalId, setGoalId] = useState(null);
  const [name, setName] = useState(initialName ?? "");
  const [avatar, setAvatar] = useState("boy");
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("dream.eyebrow")} title={t("dream.title")} subtitle={t("dream.subtitle")} wide>
        <div className="goal-grid" role="radiogroup" aria-label={t("dream.title")}>
          {goals().map((g) => {
            const Icon = GOAL_ICONS[g.id] ?? Home;
            return (
              <button
                key={g.id}
                role="radio"
                aria-checked={goalId === g.id}
                className={`goal-card ${goalId === g.id ? "selected" : ""}`}
                onClick={() => setGoalId(g.id)}
              >
                <span className="goal-icon-badge">
                  <Icon size={26} />
                </span>
                <strong>{pick(g.title)}</strong>
                <span className="goal-desc">{pick(g.description)}</span>
                <small>{t("dream.cost", { amount: money(goalCost(g.id)) })}</small>
              </button>
            );
          })}
        </div>
        <p className="sheet-note">{t("dream.costNote")}</p>
        <div className="dream-start">
          <label className="name-field">
            <span>{t("dream.nameLabel")}</span>
            <input value={name} maxLength={20} placeholder={t("dream.namePlaceholder")} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="avatar-pick" role="radiogroup" aria-label={t("avatar.label")}>
            <span>{t("avatar.label")}</span>
            {["boy", "girl"].map((a) => (
              <button key={a} role="radio" aria-checked={avatar === a} className={`avatar-card ${avatar === a ? "selected" : ""}`} onClick={() => setAvatar(a)}>
                <PixelPortrait role="player" avatar={a} stage="child" />
                <small>{t(`avatar.${a}`)}</small>
              </button>
            ))}
          </div>
          <button className="text-button" onClick={onBack}>
            <ArrowLeft size={15} /> {t("common.back")}
          </button>
          <button className="primary-button big" disabled={!goalId} onClick={() => onStart({ goalId, playerName: name.trim(), avatar })}>
            {t("dream.start")} <ArrowRight size={18} />
          </button>
        </div>
      </Sheet>
    </>
  );
}
