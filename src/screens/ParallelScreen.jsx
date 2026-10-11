import React, { useEffect, useState } from "react";
import { ArrowRight, GitBranch, LayoutGrid, RotateCcw } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { select } from "../ui/gameAdapter.js";
import { turningPointSearch } from "../ui/turningPoints.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

function LifeColumn({ title, life, summary, className }) {
  const { t, money } = useT();
  return (
    <section className={`life-column ${className}`}>
      <h2>{title}</h2>
      <dl>
        <div>
          <dt>{t("parallel.ending")}</dt>
          <dd>{summary.ending ? t(`ending.title.${summary.ending.id}`) : "—"}</dd>
        </div>
        <div>
          <dt>{t("parallel.netWorth")}</dt>
          <dd>{money(summary.netWorth)}</dd>
        </div>
        <div>
          <dt>{t("parallel.debt")}</dt>
          <dd>{money(summary.debt)}</dd>
        </div>
        <div>
          <dt>{t("parallel.dream")}</dt>
          <dd>{summary.dream.reached ? t("hud.reached") : `${summary.dream.pct}%`}</dd>
        </div>
        {["joy", "health", "family", "gyaan"].map((m) => (
          <div key={m}>
            <dt>{t(`meter.${m}`)}</dt>
            <dd>{summary.meters[m]}</dd>
          </div>
        ))}
      </dl>
      <svg className="nw-spark" viewBox="0 0 260 60" aria-hidden="true">
        {(() => {
          const ys = summary.years.map((y) => y.netWorth);
          const lo = Math.min(0, ...ys);
          const hi = Math.max(1, ...ys);
          const pts = ys.map((v, i) => `${(i / Math.max(1, ys.length - 1)) * 256 + 2},${56 - ((v - lo) / (hi - lo)) * 52}`).join(" ");
          return <polyline points={pts} fill="none" strokeWidth="2.5" />;
        })()}
      </svg>
      <span className="sr-only">{life.age}</span>
    </section>
  );
}

// Only the turning points: the decisions where another choice would have changed the life a lot
// (see turningPoints.js). Finding them lives every other option once, a few at a time.
export function ParallelScreen({ life, parallel, onParallel, settings, onGallery, onMenu }) {
  const { t, pick, plain, signed } = useT();
  const [points, setPoints] = useState(null);
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState(null);
  const cmp = parallel ? select.compare(life, parallel) : null;

  useEffect(() => {
    const search = turningPointSearch(life);
    let timer;
    const tick = () => {
      const finished = search.step(3);
      setProgress(search.total ? Math.round((search.done / search.total) * 100) : 100);
      if (finished) setPoints(search.result());
      else timer = setTimeout(tick, 0);
    };
    timer = setTimeout(tick, 30);
    return () => clearTimeout(timer);
  }, [life]);

  // "Your dream came true, on time · +₹8,20,000"; the story's ending when only that changes; else
  // the money and the dream.
  const effect = (o) =>
    o.endingChanged && o.ending
      ? `${t(`ending.title.${o.ending}`)} · ${signed(o.nw)}`
      : o.storyChanged && o.storyTitle
        ? `${pick(o.storyTitle)}${Math.abs(o.nw) >= 1000 ? ` · ${signed(o.nw)}` : ""}`
        : `${signed(o.nw)} · ${t("parallel.dreamDelta", { n: `${o.dream > 0 ? "+" : ""}${o.dream}%` })}`;

  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("parallel.eyebrow")} title={t("parallel.title")} subtitle={t("parallel.subtitle")} wide>
        {!cmp && !points && (
          <p className="quiet" role="status">
            {t("parallel.searching", { n: progress })}
          </p>
        )}
        {!cmp && points?.length === 0 && <p className="quiet">{t("parallel.none")}</p>}
        {!cmp && points?.length > 0 && (
          <ol className="timeline turning-points">
            {points.map((d) => (
              <li key={d.index} className={picked === d.index ? "open" : ""}>
                <button className="timeline-item" aria-expanded={picked === d.index} onClick={() => setPicked(picked === d.index ? null : d.index)}>
                  <span className="t-age">{t("common.age", { age: d.age })}</span>
                  <span className="t-title">
                    {plain(d.title)}
                    <em className={`tp-tag ${d.top.nw >= 0 ? "better" : "worse"}`}>{t(d.top.nw >= 0 ? "parallel.better" : "parallel.worse")}</em>
                  </span>
                  <span className="t-chosen">
                    {t("parallel.you")}: <b>{plain(d.chosen.label)}</b>
                  </span>
                  <span className={`t-effect ${d.top.nw >= 0 ? "better" : "worse"}`}>
                    {t("parallel.otherChoice")} {effect(d.top)}
                  </span>
                </button>
                {picked === d.index && (
                  <div className="timeline-alts">
                    <span>{t("parallel.instead")}</span>
                    {d.options.map((o) => (
                      <button key={o.id} className="secondary-button" onClick={() => onParallel(o.parallel)}>
                        <GitBranch size={15} /> {plain(o.label)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {cmp && (
          <>
            <div className="parallel-grid">
              <LifeColumn title={t("parallel.original")} life={life} summary={cmp.original} className="original" />
              <LifeColumn title={t("parallel.parallel")} life={parallel} summary={cmp.parallel} className="parallel" />
            </div>
            <section className="lessons-differ">
              <h2>{t("parallel.lessons")}</h2>
              {cmp.lessonsDiffer.length ? (
                <ul>
                  {cmp.lessonsDiffer.map((l) => (
                    <li key={l.id}>
                      <b>{pick(l.title)}</b>: {t(`report.status.${l.original}`)} → {t(`report.status.${l.parallel}`)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="quiet">{t("parallel.noLessons")}</p>
              )}
            </section>
          </>
        )}
        <div className="action-row">
          {cmp ? (
            <button className="text-button" onClick={() => onParallel(null)}>
              <RotateCcw size={15} /> {t("parallel.another")}
            </button>
          ) : (
            <span />
          )}
          <button className="primary-button big" onClick={onGallery}>
            <LayoutGrid size={17} /> {t("parallel.gallery")} <ArrowRight size={18} />
          </button>
        </div>
      </Sheet>
    </>
  );
}
