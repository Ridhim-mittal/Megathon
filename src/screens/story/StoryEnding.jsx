import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, GitBranch, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { loadDiscovered } from "../../ui/persist.js";
import { Flowchart } from "./Flowchart.jsx";
import { TONE_ICON } from "./MissionEnd.jsx";

// Story mode at 36: the ending this life's choices led to, each chapter's outcome, and the
// flowcharts of every chapter.
export function StoryEnding({ life }) {
  const { t, pick } = useT();
  const [open, setOpen] = useState(false);
  const story = select.story(life);
  const end = life.ending?.story;
  if (!story || !end) return null;
  return (
    <section className="story-journey">
      <h2 className="end-h">{t("ending.journey")}</h2>
      <ol className="journey">
        {story.missions.map((m, i) => {
          const MIcon = TONE_ICON[m.outcome?.tone] ?? Check;
          return (
            <li key={m.id} className={`tone-${m.outcome?.tone ?? "none"}`} style={{ animationDelay: `${0.15 + i * 0.1}s` }} title={m.outcome ? pick(m.outcome.title) : ""}>
              <span className="journey-stamp" aria-hidden="true">
                <MIcon size={20} />
              </span>
              <b>{pick(m.title)}</b>
              {m.outcome && <small>{pick(m.outcome.title)}</small>}
            </li>
          );
        })}
      </ol>
      <div className="journey-chips">
        <span className="journey-chip">{t("story.warnChip", { ignored: story.warnings.ignored, heeded: story.warnings.heeded })}</span>
        <button className="secondary-button" onClick={() => setOpen(true)}>
          <GitBranch size={16} /> {t("story.lifeFlowchart")}
        </button>
      </div>
      {/* A portal: the ending sheet would otherwise clip the full-screen chart. */}
      {open && createPortal(<LifeFlowchart life={life} onClose={() => setOpen(false)} />, document.querySelector(".game-shell") ?? document.body)}
    </section>
  );
}

export function LifeFlowchart({ life, onClose }) {
  const { t, pick } = useT();
  const missions = select.storyMissions();
  const [id, setId] = useState(missions[1]?.id ?? missions[0]?.id);
  const discovered = useMemo(loadDiscovered, []);
  const chart = select.flowchart(life, id, discovered);
  const placeName = (p) => t(`places.${p}`);
  return (
    <div className="phone-overlay life-flow" role="dialog" aria-modal="true" aria-label={t("story.lifeFlowchart")}>
      <div className="life-flow-card">
        <header>
          <GitBranch size={18} aria-hidden="true" />
          <h2>{t("story.lifeFlowchart")}</h2>
          <button className="panel-close" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </header>
        <nav className="mission-tabs" role="tablist">
          {missions.map((m) => (
            <button key={m.id} role="tab" aria-selected={id === m.id} className={id === m.id ? "on" : ""} onClick={() => setId(m.id)}>
              {pick(m.title)}
            </button>
          ))}
        </nav>
        <Flowchart key={id} chart={chart} placeName={placeName} />
      </div>
    </div>
  );
}
