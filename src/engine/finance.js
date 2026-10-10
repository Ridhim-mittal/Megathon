// Money maths. All rates are fictional teaching assumptions (see assumptions.json).
export const round = (n) => Math.round(n);

// Village phrase "₹2 per ₹100 per month" is a simple monthly rate: ×12 = 24% a year.
export const monthlyToYearly = (perHundredPerMonth) => perHundredPerMonth * 12;

export function emi(principal, annualPct, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r === 0) return round(principal / months);
  return round((principal * r * (1 + r) ** months) / ((1 + r) ** months - 1));
}

// Total the borrower pays: every EMI plus any processing fee taken up front.
export function loanTerms({ amount, annualPct, months, feePct = 0 }) {
  const monthly = emi(amount, annualPct, months);
  const fee = round((amount * feePct) / 100);
  const totalRepay = monthly * months + fee;
  return {
    amount,
    annualPct,
    months,
    feePct,
    emi: monthly,
    fee,
    totalRepay,
    totalCost: totalRepay - amount,
  };
}

// Advance one loan by one month. Returns the updated loan and money needed.
export function accrueMonth(loan) {
  const interest = (loan.balance * loan.annualPct) / 100 / 12;
  const due = Math.min(loan.emi, loan.balance + interest);
  return { interest, due };
}

export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const money = (n, lang = "en") =>
  `${n < 0 ? "−" : ""}₹${Math.abs(round(n)).toLocaleString(lang === "en" ? "en-IN" : "en-IN")}`;
