import { useLayoutEffect, useRef, useState } from "react";
import { cardById, crossById, msgById } from "../engine/data.js";
import { eraFor } from "../engine/engine.js";
import { useI18n, rupees, signed } from "../i18n.js";
import { VillageArt } from "./VillageArt.jsx";

export const ACTION_ICON = { bank: "🏦", learn: "📖", fd: "🔒", rd: "🪙", chitti: "🤝", gold: "📿", sip: "🌳", insurance: "🛡", loan: "💸", repay: "✅" };

export function optionLabel(tx, kind, id, optionId) {
  const src = kind === "crossroads" ? crossById[id] : cardById[id];
  return tx(src?.options.find((o) => o.id === optionId)?.label);
}

export function useNoteText() {
  const { t } = useI18n();
  return (n) => {
    const p = { ...n };
    for (const k of ["amount", "total", "emi"]) if (k in p) p[k] = rupees(p[k]);
    if (p.from) p.from = t(`fund.${p.from}`);
    if (p.what) p.what = t(`fund.${p.what}`);
    if (n.key === "loan") return `💸 ${t(`loan.source.${n.source}`)}: ${t("note.loan", p)}`;
    return t(`note.${n.key}`, p);
  };
}

// The seed 🌱 carries no tooltip on purpose: the player finds out later.
export const Seed = ({ id }) => (
  <span data-seed-id={id} className="ml-1 inline-block text-sm" aria-hidden>
    🌱
  </span>
);

export function YearPanel({ year, compact = false, highlight = false, testid }) {
  const { t, tx } = useI18n();
  const noteText = useNoteText();
  const d = year.after && year.before ? year.after : null;
  return (
    <article className={`panel overflow-hidden pt-3 pb-3 ${highlight ? "diverge" : ""}`} data-testid={testid || `year-${year.age}`} data-age={year.age}>
      {!compact && <VillageArt era={year.era || eraFor(year.age)} className="border-b-2 border-ink" />}
      <div className={`${compact ? "px-2 pt-1 text-[11px]" : "px-3 pt-2 text-[13px]"} space-y-1`}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-black">{t("age", { age: year.age })}</h3>
          <span className="text-[11px] font-bold">
            {t("income")} {rupees(year.income)}
          </span>
        </div>
        {year.crossroads && (
          <p className="font-bold text-indigo">
            🛤 {tx(crossById[year.crossroads.id].title)}: {optionLabel(tx, "crossroads", year.crossroads.id, year.crossroads.optionId)}
            {year.crossroads.planted && <Seed id={year.crossroads.planted} />}
          </p>
        )}
        {!compact && year.split && (
          <p className="text-[11px] opacity-80">
            {t("year.split", Object.fromEntries(["needs", "wants", "savings", "goal"].map((k) => [k, rupees(year.split[k])])))}
            {year.split.reserved ? ` · ${t("year.emiReserved", { amount: rupees(year.split.reserved) })}` : ""}
          </p>
        )}
        {year.roleflip && <p className="font-bold">🏢 {t("rf.title")}</p>}
        {year.actions.length > 0 && (
          <p aria-label={t("year.actions")}>
            {year.actions.map((a, i) => (
              <span key={i} className="mr-1" title={t(`tool.${a.kind}`)}>
                {ACTION_ICON[a.kind]}
              </span>
            ))}
          </p>
        )}
        <ul className="space-y-0.5">
          {year.events.map((e, i) => (
            <li key={i} data-thread-target={e.seedId || undefined} className={e.seedId ? "rounded bg-[#ffe9a8] px-1" : ""}>
              <span aria-hidden>{cardById[e.cardId].art}</span> <b>{tx(cardById[e.cardId].title)}</b> → {optionLabel(tx, "event", e.cardId, e.optionId)}
              {e.planted && <Seed id={e.planted} />}
            </li>
          ))}
        </ul>
        {year.message && (
          <p>
            📱 {tx(msgById[year.message.msgId].sender)}: {year.message.verdict === "flag" ? "🚩" : "↩"}
            {year.message.planted && <Seed id={year.message.planted} />}
          </p>
        )}
        {!compact && year.notes.filter((n) => n.key !== "loan").map((n, i) => <p key={i} className="text-[11px] italic">{noteText(n)}</p>)}
        {!compact && year.luck.map((l, i) => <p key={`l${i}`} className="text-[11px]">🎲 {t(`year.${l.key}`, { pct: signed(l.pct) })}</p>)}
        {d && (
          <p className="flex flex-wrap gap-x-2 text-[11px] font-bold">
            <span>₹ {rupees(d.wallet)}</span>
            <span className="text-debt">{t("debt")} {rupees(d.debt)}</span>
            <span>🏡 {d.goalPct}%</span>
            {compact && (
              <span>
                ♥{d.health} 🏠{d.family} ☮{d.peace} 📖{d.gyaan}
              </span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

// Draws a thread from each seed 🌱 to the panel where its consequence fired.
export function Threads({ container, deps }) {
  const [paths, setPaths] = useState([]);
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const out = [];
      for (const target of el.querySelectorAll("[data-thread-target]")) {
        const seed = el.querySelector(`[data-seed-id="${target.dataset.threadTarget}"]`);
        if (!seed) continue;
        const a = seed.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = b.right - box.left - 6;
        const y2 = b.top + b.height / 2 - box.top;
        const bend = Math.min(box.width - 4, Math.max(x1, x2) + 40);
        out.push({ id: target.dataset.threadTarget, d: `M${x1},${y1} C${bend},${y1} ${bend},${y2} ${x2},${y2}` });
      }
      setPaths(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden data-testid="threads">
      {paths.map((p) => (
        <g key={p.id} data-thread={p.id}>
          <path d={p.d} fill="none" stroke="#241510" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
          <path d={p.d} fill="none" stroke="#ffd84d" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
