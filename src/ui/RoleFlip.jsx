import { useState } from "react";
import { roleflipTable, scoreRoleflip } from "../engine/engine.js";
import { useI18n, rupees } from "../i18n.js";

// "Instant Loan Pvt Ltd — Day 1": the player authors the terms, then lives with them.
export function RoleFlip({ send }) {
  const { t } = useI18n();
  const table = roleflipTable();
  const [stage, setStage] = useState("intro");
  const [picks, setPicks] = useState({});
  const i = Object.keys(picks).length;
  const score = scoreRoleflip(picks);
  const pick = (cid, oid) => {
    const next = { ...picks, [cid]: oid };
    setPicks(next);
    if (Object.keys(next).length === table.length) setStage("reveal");
  };
  const best = (c) => [...c.offers].sort((a, b) => b.profit - a.profit)[0].id;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-indigo text-cream" role="dialog" aria-modal="true" aria-labelledby="rf-title" data-testid="roleflip">
      <div className="ikat" />
      <div className="mx-auto max-w-md px-3 py-4">
        <h2 id="rf-title" className="text-xl font-black">
          🏢 {t("rf.title")}
        </h2>
        {stage === "intro" && (
          <>
            <p className="mt-2 text-[14px]">{t("rf.intro")}</p>
            <button className="btn mt-4 w-full bg-gold py-2 text-ink" onClick={() => setStage("work")}>
              {t("rf.start")}
            </button>
          </>
        )}
        {stage === "work" && i < table.length && (
          <Customer key={table[i].id} c={table[i]} i={i} onPick={(oid) => pick(table[i].id, oid)} running={score.profit} />
        )}
        {stage === "reveal" && (
          <div className="mt-3 space-y-3" data-testid="rf-reveal">
            <p className="text-lg font-black text-gold">{t("rf.score", { amount: rupees(score.profit), max: rupees(score.maxProfit) })}</p>
            <ul className="space-y-1 text-[13px]">
              {table.map((c) => {
                const mine = c.offers.find((o) => o.id === picks[c.id]);
                const top = c.offers.find((o) => o.id === best(c));
                return (
                  <li key={c.id} className="rounded border-2 border-ink bg-paper p-2 text-ink">
                    {c.art} {t(`rf.${mine.id}`)}: EMI {rupees(mine.emi)} · {t("rf.profit", { amount: rupees(mine.profit) })}
                    <br />
                    <b>★ {t(`rf.${top.id}`)}: EMI {rupees(top.emi)} × {top.months} · {t("rf.profit", { amount: rupees(top.profit) })}</b>
                  </li>
                );
              })}
            </ul>
            <p className="rounded-lg border-[3px] border-ink bg-gold p-3 text-[15px] font-black text-ink shadow-[3px_3px_0_#241510]">{t("rf.reveal")}</p>
            <p className="text-[14px]">{t("rf.returns", { name: t(`rf.${score.mostPicked}`) })}</p>
            <button className="btn w-full bg-cream py-2 text-ink" onClick={() => send({ type: "roleflip", picks })}>
              {t("rf.wake")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Customer({ c, i, onPick, running }) {
  const { t } = useI18n();
  return (
    <div className="rise mt-3" data-testid={`rf-customer-${c.id}`}>
      <p className="text-[12px] font-bold uppercase text-gold">
        {t("rf.customer", { i: i + 1 })} · {t("rf.profit", { amount: rupees(running) })}
      </p>
      <p className="mt-1 flex items-center gap-2 text-[15px] font-bold">
        <span className="text-3xl" aria-hidden>
          {c.art}
        </span>
        {t(`rf.${c.id}`, { amount: rupees(c.amount) })}
      </p>
      <div className="mt-2 space-y-2">
        {c.offers.map((o) => (
          <button key={o.id} className="btn block w-full bg-paper p-2 text-left text-ink" onClick={() => onPick(o.id)} data-testid={`rf-offer-${o.id}`}>
            <span className="font-black">{t("rf.offer", { name: t(`rf.${o.id}`) })}</span>
            <span className="block text-[12px]">
              EMI {rupees(o.emi)} × {o.months} · {o.annualPct}% · {t("loan.fee", { fee: rupees(o.fee) })}
            </span>
            <span className="block text-[12px] font-black text-debt">
              {t("loan.total")}: {rupees(o.totalRepay)}
            </span>
            <span className="block text-[12px] font-bold text-leaf">{t("rf.profit", { amount: rupees(o.profit) })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
