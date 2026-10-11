import React from "react";
import { useT } from "../i18n/index.jsx";
import { lessonInfo } from "./gameAdapter.js";
import { PILLAR_PIXEL, PixelIcon } from "./PixelIcon.jsx";

// The lesson of the current scene, as a panel in the top bar: a numbered tile like the chapter
// tile, the word "Lesson" and four or five words, with the pillar's little pixel icon.
export function LessonBadge({ lessonId }) {
  const { t } = useT();
  if (!lessonId) return null;
  const pillar = lessonInfo(lessonId)?.pillar ?? "PLAN";
  const n = Number(lessonId.slice(1));
  return (
    <div className={`hud-panel lesson-badge pillar-${pillar}`} key={lessonId} role="status" aria-label={`${t("lessonBadge.label")} ${n}: ${t(`lessonTag.${lessonId}`)}`}>
      <span className="lesson-badge-num" aria-hidden="true">
        {n}
      </span>
      <span className="lesson-badge-text" aria-hidden="true">
        <small>{t("lessonBadge.label")}</small>
        <strong>{t(`lessonTag.${lessonId}`)}</strong>
      </span>
      <PixelIcon name={PILLAR_PIXEL[pillar]} size={18} />
    </div>
  );
}
