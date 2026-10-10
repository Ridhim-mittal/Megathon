import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Bars, Slider, Toggle, money } from "./kit.jsx";

const AMOUNT = 10000;
const COMPANIES = 50;

export function Diversify({ lang }) {
  const g = textFor(lang);
  const [market, setMarket] = useState(-20);
  const [bad, setBad] = useState(true);
  const m = 1 + market / 100;
  const one = AMOUNT * m * (bad ? 0.5 : 1);
  const fund = AMOUNT * m * (1 - (bad ? 0.5 / COMPANIES : 0));
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("div_title")}</h4>
      <p className="gy-help">
        {g("div_amount")}: <b>{money(AMOUNT)}</b>
      </p>
      <Slider label={g("div_market")} value={market} min={-40} max={20} step={5} onChange={setMarket} format={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`} />
      <Toggle label={g("div_bad")} checked={bad} onChange={setBad} />
      <Bars
        rows={[
          { label: g("div_one"), value: one },
          { label: g("div_fund"), value: fund },
        ]}
      />
      <p className="gy-help">{g("div_note")}</p>
    </div>
  );
}
