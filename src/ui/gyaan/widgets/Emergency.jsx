import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Result, Slider, money } from "./kit.jsx";

export function Emergency({ lang }) {
  const g = textFor(lang);
  const [expenses, setExpenses] = useState(8000);
  const [saved, setSaved] = useState(20000);
  const months = Math.floor((saved / expenses) * 10) / 10;
  const pct = Math.min(100, (months / 6) * 100);
  const ok = months >= 3;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("em_title")}</h4>
      <Slider label={g("em_expenses")} value={expenses} min={2000} max={30000} step={500} onChange={setExpenses} format={money} />
      <Slider label={g("em_saved")} value={saved} min={0} max={200000} step={2000} onChange={setSaved} format={money} />
      <div className="gy-meter" role="img" aria-label={g("em_months", { n: months })}>
        <div className={`gy-meter-fill${ok ? " is-ok" : ""}`} style={{ width: `${pct}%` }} />
        <span className="gy-meter-mark" style={{ left: "50%" }}>3</span>
        <span className="gy-meter-mark" style={{ left: "100%" }}>6</span>
      </div>
      <Result tone={ok ? "good" : "bad"}>{g("em_months", { n: months })}</Result>
      <p className="gy-help">
        {g("em_goal")} {ok ? g("em_ok") : g("em_low")}
      </p>
    </div>
  );
}
