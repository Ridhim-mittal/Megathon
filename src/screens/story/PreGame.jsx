import React, { useEffect, useRef } from "react";
import { Calculator, CarFront, FileSearch, Flower2, Gamepad2, Play, ShoppingBag, Snowflake, Waves, Weight, Wind } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { GAME_NAME } from "../../ui/games/choiceGames.js";

const ICON = { snake: Weight, snowball: Snowflake, swipe: ShoppingBag, patang: Wind, rush: CarFront, interest: Calculator, fineprint: FileSearch, garden: Flower2, flood: Waves };

// Before the question: "Play X to understand Y". The choices come after the game.
export function PreGameCard({ kind, lessonId, sceneTitle, onStart, onSkip }) {
  const { t } = useT();
  const start = useRef(null);
  useEffect(() => start.current?.focus(), []);
  const Icon = ICON[kind] ?? Gamepad2;
  return (
    <div className="view pregame">
      <span className="pregame-eyebrow">{t("pregame.eyebrow")}</span>
      <span className="pregame-icon" aria-hidden="true">
        <Icon size={46} />
      </span>
      <h2>{t("pregame.play", { game: t(GAME_NAME[kind]) })}</h2>
      {lessonId && (
        <p className="pregame-why">
          {t("pregame.understand")} <b>{t(`lessonTag.${lessonId}`)}</b>
        </p>
      )}
      {sceneTitle && <p className="pregame-scene">{t("pregame.then", { scene: sceneTitle })}</p>}
      <button ref={start} className="primary-button big pregame-go" onClick={onStart}>
        <Play size={18} fill="currentColor" /> {t("pregame.start")}
      </button>
      <button className="text-button pregame-skip" onClick={onSkip}>
        {t("pregame.skip")}
      </button>
    </div>
  );
}
