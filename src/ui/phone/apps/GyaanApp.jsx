import React, { useState } from "react";
import { content, select } from "../../gameAdapter.js";
import { usePhoneText } from "../strings.js";
import { AppTitle } from "./shared.jsx";

// Market topics, in reading order, used when the content has no gyaan file yet.
const TOPIC_ORDER = [
  "share",
  "mutual_fund",
  "nav",
  "sip",
  "expense_ratio",
  "index_vs_active",
  "debt_fund",
  "diversification",
  "volatility_and_time",
  "panic_selling",
  "brokerage_and_kyc",
  "tips_scams",
];

const STATUS_MARK = { applied: "★", seen: "●", missed: "○", unseen: "🔒" };

export function GyaanApp({ life, openLesson }) {
  const { s, pick } = usePhoneText();
  const [tab, setTab] = useState("lessons");
  const report = select.lessonReport(life);
  const topics = content.gyaan?.topics ? Object.keys(content.gyaan.topics) : TOPIC_ORDER;
  const totals = report.lessons.reduce((a, l) => ({ ...a, [l.status]: (a[l.status] ?? 0) + 1 }), {});

  return (
    <div className="ph-app ph-gyaan">
      <AppTitle>{s("gyaan")}</AppTitle>
      <div className="ph-tabs" role="tablist" aria-label={s("gyaan")}>
        {["lessons", "topics"].map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ph-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`ph-panel-${id}`}
            className={`ph-tab${tab === id ? " is-on" : ""}`}
            onClick={() => setTab(id)}
          >
            {s(id)}
          </button>
        ))}
      </div>

      {tab === "lessons" ? (
        <div role="tabpanel" id="ph-panel-lessons" aria-labelledby="ph-tab-lessons">
          <p className="ph-muted">
            {s("progress", { applied: totals.applied ?? 0, seen: totals.seen ?? 0, total: report.lessons.length })}
          </p>
          <ul className="ph-list ph-lessons">
            {report.lessons.map((l) => {
              const title = pick(l.title);
              const locked = l.status === "unseen";
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`ph-lesson ph-st-${l.status}`}
                    disabled={locked}
                    onClick={() => openLesson(l.id, "lesson")}
                    aria-label={locked ? `${title}: ${s("lockedHint")}` : s("openLesson", { title })}
                  >
                    <span className="ph-lesson-mark" aria-hidden="true">{STATUS_MARK[l.status]}</span>
                    <span className="ph-lesson-text">
                      <span className="ph-lesson-title">{title}</span>
                      <span className="ph-lesson-status">{locked ? s("lockedHint") : s(`st_${l.status}`)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div role="tabpanel" id="ph-panel-topics" aria-labelledby="ph-tab-topics">
          <ul className="ph-list ph-lessons">
            {topics.map((id) => {
              const title = pick(content.gyaan?.topics?.[id]?.title) || id.replace(/_/g, " ");
              return (
                <li key={id}>
                  <button type="button" className="ph-lesson ph-st-topic" onClick={() => openLesson(id, "topic")} aria-label={s("openLesson", { title })}>
                    <span className="ph-lesson-mark" aria-hidden="true">✦</span>
                    <span className="ph-lesson-text">
                      <span className="ph-lesson-title">{title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
