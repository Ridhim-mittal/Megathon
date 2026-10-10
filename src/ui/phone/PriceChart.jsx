import React, { useId, useState } from "react";
import { usePhoneText } from "./strings.js";

const W = 300;
const H = 140;
const PAD = { top: 18, right: 6, bottom: 20, left: 30 };
const GAP = 2;

const niceMax = (v) => {
  const step = v > 400 ? 100 : v > 150 ? 50 : 25;
  return Math.ceil(v / step) * step;
};

// One series of yearly prices as bars. Prices move once a year, so there is no live line.
export function PriceChart({ history, badNews = [], name }) {
  const { s } = usePhoneText();
  const titleId = useId();
  const [active, setActive] = useState(null);
  if (!history?.length) return null;

  const max = niceMax(Math.max(...history.map((p) => p.price)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / history.length;
  const barW = Math.max(2, slot - GAP);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const bad = new Set(badNews);
  const first = history[0];
  const last = history[history.length - 1];
  const shown = active == null ? null : history[active];
  const change = (i) => (i > 0 ? history[i].price / history[i - 1].price - 1 : null);

  // A bar with a 4px-rounded top, anchored to the baseline.
  const bar = (x, top, w, h) => {
    const r = Math.min(4, w / 2, h);
    return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`;
  };

  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(history.length - 1, (i ?? history.length - 1) + d)));
    }
  };

  return (
    <figure className="ph-chart">
      <figcaption id={titleId} className="ph-chart-title">
        {s("chartTitle")}
      </figcaption>
      <div className="ph-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="ph-chart-svg"
          role="img"
          tabIndex={0}
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-d`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onMouseLeave={() => setActive(null)}
        >
          <desc id={`${titleId}-d`}>{s("chartAria", { from: first.age, to: last.age, price: last.price })}</desc>
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? "ph-axis" : "ph-grid"} />
              <text x={PAD.left - 4} y={y(v) + 3} className="ph-tick" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {history.map((p, i) => {
            const x = PAD.left + i * slot + GAP / 2;
            const top = y(p.price);
            return (
              <g key={p.age}>
                <path d={bar(x, top, barW, PAD.top + innerH - top)} className={`ph-bar${i === active ? " is-active" : ""}`} />
                {bad.has(p.age) && (
                  <text x={x + barW / 2} y={top - 4} textAnchor="middle" className="ph-bad-mark">
                    !
                  </text>
                )}
                {/* A hit target taller and wider than the bar. */}
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setActive(i)} />
              </g>
            );
          })}
          <text x={PAD.left} y={H - 5} className="ph-tick">
            {first.age}
          </text>
          <text x={W - PAD.right} y={H - 5} className="ph-tick" textAnchor="end">
            {last.age}
          </text>
        </svg>
        {shown && (
          <div className="ph-tooltip" role="status" style={{ left: `${Math.min(78, Math.max(22, ((PAD.left + active * slot + slot / 2) / W) * 100))}%` }}>
            <b>{s("age", { age: shown.age })}</b> · {shown.price}
            {change(active) != null && (
              <span className={change(active) < 0 ? "ph-tone-bad" : "ph-tone-good"}>
                {" "}
                ({change(active) > 0 ? "+" : "−"}
                {Math.abs(Math.round(change(active) * 1000) / 10)}%)
              </span>
            )}
            {bad.has(shown.age) && <span className="ph-tooltip-bad"> · ! {s("badNews")}</span>}
          </div>
        )}
      </div>
      {bad.size > 0 && (
        <p className="ph-chart-legend">
          <span className="ph-bad-mark-inline" aria-hidden="true">!</span> {s("badNewsAt", { ages: [...bad].join(", ") })}
        </p>
      )}
      <table className="ph-sr-only">
        <caption>{name}</caption>
        <thead>
          <tr>
            <th scope="col">{s("age", { age: "" }).trim()}</th>
            <th scope="col">{s("price")}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((p) => (
            <tr key={p.age}>
              <td>{p.age}</td>
              <td>
                {p.price}
                {bad.has(p.age) ? ` (${s("badNews")})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
