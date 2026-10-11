import React from "react";
import { useT } from "../i18n/index.jsx";
import { lessonInfo } from "./gameAdapter.js";

// The lesson this scene teaches, at the top of the screen: a number and four or five words.
const PILLAR_ICON = { PLAN: "🗺️", SAVE: "🏺", INVEST: "🌱", SAFE: "🛡️" };

export function LessonBadge({ lessonId }) {
  const { t } = useT();
  if (!lessonId) return null;
  const pillar = lessonInfo(lessonId)?.pillar ?? "PLAN";
  return (
    <div className={`lesson-badge pillar-${pillar}`} key={lessonId} role="status" aria-label={`${t("lessonBadge.label")} ${lessonId.slice(1)}: ${t(`lessonTag.${lessonId}`)}`}>
      <span className="lesson-badge-num" aria-hidden="true">
        <small>{t("lessonBadge.short")}</small>
        {Number(lessonId.slice(1))}
      </span>
      <span className="lesson-badge-text" aria-hidden="true">
        {t(`lessonTag.${lessonId}`)}
      </span>
      <span className="lesson-badge-icon" aria-hidden="true">
        {PILLAR_ICON[pillar]}
      </span>
    </div>
  );
}
