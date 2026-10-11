// Turns the engine's money movements (lastOutcome.money.movements) into short sentences.
// Returns [{ text, tone: "in" | "out" | "neutral" | "warn" }].

export function describeMovements(movements, { t, money }) {
  const src = (from) => t(`sources.${from}`);
  const product = (p) => t(`products.${p}`);
  const loan = (s) => t(`loans.${s}`);
  const lines = [];
  for (const m of movements ?? []) {
    switch (m.type) {
      case "cash":
        if (m.amount > 0) lines.push({ tone: "in", text: t("outcome.m.cashIn", { amount: money(m.amount) }) });
        else {
          const from = (m.paidFrom ?? []).map((p) => `${src(p.from)} (${money(p.amount)})`).join(", ");
          lines.push({ tone: "out", text: `${t("outcome.m.cashOut", { amount: money(-m.amount) })}${from ? ` ${t("outcome.m.paidFrom", { sources: from })}` : ""}` });
          if (m.borrowed) lines.push({ tone: "warn", text: t("outcome.m.borrowed", { amount: money(m.borrowed.amount), source: loan(m.borrowed.source) }) });
          if (m.penalties) lines.push({ tone: "out", text: t("outcome.m.penalty", { amount: money(m.penalties) }) });
        }
        break;
      case "jar":
        if (m.amount > 0) lines.push({ tone: "neutral", text: t("outcome.m.jarIn", { amount: money(m.amount), jar: src(m.jar === "wants" ? "wallet" : m.jar) }) });
        else if (m.amount < 0) lines.push({ tone: "neutral", text: t("outcome.m.jarOut", { amount: money(-m.amount), jar: src(m.jar === "wants" ? "wallet" : m.jar) }) });
        break;
      case "loan":
        lines.push({
          tone: "warn",
          text: t("outcome.m.loan", {
            source: loan(m.source),
            amount: money(m.principal),
            emi: money(m.emi),
            months: m.months,
            total: money(m.totalPayable),
          }),
        });
        break;
      case "repay":
        if (m.paid > 0) lines.push({ tone: "in", text: t("outcome.m.repay", { amount: money(m.paid), source: loan(m.loan) }) });
        break;
      case "open":
        if (m.shortfall > 0) lines.push({ tone: "warn", text: t("outcome.m.openShort", { amount: money(m.paid), product: product(m.product) }) });
        else if (m.paid > 0) lines.push({ tone: "neutral", text: t("outcome.m.open", { amount: money(m.paid), product: product(m.product) }) });
        break;
      case "close":
        if (m.had) {
          lines.push({ tone: "in", text: t("outcome.m.close", { amount: money(m.received), product: product(m.product) }) });
          if (m.penalty) lines.push({ tone: "out", text: t("outcome.m.penalty", { amount: money(m.penalty) }) });
        }
        break;
      case "insurance":
        lines.push(
          m.opened
            ? { tone: "neutral", text: t("outcome.m.insuranceOn", { product: product(m.product), premium: money(m.premium), cover: money(m.cover) }) }
            : { tone: "warn", text: t("outcome.m.insuranceNo", { product: product(m.product), premium: money(m.premium) }) },
        );
        break;
      case "shock": {
        lines.push({ tone: "out", text: `${t(`shock.${m.kind}`)}: ${t("outcome.m.shock", { cost: money(m.cost) })}` });
        if (m.insurance) lines.push({ tone: "in", text: t("outcome.m.insurancePaid", { amount: money(m.insurance) }) });
        const from = (m.paidFrom ?? []).map((p) => `${src(p.from)} (${money(p.amount)})`).join(", ");
        if (from) lines.push({ tone: "out", text: t("outcome.m.paidFrom", { sources: from }) });
        if (m.borrowed) lines.push({ tone: "warn", text: t("outcome.m.borrowed", { amount: money(m.borrowed.amount), source: loan(m.borrowed.source) }) });
        break;
      }
      case "income":
        lines.push({ tone: "in", text: t("outcome.m.income", { amount: money(m.monthly) }) });
        break;
      case "scheduled":
        lines.push({ tone: "neutral", text: t("outcome.m.scheduled") });
        break;
      default:
    }
  }
  // Several scheduled entries say the same quiet thing once.
  return lines.filter((l, i) => lines.findIndex((x) => x.text === l.text) === i);
}

const MONEY_KEYS = ["exampleCost", "exampleInterest", "idle", "lostToInflation", "monthly", "ifNow", "ifFiveYearsLater", "extraMonthly", "emiMonthly", "emergency"];

export function habitText(habit, { t, money }) {
  if (!habit) return null;
  const values = { ...habit.values };
  for (const k of MONEY_KEYS) if (values[k] != null) values[k] = money(values[k]);
  const key = habit.id === "wants_high" && habit.values.delayYears == null ? "wants_high_never" : habit.id;
  const text = t(`yearEnd.habit.${key}`, values);
  return text.startsWith("yearEnd.") ? habit.text?.en ?? null : text;
}

export function headlineText(h, { t, money }) {
  if (!h) return t("yearEnd.headline.quiet");
  const vars = {
    kind: h.kind ? t(`shock.${h.kind}`) : "",
    cost: money(h.cost ?? 0),
    pct: Math.abs(h.pct ?? 0),
    amount: money(h.monthly ?? 0),
  };
  const text = t(`yearEnd.headline.${h.type}`, vars);
  return text.startsWith("yearEnd.") ? t("yearEnd.headline.quiet") : text;
}
