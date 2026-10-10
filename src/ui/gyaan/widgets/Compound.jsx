import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Bars, Result, Slider, money } from "./kit.jsx";

export function Compound({ lang }) {
  const g = textFor(lang);
  const [amount, setAmount] = useState(5000);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(10);
  const r = rate / 100;
  const simple = amount * (1 + r * years);
  const compound = amount * (1 + r) ** years;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("cmp_title")}</h4>
      <Slider label={g("cmp_amount")} value={amount} min={1000} max={50000} step={1000} onChange={setAmount} format={money} />
      <Slider label={g("cmp_rate")} value={rate} min={2} max={15} onChange={setRate} format={(v) => g("perYear", { n: v })} />
      <Slider label={g("cmp_years")} value={years} min={1} max={30} onChange={setYears} format={(v) => g("years", { n: v })} />
      <Bars
        rows={[
          { label: g("cmp_simple"), value: simple },
          { label: g("cmp_compound"), value: compound },
        ]}
      />
      <Result tone="good">{g("cmp_extra", { extra: money(compound - simple) })}</Result>
    </div>
  );
}
