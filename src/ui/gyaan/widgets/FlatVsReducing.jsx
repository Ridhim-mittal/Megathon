import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Bars, Result, Slider, money, rateFor } from "./kit.jsx";

// "₹2 per ₹100 per month" flat = 24% a year on the full loan. The true reducing rate is higher.
export function FlatVsReducing({ lang }) {
  const g = textFor(lang);
  const [perHundred, setPerHundred] = useState(2);
  const [amount, setAmount] = useState(20000);
  const [months, setMonths] = useState(12);
  const interest = amount * (perHundred / 100) * months;
  const emi = (amount + interest) / months;
  const flatYearly = perHundred * 12;
  const trueYearly = rateFor(amount, emi, months) * 100;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("fr_title")}</h4>
      <Slider label={g("fr_flat")} value={perHundred} min={1} max={5} step={0.5} onChange={setPerHundred} format={(v) => `₹${v}`} />
      <Slider label={g("fr_amount")} value={amount} min={5000} max={100000} step={5000} onChange={setAmount} format={money} />
      <Slider label={g("fr_months")} value={months} min={6} max={36} step={6} onChange={setMonths} format={(v) => g("months", { n: v })} />
      <Bars
        rows={[
          { label: g("fr_looks"), value: flatYearly, display: g("perYear", { n: Math.round(flatYearly) }) },
          { label: g("fr_really"), value: trueYearly, display: g("perYear", { n: Math.round(trueYearly) }) },
        ]}
      />
      <Result tone="bad">{g("fr_emi", { emi: money(emi), interest: money(interest) })}</Result>
      <p className="gy-help">{g("fr_explain")}</p>
    </div>
  );
}
