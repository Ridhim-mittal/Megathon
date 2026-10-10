import React, { useId } from "react";
import { formatMoney } from "../../../i18n/index.jsx";

export const money = formatMoney;

// A labelled slider with its current value shown next to the label.
export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v }) {
  const id = useId();
  const shown = format(value);
  return (
    <div className="gy-slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{shown}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={String(shown)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// Two (or more) horizontal bars on one scale, each labelled with its name and value.
// Series 1 is teal, series 2 orange (validated as a pair); text stays in ink.
export function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="gy-bars">
      {rows.map((r, i) => (
        <div className="gy-bar-row" key={r.label} title={`${r.label}: ${r.display ?? money(r.value)}`}>
          <div className="gy-bar-label">
            <span>{r.label}</span>
            <b>{r.display ?? money(r.value)}</b>
          </div>
          <div className="gy-bar-track">
            <div className={`gy-bar gy-s${(r.series ?? i) + 1}`} style={{ width: `${Math.max(1, (Math.abs(r.value) / max) * 100)}%` }} />
          </div>
          {r.note && <div className="gy-bar-note">{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

export function Result({ children, tone }) {
  return (
    <p className={`gy-result${tone ? ` is-${tone}` : ""}`} role="status">
      {children}
    </p>
  );
}

export function Choice({ label, options, value, onChange }) {
  return (
    <fieldset className="gy-choice">
      <legend>{label}</legend>
      <div className="gy-choice-row">
        {options.map((o, i) => (
          <button key={o} type="button" aria-pressed={value === i} className={value === i ? "is-on" : ""} onClick={() => onChange(i)}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange }) {
  const id = useId();
  return (
    <div className="gy-toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

// Monthly EMI for a reducing-balance loan.
export function emiFor(principal, yearlyRate, months) {
  const r = yearlyRate / 12;
  if (r === 0) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

// The yearly reducing rate that makes `months` payments of `emi` repay `principal`.
export function rateFor(principal, emi, months) {
  let lo = 0;
  let hi = 5; // 500% a year
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (emiFor(principal, mid, months) > emi) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
