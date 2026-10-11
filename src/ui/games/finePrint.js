// The two loans in Fine Print Hunter, worked out the honest way: what reaches your hand, what you
// pay back in total, and how much you pay back for every ₹100 you actually got.

export const AMOUNT = 20000;
export const MONTHS = 12;

// QuickCash: "only 1.5% a month", charged flat on the full amount, a 5% fee taken from the loan,
// and ₹1,200 of insurance added to it.
export const QUICKCASH = { monthlyFlat: 0.015, feePct: 0.05, insurance: 1200, lateFeePerDay: 100, prepayPct: 0.04 };
// The bank: 13% a year on the reducing balance, a ₹500 fee paid separately, nothing added.
export const BANK = { yearly: 0.13, fee: 500 };

export function emiReducing(principal, yearly, months) {
  const r = yearly / 12;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

export function quickCash() {
  const fee = AMOUNT * QUICKCASH.feePct;
  const interest = AMOUNT * QUICKCASH.monthlyFlat * MONTHS;
  const inHand = AMOUNT - fee;
  const payBack = AMOUNT + interest + QUICKCASH.insurance;
  return { fee, interest, insurance: QUICKCASH.insurance, inHand, payBack, emi: payBack / MONTHS, per100: (payBack / inHand) * 100 };
}

export function bankLoan() {
  const emi = emiReducing(AMOUNT, BANK.yearly, MONTHS);
  const inHand = AMOUNT - BANK.fee;
  const payBack = emi * MONTHS;
  return { fee: BANK.fee, interest: payBack - AMOUNT, inHand, payBack, emi, per100: (payBack / inHand) * 100 };
}
