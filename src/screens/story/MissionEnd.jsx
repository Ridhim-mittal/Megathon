import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Check, GitBranch, Newspaper, Skull, Sparkles, TrendingDown, TrendingUp, Trophy, TriangleAlert, Wallet } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { headlineText } from "../../ui/movements.js";
import { Flowchart } from "./Flowchart.jsx";

export const TONE_ICON = { good: Trophy, mixed: Check, bad: TriangleAlert, tragic: Skull };

// The end of a chapter: which outcome this life reached, the flowchart of what could have
// happened, and how the money moved.
export function MissionEnd({ summary, chart, placeName, last, onNext }) {
  const { t, pick, rich, money, signed } = useT();
  const [tab, setTab] = useState("flow");
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!summary?.story) return null;
  const o = summary.story;
  const Icon = TONE_ICON[o.tone] ?? Check;
  const s = summary;
  return (
    <div className={`view mission-end tone-${o.tone}`}>
      <div className="mission-result">
        <span className="result-icon" aria-hidden="true">
          <Icon size={30} />
        </span>
        <div>
          <span className="eyebrow">{t(`story.tone.${o.tone}`)}</span>
          <h2 ref={heading} tabIndex={-1}>
            {pick(o.title)}
          </h2>
          <p>{rich(o.text)}</p>
        </div>
      </div>
      <div className="mission-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "flow"} className={tab === "flow" ? "on" : ""} onClick={() => setTab("flow")}>
          <GitBranch size={15} /> {t("story.flowchart")}
        </button>
        <button role="tab" aria-selected={tab === "money"} className={tab === "money" ? "on" : ""} onClick={() => setTab("money")}>
          <Wallet size={15} /> {t("story.moneyYears")}
        </button>
      </div>
      {tab === "flow" && <Flowchart chart={chart} placeName={placeName} />}
      {tab === "money" && (
        <div className="mission-money">
          <dl className="year-stats">
            <div>
              <dt>{t("yearEnd.netWorth")}</dt>
              <dd>
                {money(s.netWorth)}
                <small className={s.netWorthChange >= 0 ? "up" : "down"}>
                  {s.netWorthChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {signed(s.netWorthChange)}
                </small>
              </dd>
            </div>
            <div className={s.debt > 0 ? "debt" : ""}>
              <dt>{t("yearEnd.debt")}</dt>
              <dd>{money(s.debt)}</dd>
            </div>
            <div>
              <dt>{t("yearEnd.savings")}</dt>
              <dd>{money(s.savings + s.investments)}</dd>
            </div>
            <div>
              <dt>{t("yearEnd.dream")}</dt>
              <dd>
                {t("chapter.dream", { from: s.dream.pct - s.dreamChange, to: s.dream.pct })}
                <span className="dream-bar mini" aria-hidden="true">
                  <i style={{ width: `${s.dream.pct}%` }} />
                </span>
              </dd>
            </div>
          </dl>
          <ol className="years-list">
            {s.years.map((y) => (
              <li key={y.age}>
                <b>{t("common.age", { age: y.age })}</b>
                <Newspaper size={13} aria-hidden="true" />
                <span>{headlineText(y.headline, { t, money })}</span>
                <small className={y.netWorthChange >= 0 ? "up" : "down"}>{signed(y.netWorthChange)}</small>
              </li>
            ))}
          </ol>
          {s.lessons.length > 0 && (
            <ul className="mission-lessons">
              {s.lessons.map((l) => (
                <li key={l.lesson} className={`status-${l.status}`}>
                  {l.status === "applied" ? <BadgeCheck size={14} /> : <Sparkles size={14} />} {l.lesson} · {t(`report.status.${l.status}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="action-row">
        <span />
        <button className="primary-button big" onClick={onNext}>
          {last ? t("story.final") : t("story.nextChapter")} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
