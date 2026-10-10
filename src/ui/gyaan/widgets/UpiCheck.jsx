import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Result } from "./kit.jsx";

// Only paying needs a PIN. Every "receive" that asks for one is a trap.
const NEEDS_PIN = [true, false, false, false];

export function UpiCheck({ lang }) {
  const g = textFor(lang);
  const cases = g("upi_cases");
  const explain = g("upi_explain");
  const [answers, setAnswers] = useState(() => cases.map(() => null));
  const done = answers.every((a) => a != null);
  const right = answers.filter((a, i) => a === NEEDS_PIN[i]).length;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("upi_title")}</h4>
      <p className="gy-help">{g("upi_help")}</p>
      <ol className="gy-cases">
        {cases.map((c, i) => {
          const a = answers[i];
          const ok = a === NEEDS_PIN[i];
          return (
            <li key={c} className={a == null ? "" : ok ? "is-ok" : "is-bad"}>
              <p className="gy-case-text">{c}</p>
              <div className="gy-sort-btns" role="group" aria-label={c}>
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={a === v}
                    className={a === v ? "is-on" : ""}
                    onClick={() => setAnswers((x) => x.map((y, j) => (j === i ? v : y)))}
                  >
                    {g(v ? "upi_pin" : "upi_nopin")}
                  </button>
                ))}
              </div>
              {a != null && (
                <p className="gy-case-explain" role="status">
                  <b>{ok ? g("correct") : g("wrong")}</b> {explain[i]}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {done && <Result tone={right === cases.length ? "good" : undefined}>{g("nw_score", { right, total: cases.length })}</Result>}
      <p className="gy-rule">{g("upi_rule")}</p>
    </div>
  );
}
