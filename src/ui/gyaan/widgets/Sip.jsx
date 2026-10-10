import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Bars, Result, Slider, money } from "./kit.jsx";

const END = 60;

// Value of a monthly investment from `startAge` to END at a yearly return.
const sipValue = (monthly, yearly, startAge) => {
  const i = yearly / 12;
  const n = (END - startAge) * 12;
  return i === 0 ? monthly * n : monthly * (((1 + i) ** n - 1) / i) * (1 + i);
};

export function Sip({ lang }) {
  const g = textFor(lang);
  const [monthly, setMonthly] = useState(1000);
  const [ret, setRet] = useState(10);
  const r = ret / 100;
  const row = (age, series) => {
    const v = sipValue(monthly, r, age);
    return {
      label: g(age === 22 ? "sip_a" : "sip_b"),
      value: v,
      series,
      note: `${g("sip_put", { amount: money(monthly * (END - age) * 12) })} · ${g("sip_range", {
        low: money(sipValue(monthly, Math.max(0, r - 0.03), age)),
        high: money(sipValue(monthly, r + 0.03, age)),
      })}`,
    };
  };
  const a = row(22, 0);
  const b = row(30, 1);
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("sip_title")}</h4>
      <Slider label={g("sip_monthly")} value={monthly} min={500} max={10000} step={500} onChange={setMonthly} format={money} />
      <Slider label={g("sip_return")} value={ret} min={4} max={14} onChange={setRet} format={(v) => g("perYear", { n: v })} />
      <p className="gy-help">{g("sip_until")}</p>
      <Bars rows={[a, b]} />
      <Result tone="good">{g("sip_gap", { gap: money(a.value - b.value) })}</Result>
      <p className="gy-help">{g("note")}</p>
    </div>
  );
}
