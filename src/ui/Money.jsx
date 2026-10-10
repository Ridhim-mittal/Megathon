import React, { useEffect, useRef, useState } from "react";
import { formatMoney, signedMoney } from "../i18n/index.jsx";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A rupee amount that counts to its new value and floats a +/− delta when it changes.
export function Money({ value, className = "" }) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return undefined;
    setDelta({ amount: value - from, key: Date.now() });
    if (reduced()) {
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 650);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className={`money ${className}`}>
      <span className="money-value">{formatMoney(shown)}</span>
      {delta && (
        <span key={delta.key} className={`money-delta ${delta.amount > 0 ? "up" : "down"}`} aria-hidden="true">
          {signedMoney(delta.amount)}
        </span>
      )}
    </span>
  );
}

// A 0–100 meter that pulses when it changes.
export function Meter({ id, label, value, icon: Icon }) {
  const [pulse, setPulse] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) setPulse({ dir: value > prev.current ? "up" : "down", key: Date.now() });
    prev.current = value;
  }, [value]);
  const level = (id === "joy" || id === "family") && (value <= 15 || value >= 90) ? "edge" : "";
  return (
    <div className={`meter meter-${id} ${level}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <span className="meter-label">
        {Icon && <Icon size={13} aria-hidden="true" />}
        {label}
      </span>
      <span className="meter-track">
        <i style={{ width: `${value}%` }} />
      </span>
      <b key={pulse?.key} className={`meter-value ${pulse ? `pulse-${pulse.dir}` : ""}`}>
        {value}
      </b>
    </div>
  );
}
