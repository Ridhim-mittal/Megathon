import React, { useEffect, useRef } from "react";
import { ArrowRight, Newspaper, TrendingDown, TrendingUp } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { Money } from "../../ui/Money.jsx";
import { Mentor } from "../../ui/Mentor.jsx";
import { habitText, headlineText } from "../../ui/movements.js";

export function YearEndView({ life, dispatch, goalTitle }) {
  const { t, money, signed, castName } = useT();
  const y = select.yearSummary(life);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!y) return null;
  const habit = habitText(y.habitEcho, { t, money });
  const last = life.age >= 36;
  const meters = Object.entries(y.meterChanges).filter(([, d]) => d !== 0);
  return (
    <div className="view yearend-view">
      <article className="yearend-card">
        <span className="eyebrow">{t("yearEnd.eyebrow", { age: y.age })}</span>
        <div className="headline">
          <Newspaper size={22} aria-hidden="true" />
          <h2 ref={heading} tabIndex={-1}>
            {headlineText(y.headline, { t, money })}
          </h2>
        </div>
        <dl className="year-stats">
          <div>
            <dt>{t("yearEnd.netWorth")}</dt>
            <dd>
              <Money value={y.netWorth} />
              <small className={y.netWorthChange >= 0 ? "up" : "down"}>
                {y.netWorthChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {signed(y.netWorthChange)} {t("yearEnd.change")}
              </small>
            </dd>
          </div>
          <div>
            <dt>{t("yearEnd.savings")}</dt>
            <dd>{money(y.savings - y.cash + y.investments)}</dd>
          </div>
          <div className={y.debt > 0 ? "debt" : ""}>
            <dt>{t("yearEnd.debt")}</dt>
            <dd>
              {money(y.debt)}
              {y.debtChange !== 0 && <small className={y.debtChange > 0 ? "down" : "up"}>{signed(y.debtChange)}</small>}
            </dd>
          </div>
          <div>
            <dt>
              {t("yearEnd.dream")} · {goalTitle}
            </dt>
            <dd>
              {y.dream.reached ? t("hud.reached") : `${y.dream.pct}%`}
              <span className="dream-bar mini" aria-hidden="true">
                <i style={{ width: `${y.dream.pct}%` }} />
              </span>
            </dd>
          </div>
        </dl>
        {meters.length > 0 && (
          <ul className="meter-changes">
            {meters.map(([m, d]) => (
              <li key={m} className={d > 0 ? "up" : "down"}>
                {t(`meter.${m}`)} {d > 0 ? `+${d}` : d}
              </li>
            ))}
          </ul>
        )}
        <p className="quiet">{t("yearEnd.inflation", { pct: (y.inflation * 100).toFixed(1) })}</p>
        {habit && (
          <Mentor name={castName("mentor")} look compact>
            {habit}
          </Mentor>
        )}
        <div className="action-row">
          <span />
          <button className="primary-button big" onClick={() => dispatch({ type: "ADVANCE" })}>
            {last ? t("yearEnd.final") : t("yearEnd.next", { age: y.age + 1 })} <ArrowRight size={18} />
          </button>
        </div>
      </article>
    </div>
  );
}
