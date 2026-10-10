import React from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { select } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

const PILLARS = ["PLAN", "SAVE", "INVEST", "SAFE"];

export function ReportScreen({ life, settings, onNext, onMenu }) {
  const { t, pick } = useT();
  const report = select.lessonReport(life);
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("report.eyebrow")} title={t("report.title")} subtitle={t("report.cards", { n: report.gyaanCards })} wide>
        <div className="report-totals">
          {["applied", "seen", "missed"].map((s) => (
            <span key={s} className={`status-pill status-${s}`}>
              {t(`report.status.${s}`)} <b>{report.totals[s]}</b>
            </span>
          ))}
        </div>
        <div className="report-grid">
          {PILLARS.map((p) => (
            <section key={p} className={`pillar pillar-${p}`}>
              <h2>{t(`report.pillar.${p}`)}</h2>
              <div className="pillar-bar" aria-hidden="true">
                {["applied", "seen", "missed"].map((s) => (
                  <i key={s} className={`seg-${s}`} style={{ flex: report.pillars[p][s] }} />
                ))}
              </div>
              <ul>
                {report.lessons
                  .filter((l) => l.pillar === p)
                  .map((l) => (
                    <li key={l.id} className={`lesson-row status-${l.status}`}>
                      <span className="lesson-id">{l.id}</span>
                      <span className="lesson-name">{pick(l.title)}</span>
                      <span className="lesson-status">{t(`report.status.${l.status}`)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="action-row">
          <span />
          <button className="primary-button big" onClick={onNext}>
            {t("report.next")} <ArrowRight size={18} />
          </button>
        </div>
      </Sheet>
    </>
  );
}
