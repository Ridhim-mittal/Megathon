import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Result, Slider, emiFor, money } from "./kit.jsx";

export function Emi({ lang }) {
  const g = textFor(lang);
  const [amount, setAmount] = useState(50000);
  const [rate, setRate] = useState(12);
  const [months, setMonths] = useState(24);
  const emi = emiFor(amount, rate / 100, months);
  const total = emi * months;
  const interest = total - amount;
  const share = Math.round((interest / total) * 100);
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("emi_title")}</h4>
      <Slider label={g("emi_amount")} value={amount} min={5000} max={500000} step={5000} onChange={setAmount} format={money} />
      <Slider label={g("emi_rate")} value={rate} min={0} max={40} onChange={setRate} format={(v) => g("perYear", { n: v })} />
      <Slider label={g("emi_months")} value={months} min={6} max={84} step={6} onChange={setMonths} format={(v) => g("months", { n: v })} />
      <dl className="gy-figures">
        <div>
          <dt>{g("emi_emi")}</dt>
          <dd>{money(emi)}</dd>
        </div>
        <div>
          <dt>{g("emi_total")}</dt>
          <dd>{money(total)}</dd>
        </div>
        <div>
          <dt>{g("emi_interest")}</dt>
          <dd className="gy-bad">{money(interest)}</dd>
        </div>
      </dl>
      {/* One bar: what you borrowed, then the interest on top (2px gap between the parts). */}
      <div className="gy-stack" role="img" aria-label={`${g("emi_principal")} ${money(amount)}, ${g("emi_interest")} ${money(interest)}`}>
        <div className="gy-bar gy-s1" style={{ width: `${(amount / total) * 100}%` }} title={`${g("emi_principal")}: ${money(amount)}`} />
        {interest > 0 && <div className="gy-bar gy-s2" style={{ width: `${(interest / total) * 100}%` }} title={`${g("emi_interest")}: ${money(interest)}`} />}
      </div>
      <div className="gy-legend">
        <span><i className="gy-key gy-s1" /> {g("emi_principal")}</span>
        <span><i className="gy-key gy-s2" /> {g("emi_interest")}</span>
      </div>
      <Result>{g("emi_share", { pct: share })}</Result>
    </div>
  );
}
