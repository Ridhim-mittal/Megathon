import React, { useRef, useState } from "react";
import { Heart, Laptop, Minus, Plus, ShieldCheck, ShoppingBasket, TrendingUp } from "lucide-react";
import { useT } from "../i18n/index.jsx";

// The chapter-one jar, now for any jar of the budget.
export const JAR_LOOKS = {
  needs: { icon: ShoppingBasket, color: "peach", face: "happy" },
  wants: { icon: Heart, color: "pink", face: "wink" },
  emergency: { icon: ShieldCheck, color: "green", face: "happy" },
  goal: { icon: Laptop, color: "purple", face: "happy" },
  invest: { icon: TrendingUp, color: "blue", face: "wink" },
};

// A coin drops in on +, hops out on −, and the jar wiggles and smiles.
export function Jar({ id, value, total, step, canAdd, canRemove, onChange, min = 0, warn = false, flash }) {
  const { t, money } = useT();
  const look = JAR_LOOKS[id];
  const Icon = look.icon;
  const label = t(`budget.jar.${id}.label`);
  const fill = total > 0 ? 14 + (value / total) * 80 : 14;
  const [drops, setDrops] = useState([]);
  const [bump, setBump] = useState(0);
  const seq = useRef(0);

  function tap(delta) {
    onChange(id, delta);
    const drop = { id: ++seq.current, dir: delta > 0 ? "in" : "out" };
    setDrops((d) => [...d.slice(-4), drop]);
    setBump((b) => b + 1);
    setTimeout(() => setDrops((d) => d.filter((x) => x.id !== drop.id)), 700);
  }

  return (
    <article className={`jar-card ${look.color} ${flash ? "jar-flash" : ""} ${bump ? `bump-${bump % 2 ? "a" : "b"}` : ""} ${warn ? "is-warn" : ""}`}>
      <div className="jar-heading">
        <span className="icon-badge">
          <Icon size={16} />
        </span>
        <div>
          <h3>{label}</h3>
          <p className="jar-note">{t(`budget.jar.${id}.note`)}</p>
        </div>
      </div>
      <div className="jar-illustration" aria-hidden="true">
        {drops.map((d) => (
          <span key={d.id} className={`coin-drop ${d.dir}`}>
            ₹
          </span>
        ))}
        <div className="jar-lid" />
        <div className="jar-glass">
          <div className="jar-fill" style={{ height: `${fill}%` }}>
            <span className="coin coin-one">₹</span>
            <span className="coin coin-two">₹</span>
            <span className="coin coin-three">₹</span>
          </div>
          <div className={`jar-face ${look.face}`}>
            <i />
            <i />
            <b />
          </div>
          <div className="glass-shine" />
        </div>
        <div className="jar-shadow" />
      </div>
      <div className="stepper">
        <button
          type="button"
          aria-label={t("budget.remove", { amount: money(step), jar: label })}
          onClick={() => tap(-step)}
          disabled={!canRemove}
        >
          <Minus size={16} />
        </button>
        <output aria-label={label} aria-live="polite">
          {money(value)}
        </output>
        <button type="button" aria-label={t("budget.add", { amount: money(step), jar: label })} onClick={() => tap(step)} disabled={!canAdd}>
          <Plus size={16} />
        </button>
      </div>
      {min > 0 && <p className="jar-min">{warn ? t("budget.minNeeds", { amount: money(min) }) : t("budget.min", { amount: money(min) })}</p>}
    </article>
  );
}
