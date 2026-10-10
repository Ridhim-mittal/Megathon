import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Choice, Result, Slider, money } from "./kit.jsx";

const PRICES = [250, 1500, 12000];

export function Opportunity({ lang }) {
  const g = textFor(lang);
  const [wage, setWage] = useState(60);
  const [item, setItem] = useState(1);
  const hours = Math.round((PRICES[item] / wage) * 10) / 10;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("opp_title")}</h4>
      <Slider label={g("opp_wage")} value={wage} min={30} max={300} step={10} onChange={setWage} format={money} />
      <Choice label={g("opp_item")} options={g("opp_items").map((n, i) => `${n} ${money(PRICES[i])}`)} value={item} onChange={setItem} />
      <Result>{g("opp_hours", { hours })}</Result>
      <p className="gy-help">{g("opp_days", { days: Math.round((hours / 8) * 10) / 10 })}</p>
    </div>
  );
}
