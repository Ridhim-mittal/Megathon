import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Coins, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { checkBudget, select } from "../../ui/gameAdapter.js";
import { Jar } from "../../ui/Jar.jsx";
import { Mentor } from "../../ui/Mentor.jsx";

export function BudgetView({ life, dispatch }) {
  const { t, money, castName } = useT();
  const rules = select.budgetRules(life);
  const [jars, setJars] = useState(() => ({ ...rules.suggested }));
  const [investIn, setInvestIn] = useState(rules.investIn);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  const order = ["needs", "wants", "emergency", "goal", "invest"].filter((k) => rules.jarsUnlocked.includes(k));
  const sum = order.reduce((a, k) => a + (jars[k] ?? 0), 0);
  const remaining = rules.monthlyIncome - sum;
  const check = checkBudget(life, jars);

  function change(id, delta) {
    setJars((j) => {
      const next = (j[id] ?? 0) + delta;
      if (next < 0 || (delta > 0 && remaining < delta)) return j;
      return { ...j, [id]: next };
    });
  }

  return (
    <div className="view budget-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">{t("budget.eyebrow", { age: life.age })}</span>
          <h2 ref={heading} tabIndex={-1}>
            {t("budget.title")}
          </h2>
          <p>
            {t("budget.subtitle", { amount: money(rules.monthlyIncome) })}{" "}
            {rules.autoPaidMonthly > 0 && t("budget.autoPaid", { gross: money(rules.grossMonthly), auto: money(rules.autoPaidMonthly) })}
          </p>
          <p className={`budget-note ${rules.required ? "required" : ""}`}>{rules.required ? t("budget.required") : t("budget.optional")}</p>
        </div>
        <div className={`available-pill ${remaining ? "has-money" : ""}`} role="status">
          <Coins size={18} />
          <div>
            <strong>{money(remaining)}</strong>
            <span>{remaining ? t("budget.left") : t("budget.allPlaced")}</span>
          </div>
          {remaining === 0 && <Check size={17} />}
        </div>
      </div>
      {rules.squeezed && <p className="warn-line">{t("budget.squeezed")}</p>}
      <div className={`jar-grid jars-${order.length}`}>
        {order.map((id) => (
          <Jar
            key={id}
            id={id}
            value={jars[id] ?? 0}
            total={rules.monthlyIncome}
            step={rules.step}
            min={id === "needs" ? rules.minNeeds : 0}
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
      <div className="allocation-help">
        <Info size={15} />
        <span>{t("budget.stepHelp", { amount: money(rules.step) })}</span>
      </div>
      <Mentor name={castName("mentor")} compact>
        {t("budget.mentor")}
      </Mentor>
      <div className="action-row">
        <p role="status">
          {check.ok ? (
            <>
              <ShieldCheck size={16} /> {t("budget.yearly", { amount: money(rules.monthlyIncome * 12) })}
            </>
          ) : (jars.needs ?? 0) < rules.minNeeds ? (
            t("budget.minNeeds", { amount: money(rules.minNeeds) })
          ) : null}
        </p>
        <div className="action-buttons">
          {!rules.required && (
            <button className="text-button" onClick={() => dispatch({ type: "ADVANCE" })}>
              <RotateCcw size={15} /> {t("budget.keep")}
            </button>
          )}
          <button
            className="primary-button big"
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
