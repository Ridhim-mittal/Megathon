import React, { useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { GAME_NAME } from "../../ui/games/choiceGames.js";
import { PixelIcon } from "../../ui/PixelIcon.jsx";

const ICON = { snake: "snake", snowball: "snowflake", swipe: "bag", patang: "kite", rush: "car", interest: "calc", fineprint: "magnifier", garden: "sprout", flood: "wave" };

// Before the question: "Play X to understand Y". The choices come after the game.
export function PreGameCard({ kind, lessonId, onStart, onSkip }) {
  const { t } = useT();
  const start = useRef(null);
  useEffect(() => start.current?.focus(), []);
  return (
    <div className="view pregame">
      <span className="pregame-ribbon">{t("pregame.eyebrow")}</span>
      <span className="pregame-screen" aria-hidden="true">
        <PixelIcon name={ICON[kind] ?? "star"} size={60} />
      </span>
      <h2>{t("pregame.play", { game: t(GAME_NAME[kind]) })}</h2>
      {lessonId && (
        <p className="pregame-learn">
          <small>{t("pregame.understand")}</small>
          <b>
            <PixelIcon name="bulb" size={16} /> {t(`lessonTag.${lessonId}`)}
          </b>
        </p>
      )}
      <button ref={start} className="primary-button big pregame-go" onClick={onStart}>
        <Play size={18} fill="currentColor" /> {t("pregame.start")}
      </button>
      <button className="text-button pregame-skip" onClick={onSkip}>
        {t("pregame.skip")}
      </button>
    </div>
  );
}
