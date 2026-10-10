// Pure card-balance rules shared by the validator and the tests.
import { readFileSync } from "node:fs";

const finance = JSON.parse(readFileSync(new URL("../src/data/finance.json", import.meta.url), "utf8"));
const SOFT = ["health", "family", "peace", "gyaan"];

// Visible value of an option on each meter. A loan's extra cost counts against money.
export function vector(opt) {
  const fx = opt.effects || {};
  let money = fx.money || 0;
  if (opt.loan) {
    const t = finance.loans[opt.loan.source];
    const r = t.annualPct / 1200;
    const n = t.months;
    const emi = r ? (opt.loan.amount * r * (1 + r) ** n) / ((1 + r) ** n - 1) : opt.loan.amount / n;
    money -= emi * n + (opt.loan.amount * t.feePct) / 100 - opt.loan.amount;
  }
  for (const op of opt.ops || []) if (op.startsWith("reduceLoan:")) money += Number(op.split(":")[2]);
  return { money, income: fx.income || 0, ...Object.fromEntries(SOFT.map((k) => [k, fx[k] || 0])) };
}

export function dominantOption(options) {
  const vs = options.map(vector);
  const keys = Object.keys(vs[0]);
  return options.find((o, i) =>
    vs.every((other, j) => j === i || (keys.every((k) => vs[i][k] >= other[k]) && keys.some((k) => vs[i][k] > other[k]))),
  );
}
