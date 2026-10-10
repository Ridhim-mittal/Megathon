import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useI18n, rupees, signed } from "../i18n.js";

export const METER_ICON = { health: "♥", family: "🏠", peace: "☮", gyaan: "📖", money: "₹" };
export const METERS = ["health", "family", "peace", "gyaan"];

export function Modal({ label, onClose, children, wide = false, tone = "paper" }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current?.();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-2 sm:p-4" onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`rise panel w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[92dvh] overflow-y-auto px-4 pt-6 pb-6 outline-none ${tone === "red" ? "!bg-red text-cream" : ""}`}
      >
        {onClose && (
          <button className="absolute right-2 top-4 z-10 rounded-full bg-cream p-1 text-ink btn" onClick={onClose} aria-label={t("close")}>
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

// Cost preview chips shown on every option BEFORE the tap.
export function EffectChips({ preview }) {
  const { t } = useI18n();
  const { fx, covered, hidden, debtDown, ops, shortfall } = preview;
  const chips = [];
  chips.push(
    <Chip key="money" tone={fx.money < 0 ? "bad" : fx.money > 0 ? "good" : "plain"}>
      {fx.money === 0 ? "₹0" : `${fx.money > 0 ? "+" : "−"}${rupees(Math.abs(fx.money))}`}
    </Chip>,
  );
  for (const m of METERS)
    if (fx[m])
      chips.push(
        <Chip key={m} tone={fx[m] > 0 ? "good" : "bad"} title={t(m)}>
          {METER_ICON[m]} {signed(fx[m])}
        </Chip>,
      );
  if (fx.income) chips.push(<Chip key="inc" tone={fx.income > 0 ? "good" : "bad"}>{t("event.income", { sign: fx.income > 0 ? "+" : "−", n: Math.abs(fx.income) })}</Chip>);
  if (debtDown) chips.push(<Chip key="dd" tone="good">{t("event.debtDown", { amount: rupees(debtDown) })}</Chip>);
  if (ops?.some((o) => o.startsWith("payoff:"))) chips.push(<Chip key="po" tone="good">{t("event.payoff")}</Chip>);
  if (shortfall) chips.push(<Chip key="sf" tone="bad">⚠ {t("event.shortfall", { amount: rupees(shortfall) })}</Chip>);
  if (covered) chips.push(<Chip key="ins" tone="good">🛡 {t("event.insured", { amount: rupees(covered) })}</Chip>);
  if (hidden)
    chips.push(
      <Chip key="h" tone="mystery" title={t("event.hiddenLabel")}>
        <span aria-label={t("event.hiddenLabel")}>?</span>
      </Chip>,
    );
  return <div className="flex flex-wrap gap-1">{chips}</div>;
}

export function Chip({ tone = "plain", children, title }) {
  const tones = {
    plain: "bg-cream text-ink",
    good: "bg-[#d6efc9] text-[#1f4d2a]",
    bad: "bg-[#ffd9d2] text-[#8f1d14]",
    mystery: "bg-indigo text-gold",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-0.5 rounded-full border-2 border-ink px-2 py-0.5 text-[12px] font-extrabold leading-tight ${tones[tone]}`}>
      {children}
    </span>
  );
}

// Every loan: small EMI line, big red TOTAL, and the village phrase flipping into a yearly rate.
export function LoanTerms({ quote, compact = false }) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFlipped(true), 900);
    return () => clearTimeout(id);
  }, []);
  const perHundred = Math.round(quote.perHundredMonthly * 10) / 10;
  const source = quote.fromRoleflip ? "roleflip" : quote.source;
  return (
    <div className="mt-2 rounded-lg border-2 border-dashed border-ink bg-white/70 p-2" data-testid="loan-terms">
      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold">
        <span>
          {t(`loan.source.${source}`)} · {t("loan.borrow", { amount: rupees(quote.amount) })}
        </span>
        <span className="flex items-center gap-1 italic">
          {t("loan.phrase", { n: perHundred })}
          <span className={`transition-all duration-500 ${flipped ? "opacity-100" : "opacity-0 -translate-x-1"} not-italic text-debt`}>
            {t("loan.perYear", { pct: quote.annualPct })}
          </span>
        </span>
      </div>
      <div className="mt-1 text-[11px] text-ink/80">
        {t("loan.emi", { emi: rupees(quote.emi), months: quote.months })}
        {quote.fee ? ` · ${t("loan.fee", { fee: rupees(quote.fee) })}` : ""}
      </div>
      <div className={`${compact ? "text-base" : "text-xl"} font-black leading-tight text-debt`}>
        <span className="block text-[10px] tracking-wider">{t("loan.total")}</span>
        <span data-testid="loan-total">{rupees(quote.totalRepay)}</span>
      </div>
      {quote.fromRoleflip && <p className="mt-1 text-[11px] font-bold text-indigo">↺ {t("loan.yourTerms")}</p>}
    </div>
  );
}

// Sheikh Chilli's pot: stamped on every projection — a dream, not a promise.
export function PotIcon({ size = 22 }) {
  const { t } = useI18n();
  return (
    <span title={t("as.pot")} aria-label={t("as.pot")} role="img" className="inline-block" style={{ fontSize: size }}>
      🏺
    </span>
  );
}

// Projection drawn as a shaded band (low–high) with a dashed middle — never a single line.
export function RangeBand({ series, label, format = rupees }) {
  const { t } = useI18n();
  if (!series.length) return null;
  const W = 300;
  const H = 90;
  const max = Math.max(1, ...series.map((p) => p.hi));
  const x = (i) => 8 + (i / Math.max(1, series.length - 1)) * (W - 16);
  const y = (v) => H - 12 - (v / max) * (H - 24);
  const top = series.map((p, i) => `${x(i)},${y(p.hi)}`).join(" ");
  const bottom = [...series].reverse().map((p, i) => `${x(series.length - 1 - i)},${y(p.lo)}`).join(" ");
  const mid = series.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.mid)}`).join(" ");
  const last = series.at(-1);
  return (
    <figure className="rounded-lg border-2 border-ink bg-white/80 p-2">
      <figcaption className="flex items-start justify-between gap-2 text-xs font-bold">
        <span>{label}</span>
        <PotIcon />
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("as.range", { lo: format(last.lo), hi: format(last.hi) })}>
        <polygon points={`${top} ${bottom}`} fill="#3d7a4a33" stroke="#3d7a4a" strokeWidth="1.5" />
        <path d={mid} fill="none" stroke="#241510" strokeDasharray="4 4" strokeWidth="1.5" />
        <text x="8" y={H - 1} fontSize="9" fill="#241510">
          {series[0].age}
        </text>
        <text x={W - 8} y={H - 1} fontSize="9" textAnchor="end" fill="#241510">
          {last.age}
        </text>
      </svg>
      <p className="text-[11px] font-bold">
        {t("as.range", { lo: format(last.lo), hi: format(last.hi) })} · <span className="italic">{t("as.pot")}</span>
      </p>
    </figure>
  );
}
