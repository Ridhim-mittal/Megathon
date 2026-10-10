import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Bars, Slider, Toggle, money } from "./kit.jsx";

export function Insurance({ lang }) {
  const g = textFor(lang);
  const [premium, setPremium] = useState(3000);
  const [bill, setBill] = useState(150000);
  const [sick, setSick] = useState(true);
  const withIns = premium;
  const without = sick ? bill : 0;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("ins_title")}</h4>
      <Slider label={g("ins_premium")} value={premium} min={1000} max={10000} step={500} onChange={setPremium} format={money} />
      <Slider label={g("ins_bill")} value={bill} min={20000} max={500000} step={10000} onChange={setBill} format={money} />
      <Toggle label={g("ins_happens")} checked={sick} onChange={setSick} />
      <Bars
        rows={[
          { label: g("ins_with"), value: withIns },
          { label: g("ins_without"), value: without },
        ]}
      />
      <p className="gy-help">{g("ins_ten", { premiums: money(premium * 10), bill: money(bill) })}</p>
      <p className="gy-help">{g("ins_odds")}</p>
    </div>
  );
}
