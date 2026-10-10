import React, { useState } from "react";
import { ASSUMPTIONS } from "../../gameAdapter.js";
import { textFor } from "../strings.js";
import { Bars, Result, Slider, money } from "./kit.jsx";

// The same fees the game's invest app uses (index fund vs active fund).
const LOW = ASSUMPTIONS.market?.expenseRatio?.sip_index ?? 0.002;
const HIGH = ASSUMPTIONS.market?.expenseRatio?.mf_active ?? 0.018;
const pctLabel = (r) => Math.round(r * 1000) / 10;

export function Fees({ lang }) {
  const g = textFor(lang);
  const [amount, setAmount] = useState(100000);
  const [ret, setRet] = useState(10);
  const [years, setYears] = useState(20);
  const grow = (fee) => amount * (1 + ret / 100 - fee) ** years;
  const low = grow(LOW);
  const high = grow(HIGH);
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("fee_title")}</h4>
      <Slider label={g("fee_amount")} value={amount} min={10000} max={500000} step={10000} onChange={setAmount} format={money} />
      <Slider label={g("fee_return")} value={ret} min={6} max={14} onChange={setRet} format={(v) => g("perYear", { n: v })} />
      <Slider label={g("fee_years")} value={years} min={5} max={30} step={5} onChange={setYears} format={(v) => g("years", { n: v })} />
      <Bars
        rows={[
          { label: g("fee_low", { pct: pctLabel(LOW) }), value: low },
          { label: g("fee_high", { pct: pctLabel(HIGH) }), value: high },
        ]}
      />
      <Result tone="bad">{g("fee_gap", { gap: money(low - high) })}</Result>
      <p className="gy-help">{g("note")}</p>
    </div>
  );
}
