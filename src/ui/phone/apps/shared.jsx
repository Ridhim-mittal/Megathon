import React, { useId, useState } from "react";

// The heading every app screen starts with; it takes focus when the screen opens.
export function AppTitle({ children }) {
  return (
    <h2 className="ph-app-title" tabIndex={-1} data-autofocus>
      {children}
    </h2>
  );
}

export const pct = (rate, digits = 1) => {
  if (rate == null) return "—";
  const v = Math.round(rate * 100 * 10 ** digits) / 10 ** digits;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`;
};

export const plainPct = (rate, digits = 1) => (rate == null ? "—" : `${Math.round(rate * 100 * 10 ** digits) / 10 ** digits}`);

// An amount box with one or more action buttons. Each action gets the whole-rupee amount.
export function AmountRow({ label, actions, defaultValue = "" }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const amount = Math.round(Number(value));
  const valid = Number.isFinite(amount) && amount > 0;
  return (
    <div className="ph-amount">
      <label htmlFor={id} className="ph-amount-label">
        {label}
      </label>
      <div className="ph-amount-row">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="1"
          step="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="ph-input"
        />
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`ph-btn ${a.tone === "alt" ? "ph-btn-alt" : ""}`}
            disabled={!valid && !a.noAmount}
            aria-label={a.aria ?? a.label}
            onClick={() => {
              if (a.onClick(amount) && !a.keep) setValue("");
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A row of label + value.
export function Line({ label, value, strong, tone }) {
  return (
    <div className={`ph-line${strong ? " is-strong" : ""}`}>
      <span>{label}</span>
      <span className={tone ? `ph-tone-${tone}` : undefined}>{value}</span>
    </div>
  );
}
