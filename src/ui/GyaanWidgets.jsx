import React, { useState } from "react";
import { useT } from "../i18n/index.jsx";

// Small "try it" calculators for Gyaan pages. The numbers here are for teaching only; they never
// touch the player's money.

const emiFor = (principal, yearlyPct, months) => {
  const r = yearlyPct / 1200;
  if (r === 0) return principal / months;
  return (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
};
// Future value of a monthly deposit after `years` at `yearlyPct`, compounded monthly.
const growMonthly = (monthly, yearlyPct, years) => {
  const r = yearlyPct / 1200;
  const n = years * 12;
  return r === 0 ? monthly * n : monthly * (((1 + r) ** n - 1) / r) * (1 + r);
};

function Slider({ label, value, min, max, step = 1, onChange, show }) {
  return (
    <label className="w-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{show ? show(value) : value}</output>
    </label>
  );
}

function Bars({ rows, money }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="w-bars">
      {rows.map((r) => (
        <div key={r.label} className={`w-bar ${r.tone ?? ""}`}>
          <span>{r.label}</span>
          <i style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          <b>{money(Math.round(r.value))}</b>
        </div>
      ))}
    </div>
  );
}

function Compound() {
  const { t, money } = useT();
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(7);
  const put = monthly * 12 * years;
  const grown = growMonthly(monthly, rate, years);
  return (
    <>
      <Slider label={t("widget.perMonth")} value={monthly} min={100} max={5000} step={100} onChange={setMonthly} show={money} />
      <Slider label={t("widget.years")} value={years} min={1} max={25} onChange={setYears} />
      <Slider label={t("widget.rate")} value={rate} min={0} max={12} step={0.5} onChange={setRate} show={(v) => `${v}%`} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.tinBox"), value: put, tone: "plain" },
          { label: t("widget.withInterest"), value: grown, tone: "good" },
        ]}
      />
      <p className="w-result">{t("widget.compound.result", { put: money(put), grown: money(Math.round(grown)), extra: money(Math.round(grown - put)) })}</p>
    </>
  );
}

function Inflation() {
  const { t, money } = useT();
  const [amount, setAmount] = useState(1000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(6);
  const worth = amount / (1 + rate / 100) ** years;
  return (
    <>
      <Slider label={t("widget.amount")} value={amount} min={100} max={10000} step={100} onChange={setAmount} show={money} />
      <Slider label={t("widget.years")} value={years} min={1} max={25} onChange={setYears} />
      <Slider label={t("widget.inflation")} value={rate} min={2} max={10} step={0.5} onChange={setRate} show={(v) => `${v}%`} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.today"), value: amount, tone: "plain" },
          { label: t("widget.later", { n: years }), value: worth, tone: "bad" },
        ]}
      />
      <p className="w-result">{t("widget.inflation.result", { amount: money(amount), n: years, worth: money(Math.round(worth)) })}</p>
    </>
  );
}

function Emi() {
  const { t, money } = useT();
  const [principal, setPrincipal] = useState(50000);
  const [rate, setRate] = useState(14);
  const [months, setMonths] = useState(24);
  const emi = emiFor(principal, rate, months);
  const total = emi * months;
  return (
    <>
      <Slider label={t("widget.loan")} value={principal} min={5000} max={500000} step={5000} onChange={setPrincipal} show={money} />
      <Slider label={t("widget.rateYear")} value={rate} min={0} max={36} step={1} onChange={setRate} show={(v) => `${v}%`} />
      <Slider label={t("widget.months")} value={months} min={3} max={120} step={3} onChange={setMonths} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.borrowed"), value: principal, tone: "plain" },
          { label: t("widget.interest"), value: total - principal, tone: "bad" },
        ]}
      />
      <p className="w-result">
        {t("widget.emi.result", { emi: money(Math.round(emi)), total: money(Math.round(total)), interest: money(Math.round(total - principal)) })}
      </p>
    </>
  );
}

function FlatVsReducing() {
  const { t, money } = useT();
  const [perHundred, setPerHundred] = useState(2);
  const [principal, setPrincipal] = useState(20000);
  const months = 12;
  const flatInterest = principal * (perHundred / 100) * months;
  const flatEmi = (principal + flatInterest) / months;
  // The yearly rate whose reducing-balance EMI matches the flat EMI.
  let lo = 0;
  let hi = 300;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (emiFor(principal, mid, months) > flatEmi) hi = mid;
    else lo = mid;
  }
  return (
    <>
      <Slider label={t("widget.perHundred")} value={perHundred} min={0.5} max={5} step={0.5} onChange={setPerHundred} show={(v) => `₹${v}`} />
      <Slider label={t("widget.loan")} value={principal} min={5000} max={100000} step={5000} onChange={setPrincipal} show={money} />
      <p className="w-result">
        {t("widget.flat.result", { per: perHundred, flat: perHundred * 12, real: Math.round(lo), interest: money(Math.round(flatInterest)), emi: money(Math.round(flatEmi)) })}
      </p>
    </>
  );
}

function Sip() {
  const { t, money } = useT();
  const [monthly, setMonthly] = useState(1000);
  const [years, setYears] = useState(15);
  const put = monthly * 12 * years;
  return (
    <>
      <Slider label={t("widget.sipMonthly")} value={monthly} min={100} max={10000} step={100} onChange={setMonthly} show={money} />
      <Slider label={t("widget.years")} value={years} min={1} max={30} onChange={setYears} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.youPut"), value: put, tone: "plain" },
          { label: t("widget.badYears", { pct: 7 }), value: growMonthly(monthly, 7, years), tone: "" },
          { label: t("widget.normalYears", { pct: 11 }), value: growMonthly(monthly, 11, years), tone: "good" },
          { label: t("widget.goodYears", { pct: 14 }), value: growMonthly(monthly, 14, years), tone: "good" },
        ]}
      />
      <p className="w-result">{t("widget.sip.result")}</p>
    </>
  );
}

function Fees() {
  const { t, money } = useT();
  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(20);
  const grow = (fee) => amount * (1 + (11 - fee) / 100) ** years;
  const low = grow(0.2);
  const high = grow(1.8);
  return (
    <>
      <Slider label={t("widget.invest")} value={amount} min={10000} max={500000} step={10000} onChange={setAmount} show={money} />
      <Slider label={t("widget.years")} value={years} min={1} max={30} onChange={setYears} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.fee", { pct: 0.2 }), value: low, tone: "good" },
          { label: t("widget.fee", { pct: 1.8 }), value: high, tone: "bad" },
        ]}
      />
      <p className="w-result">{t("widget.fees.result", { gap: money(Math.round(low - high)), n: years })}</p>
    </>
  );
}

function Diversify() {
  const { t, money } = useT();
  const [spread, setSpread] = useState(1);
  const amount = 40000;
  // One company has a bad-news year and halves; the others grow 10%.
  const each = amount / spread;
  const after = each * 0.5 + each * (spread - 1) * 1.1;
  return (
    <>
      <Slider label={t("widget.companies")} value={spread} min={1} max={8} onChange={setSpread} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.youPut"), value: amount, tone: "plain" },
          { label: t("widget.afterBadNews"), value: after, tone: after < amount ? "bad" : "good" },
        ]}
      />
      <p className="w-result">{t("widget.diversify.result", { n: spread, after: money(Math.round(after)) })}</p>
    </>
  );
}

function Emergency() {
  const { t, money } = useT();
  const [months, setMonths] = useState(1);
  const needs = 8000;
  const shock = 30000;
  const saved = needs * months;
  const borrow = Math.max(0, shock - saved);
  const cost = borrow * 0.02 * 12; // a year at the sahukar's ₹2 per ₹100 a month
  return (
    <>
      <Slider label={t("widget.monthsSaved")} value={months} min={0} max={6} onChange={setMonths} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.fund"), value: saved, tone: "good" },
          { label: t("widget.billLeft"), value: borrow, tone: "bad" },
        ]}
      />
      <p className="w-result">{borrow > 0 ? t("widget.emergency.borrow", { borrow: money(borrow), cost: money(Math.round(cost)) }) : t("widget.emergency.safe")}</p>
    </>
  );
}

function Insurance() {
  const { t, money } = useT();
  const [years, setYears] = useState(10);
  const premium = 2500;
  const bill = 150000;
  return (
    <>
      <Slider label={t("widget.years")} value={years} min={1} max={25} onChange={setYears} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.premiums"), value: premium * years, tone: "plain" },
          { label: t("widget.oneBill"), value: bill, tone: "bad" },
        ]}
      />
      <p className="w-result">{t("widget.insurance.result", { premium: money(premium), total: money(premium * years), bill: money(bill) })}</p>
    </>
  );
}

const SORT_ITEMS = {
  needs_wants: [
    ["bus", "need"],
    ["medicine", "need"],
    ["topup", "want"],
    ["notebook", "need"],
    ["shoes2", "want"],
    ["chocolate", "want"],
  ],
  upi_check: [
    ["pin", "scam"],
    ["kyc", "scam"],
    ["refund", "scam"],
    ["bill", "safe"],
    ["qr", "scam"],
    ["shop", "safe"],
  ],
};

function Sort({ id }) {
  const { t } = useT();
  const [picks, setPicks] = useState({});
  const items = SORT_ITEMS[id];
  const kinds = id === "needs_wants" ? ["need", "want"] : ["safe", "scam"];
  const done = items.every(([k]) => picks[k]);
  const right = items.filter(([k, v]) => picks[k] === v).length;
  return (
    <>
      <ul className="w-sort">
        {items.map(([k, v]) => (
          <li key={k} className={picks[k] ? (picks[k] === v ? "right" : "wrong") : ""}>
            <span>{t(`widget.${id}.items.${k}`)}</span>
            {kinds.map((kind) => (
              <button key={kind} className={`secondary-button small ${picks[k] === kind ? "on" : ""}`} onClick={() => setPicks({ ...picks, [k]: kind })}>
                {t(`widget.kinds.${kind}`)}
              </button>
            ))}
          </li>
        ))}
      </ul>
      {done && <p className="w-result">{t("widget.sortScore", { n: right, total: items.length })}</p>}
    </>
  );
}

function Opportunity() {
  const { t, money } = useT();
  const [years, setYears] = useState(3);
  // Work now at ₹8,000 a month, or study `years` more and start at ₹15,000; both grow 6% a year.
  const total = (start, salary) => {
    let sum = 0;
    for (let y = start; y < 20; y++) sum += salary * 12 * 1.06 ** (y - start);
    return sum;
  };
  const work = total(0, 8000);
  const study = total(years, 15000);
  return (
    <>
      <Slider label={t("widget.studyYears")} value={years} min={1} max={5} onChange={setYears} />
      <Bars
        money={money}
        rows={[
          { label: t("widget.workNow"), value: work, tone: "plain" },
          { label: t("widget.studyFirst"), value: study, tone: study > work ? "good" : "bad" },
        ]}
      />
      <p className="w-result">{t("widget.opportunity.result", { lost: money(8000 * 12 * years) })}</p>
    </>
  );
}

const WIDGETS = {
  compound: Compound,
  inflation: Inflation,
  emi: Emi,
  flat_vs_reducing: FlatVsReducing,
  sip: Sip,
  fees: Fees,
  diversify: Diversify,
  emergency: Emergency,
  insurance: Insurance,
  opportunity: Opportunity,
  needs_wants: () => <Sort id="needs_wants" />,
  upi_check: () => <Sort id="upi_check" />,
};

export function GyaanWidget({ id }) {
  const { t } = useT();
  const Widget = WIDGETS[id];
  if (!Widget) return null;
  return (
    <section className="gyaan-widget">
      <h4>{t("widget.title")}</h4>
      <Widget />
    </section>
  );
}
