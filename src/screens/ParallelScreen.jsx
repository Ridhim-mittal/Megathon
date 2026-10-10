import React, { useState } from "react";
import { ArrowRight, GitBranch, LayoutGrid, RotateCcw } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { replay, select } from "../ui/gameAdapter.js";
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

export function ParallelScreen({ life, parallel, onParallel, settings, onGallery, onMenu }) {
  const { t, pick, plain } = useT();
  const timeline = select.timeline(life).filter((d) => d.alternatives.length > 0);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const cmp = parallel ? select.compare(life, parallel) : null;

  function run(decisionIndex, choiceId) {
    setBusy(true);
    // Let the "living the other life" message paint before the replay runs.
    setTimeout(() => {
      try {
        onParallel(replay(life, { decisionIndex, choiceId }));
      } finally {
        setBusy(false);
      }
    }, 30);
  }

  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("parallel.eyebrow")} title={t("parallel.title")} subtitle={t("parallel.subtitle")} wide>
        {!cmp && (
          <ol className="timeline">
            {timeline.map((d) => (
              <li key={d.index} className={picked === d.index ? "open" : ""}>
                <button className="timeline-item" aria-expanded={picked === d.index} onClick={() => setPicked(picked === d.index ? null : d.index)}>
                  <span className="t-age">{t("common.age", { age: d.age })}</span>
                  <span className="t-title">{plain(d.title)}</span>
                  <span className="t-chosen">
                    {t("parallel.you")}: <b>{plain(d.chosen.label)}</b>
                  </span>
                </button>
                {picked === d.index && (
                  <div className="timeline-alts">
                    <span>{t("parallel.instead")}</span>
                    {d.alternatives.map((a) => (
                      <button key={a.id} className="secondary-button" disabled={busy} onClick={() => run(d.index, a.id)}>
                        <GitBranch size={15} /> {plain(a.label)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {busy && (
          <p className="quiet" role="status">
            {t("parallel.running")}
          </p>
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
