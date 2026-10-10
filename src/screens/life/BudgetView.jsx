import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Coins, Repeat, RotateCcw } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { checkBudget, select } from "../../ui/gameAdapter.js";
import { Jar, JAR_LOOKS } from "../../ui/Jar.jsx";
import { PixelPortrait as Portrait } from "../../ui/PixelPortrait.jsx";

// Ammamma hands over the month's money; tap coins into the jars until the pouch is empty.
export function BudgetView({ life, dispatch, repeats = false }) {
  const { t, money } = useT();
  const rules = select.budgetRules(life);
  const hud = select.hud(life);
  const [jars, setJars] = useState(() => ({ ...rules.suggested }));
  const [investIn, setInvestIn] = useState(rules.investIn);
  const [puff, setPuff] = useState(0);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  const order = ["needs", "wants", "emergency", "goal", "invest"].filter((k) => rules.jarsUnlocked.includes(k));
  const sum = order.reduce((a, k) => a + (jars[k] ?? 0), 0);
  const remaining = rules.monthlyIncome - sum;
  const check = checkBudget(life, jars);
  const firstTime = life.age <= 11;

  function change(id, delta) {
    setJars((j) => {
      const next = (j[id] ?? 0) + delta;
      if (next < 0 || (delta > 0 && remaining < delta)) return j;
      return { ...j, [id]: next };
    });
    setPuff((p) => p + 1);
  }

  return (
    <div className="view budget-view vn budget-fun">
      <div className="budget-top">
        <div className="budget-granny">
          <Portrait role="mentor" stage={hud.stage} />
        </div>
        <div className="vn-bubble budget-bubble">
          <h2 ref={heading} tabIndex={-1}>
            {t("budget.title")}
          </h2>
          <p>
            {t("budget.subtitle", { amount: money(rules.monthlyIncome) })}
            {rules.autoPaidMonthly > 0 && <> {t("budget.autoPaid", { gross: money(rules.grossMonthly), auto: money(rules.autoPaidMonthly) })}</>}
            {!rules.required && <> {t("budget.optional")}</>}
          </p>
        </div>
        <div className={`pouch ${remaining ? "has-money" : "empty"} ${puff ? `puff-${puff % 2 ? "a" : "b"}` : ""}`} role="status">
          <span className="pouch-icon">{remaining ? <Coins size={26} /> : <Check size={26} strokeWidth={3} />}</span>
          <strong>{money(remaining)}</strong>
          <span>{remaining ? t("budget.left") : t("budget.allPlaced")}</span>
          {!remaining && (
            <span className="vn-sparkles" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      </div>

      {rules.squeezed && <p className="warn-line">{t("budget.squeezed")}</p>}

      <div className="split-bar" aria-hidden="true">
        {order.map((id) => {
          const pct = rules.monthlyIncome ? Math.round(((jars[id] ?? 0) / rules.monthlyIncome) * 100) : 0;
          return (
            <span key={id} className={`split-seg ${JAR_LOOKS[id].color}`} style={{ flexGrow: jars[id] ?? 0 }}>
              {pct >= 10 && <b>{pct}%</b>}
            </span>
          );
        })}
        {remaining > 0 && <span className="split-seg left" style={{ flexGrow: remaining }} />}
      </div>

      <div className={`jar-grid jars-${order.length}`}>
        {order.map((id) => (
          <Jar
            key={id}
            id={id}
            value={jars[id] ?? 0}
            total={rules.monthlyIncome}
            step={rules.step}
            min={id === "needs" ? rules.minNeeds : 0}
            warn={id === "needs" && (jars.needs ?? 0) < rules.minNeeds}
            canAdd={remaining >= rules.step}
            canRemove={(jars[id] ?? 0) - rules.step >= (id === "needs" ? rules.minNeeds : 0)}
            onChange={change}
          />
        ))}
      </div>
      {order.includes("invest") && (
        <label className="invest-select">
          <span>{t("budget.investIn")}</span>
          <select value={investIn} onChange={(e) => setInvestIn(e.target.value)}>
            {rules.investOptions.map((p) => (
              <option key={p} value={p}>
                {t(`products.${p}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {firstTime && <p className="budget-tip">{t("budget.stepHelp", { amount: money(rules.step) })}</p>}

      <div className="action-row budget-actions">
        <p className="budget-repeat">
          {repeats && (
            <>
              <Repeat size={14} aria-hidden="true" /> {t("chapter.split")}
            </>
          )}
        </p>
        <div className="action-buttons">
          {!rules.required && (
            <button className="text-button" onClick={() => dispatch({ type: "ADVANCE" })}>
              <RotateCcw size={15} /> {t("budget.keep")}
            </button>
          )}
          <button
            className={`primary-button big ${check.ok ? "ready" : ""}`}
            disabled={!check.ok}
            onClick={() => dispatch({ type: "SET_BUDGET", jars, investIn: order.includes("invest") ? investIn : undefined })}
          >
            {t("budget.confirm")} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
