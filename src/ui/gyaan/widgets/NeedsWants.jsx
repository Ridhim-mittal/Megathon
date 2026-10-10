import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Result } from "./kit.jsx";

// The first four items are needs, the rest wants (same order in every language).
const NEEDS = 4;

export function NeedsWants({ lang }) {
  const g = textFor(lang);
  const items = g("nw_items");
  const [answers, setAnswers] = useState(() => items.map(() => null));
  const [checked, setChecked] = useState(false);
  const right = answers.filter((a, i) => a === (i < NEEDS ? "need" : "want")).length;
  const set = (i, v) => {
    setChecked(false);
    setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
  };
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("nw_title")}</h4>
      <p className="gy-help">{g("nw_help")}</p>
      <ul className="gy-sort">
        {items.map((item, i) => {
          const truth = i < NEEDS ? "need" : "want";
          const ok = answers[i] === truth;
          return (
            <li key={item} className={checked ? (ok ? "is-ok" : "is-bad") : ""}>
              <span className="gy-sort-item">
                {checked && <span aria-hidden="true">{ok ? "✓ " : "✗ "}</span>}
                {item}
                {checked && !ok && <span className="gy-sort-tip"> {g(truth === "need" ? "nw_tip_need" : "nw_tip_want")}</span>}
              </span>
              <span className="gy-sort-btns" role="group" aria-label={item}>
                {["need", "want"].map((v) => (
                  <button key={v} type="button" aria-pressed={answers[i] === v} className={answers[i] === v ? "is-on" : ""} onClick={() => set(i, v)}>
                    {g(v === "need" ? "nw_need" : "nw_want")}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="gy-actions">
        <button type="button" className="gy-btn" disabled={answers.some((a) => a == null)} onClick={() => setChecked(true)}>
          {g("check")}
        </button>
        <button
          type="button"
          className="gy-btn gy-btn-alt"
          onClick={() => {
            setAnswers(items.map(() => null));
            setChecked(false);
          }}
        >
          {g("reset")}
        </button>
      </div>
      {checked && <Result tone={right === items.length ? "good" : undefined}>{g("nw_score", { right, total: items.length })}</Result>}
    </div>
  );
}
