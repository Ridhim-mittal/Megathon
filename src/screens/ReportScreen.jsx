import React from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { select } from "../ui/gameAdapter.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

// The Gyaan report as a card collection: a ring with how many lessons you used, then each pillar
// as a little shelf of lesson cards, coloured by what happened.
const PILLARS = ["PLAN", "SAVE", "INVEST", "SAFE"];
const PILLAR_ICON = { PLAN: "🗺️", SAVE: "🏺", INVEST: "🌱", SAFE: "🛡️" };
const STATUS_ICON = { applied: "★", seen: "👀", missed: "↺", unseen: "🔒" };

export function ReportScreen({ life, settings, onNext, onMenu }) {
  const { t, pick } = useT();
  const report = select.lessonReport(life);
  const total = report.lessons.length || 24;
  const applied = report.totals.applied;
  const pct = Math.round((applied / total) * 100);
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("report.eyebrow")} title={t("report.title")} className="report-v2" wide>
        <div className="report-hero">
          <div className="report-ring" style={{ "--p": pct }} role="img" aria-label={t("report.ring", { n: applied, total })}>
            <b>{applied}</b>
            <small>/ {total}</small>
          </div>
          <div className="report-hero-text">
            <p>{t("report.ringText", { n: applied })}</p>
            <div className="report-totals">
              {["applied", "seen", "missed"].map((s) => (
                <span key={s} className={`status-pill status-${s}`}>
                  {STATUS_ICON[s]} {t(`report.status.${s}`)} <b>{report.totals[s]}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="report-shelves">
          {PILLARS.map((p, pi) => (
            <section key={p} className={`shelf pillar-${p}`} style={{ animationDelay: `${0.1 + pi * 0.1}s` }}>
              <h2>
                <span aria-hidden="true">{PILLAR_ICON[p]}</span> {t(`report.pillar.${p}`)}
              </h2>
              <ul>
                {report.lessons
                  .filter((l) => l.pillar === p)
                  .map((l) => (
                    <li key={l.id} className={`lesson-card status-${l.status}`} title={t(`report.status.${l.status}`)}>
                      <i aria-hidden="true">{STATUS_ICON[l.status]}</i>
                      <span>{pick(l.title)}</span>
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
