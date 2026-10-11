import React, { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/index.jsx";
import { sounds } from "./sound.js";
import { PixelIcon } from "./PixelIcon.jsx";

// The story's money, felt during the chapter. JarDock keeps the safety jar, fun money and any
// debt on the map; SurprisePop shows each yearly surprise and which jar paid for it (or that it
// had to be borrowed).
const KIND_ICON = { health: "thermo", repair: "phone", school: "book", family: "gift" };
const FROM_ICON = (key) => (key === "emergency" ? "ring" : ["cash", "wallet", "bank"].includes(key) ? "purse" : "target");

// Each chip is keyed on its value by the parent, so the bump animation replays on a change.
function Bump({ children, className }) {
  return <span className={`jd-chip ${className}`}>{children}</span>;
}

export function JarDock({ hud }) {
  const { t, money } = useT();
  const safety = hud.jars?.emergency ?? 0;
  return (
    <div className="jar-dock" aria-label={t("save.dock")}>
      <Bump key={`s${Math.round(safety)}`} className={`jd-safety ${safety <= 0 ? "empty" : ""}`}>
        <i aria-hidden="true">
          <PixelIcon name="ring" size={16} />
        </i>
        <b>{money(safety)}</b>
        <small>{t("save.safety")}</small>
      </Bump>
      <Bump key={`f${Math.round(hud.wallet ?? 0)}`} className="jd-fun">
        <i aria-hidden="true">
          <PixelIcon name="candy" size={10} />
        </i>
        <b>{money(hud.wallet ?? 0)}</b>
        <small>{t("save.fun")}</small>
      </Bump>
      {hud.debt > 0 && (
        <Bump key={`d${Math.round(hud.debt)}`} className="jd-debt">
          <i aria-hidden="true">
            <PixelIcon name="faceGrimace" size={16} />
          </i>
          <b>{money(hud.debt)}</b>
          <small>{t("save.debt")}</small>
        </Bump>
      )}
    </div>
  );
}

export function SurprisePop({ surprises, active }) {
  const { t, money } = useT();
  const seen = useRef(surprises.length); // a loaded save doesn't replay old surprises
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    if (surprises.length > seen.current) {
      setQueue((q) => [...q, ...surprises.slice(seen.current)]);
      seen.current = surprises.length;
    }
  }, [surprises]);
  const s = active ? queue[0] : null;
  useEffect(() => {
    if (!s) return;
    if (s.borrowed?.amount > 0) sounds.thud?.();
    else sounds.coin?.();
  }, [s]);
  if (!s) return null;
  const fromSafety = s.paidFrom.filter((p) => p.from === "emergency").reduce((a, p) => a + p.amount, 0);
  const fromDream = s.paidFrom.filter((p) => FROM_ICON(p.from) === "target").reduce((a, p) => a + p.amount, 0);
  const verdict = s.borrowed?.amount > 0 ? "borrowed" : fromDream > 0 ? "dream" : fromSafety >= s.cost - (s.insurance ?? 0) ? "safe" : "pocket";
  // Group what paid by icon: ring = safety, purse = pocket, target = savings.
  const parts = [];
  for (const p of s.paidFrom) {
    const icon = FROM_ICON(p.from);
    const last = parts.find((x) => x.icon === icon);
    if (last) last.amount += p.amount;
    else parts.push({ icon, amount: p.amount });
  }
  if (s.insurance > 0) parts.unshift({ icon: "umbrella", amount: s.insurance });
  return (
    <div className="sp-layer" role="alertdialog" aria-label={t(`save.kind.${s.kind}`)}>
      <div className={`sp-card verdict-${verdict}`}>
        <span className="sp-age">{t("save.ageTag", { n: s.age })}</span>
        <span className="sp-emoji" aria-hidden="true">
          <PixelIcon name={KIND_ICON[s.kind] ?? "bolt"} size={40} />
        </span>
        <b className="sp-title">{t(`save.kind.${s.kind}`)}</b>
        <span className="sp-cost">−{money(s.cost)}</span>
        <ul className="sp-paid">
          {parts.map((p, i) => (
            <li key={p.icon} style={{ animationDelay: `${300 + i * 250}ms` }}>
              <i aria-hidden="true">
                <PixelIcon name={p.icon} size={16} />
              </i>{" "}
              −{money(p.amount)}
            </li>
          ))}
          {s.borrowed?.amount > 0 && (
            <li className="loan" style={{ animationDelay: `${300 + parts.length * 250}ms` }}>
              <i aria-hidden="true">
                <PixelIcon name="faceGrimace" size={16} />
              </i>{" "}
              {t("save.loan", { n: money(s.borrowed.amount), p: Math.round((s.borrowed.rateYearly ?? 0) * 100) })}
            </li>
          )}
        </ul>
        <p className="sp-verdict">{t(`save.verdict.${verdict}`)}</p>
        <button className="primary-button" autoFocus onClick={() => setQueue((q) => q.slice(1))}>
          {t("save.ok")}
        </button>
      </div>
    </div>
  );
}
