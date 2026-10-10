import React, { useState } from "react";
import { textFor } from "../strings.js";
import { Choice, Result, Slider, money } from "./kit.jsx";

const PRICES = [10, 500, 10000];

export function Inflation({ lang }) {
  const g = textFor(lang);
  const [item, setItem] = useState(0);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(10);
  const today = PRICES[item];
  const factor = (1 + rate / 100) ** years;
  return (
    <div className="gy-widget">
      <h4 className="gy-w-title">{g("inf_title")}</h4>
      <Choice label={g("inf_item")} options={g("inf_items").map((n, i) => `${n} ${money(PRICES[i])}`)} value={item} onChange={setItem} />
      <Slider label={g("inf_rate")} value={rate} min={2} max={10} onChange={setRate} format={(v) => g("perYear", { n: v })} />
      <Slider label={g("inf_years")} value={years} min={1} max={25} onChange={setYears} format={(v) => g("years", { n: v })} />
      <Result>{g("inf_result", { today: money(today), later: money(today * factor), years })}</Result>
      <p className="gy-help">{g("inf_tin", { left: money(100 / factor) })}</p>
    </div>
  );
}
