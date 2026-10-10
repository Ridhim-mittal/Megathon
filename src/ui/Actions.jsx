import { useState } from "react";
import { ACTIONS, actionAvailable, loanQuote, totalDebt } from "../engine/engine.js";
import { CFG, lessons } from "../engine/data.js";
import { useI18n, rupees } from "../i18n.js";
import { LoanTerms, Modal, RangeBand } from "./bits.jsx";
import { ACTION_ICON } from "./Scroll.jsx";
import { ChittiGame } from "./Chitti.jsx";
import { sipProjection } from "./projections.js";

export function Actions({ life, send }) {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(null);
  const last = life.cur.actions.at(-1);
  const lesson = last?.kind === "learn" ? lessons.find((l) => l.id === last.lesson) : null;
  return (
    <div className="mt-3" data-testid="actions">
      <div className="flex items-center justify-between">
        <h4 className="font-black">{t("act.title")}</h4>
        <span className="flex items-center gap-1 text-[12px] font-bold" aria-label={t("act.left", { n: life.energy })}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-ink ${i < life.energy ? "bg-gold" : "bg-ink/20"}`} />
          ))}
          <span className="ml-1">{t("act.left", { n: life.energy })}</span>
        </span>
      </div>
      {lesson && (
        <div className="rise mt-2 rounded-lg border-2 border-ink bg-indigo p-2 text-cream" data-testid="lesson">
          <p className="font-black">📖 {tx(lesson.title)}</p>
          <p className="text-[12px]">{tx(lesson.text)}</p>
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
        {ACTIONS.map((kind) => {
          const av = actionAvailable(life, kind);
          const locked = av.reason === "age";
          return (
            <button
              key={kind}
              className={`btn flex items-center gap-1.5 px-2 py-1.5 text-left text-[12px] leading-tight ${av.ok ? "bg-cream" : "bg-cream/50"}`}
              disabled={!av.ok}
              onClick={() => setOpen(kind)}
              data-testid={`tool-${kind}`}
            >
              <span className="text-lg" aria-hidden>
                {locked ? "🔒" : ACTION_ICON[kind]}
              </span>
              <span>
                {t(`tool.${kind}`)}
                <span className="block text-[10px] font-semibold opacity-80">
                  {locked ? t("act.locked", { age: av.at }) : av.ok ? t("act.cost") : t(`act.reason.${av.reason}`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button className="btn mt-3 w-full bg-ochre py-2" onClick={() => send({ type: "endActions" })}>
        {t("act.done")}
      </button>
      {open === "chitti" ? (
        <ChittiGame
          life={life}
          onCancel={() => setOpen(null)}
          onDone={({ monthly, bidPct }) => {
            send({ type: "action", action: { kind: "chitti", monthly, bidPct } });
            setOpen(null);
          }}
        />
      ) : (
        open && (
          <ActionSheet
            kind={open}
            life={life}
            onClose={() => setOpen(null)}
            onDo={(action) => {
              send({ type: "action", action: { kind: open, ...action } });
              setOpen(null);
            }}
          />
        )
      )}
    </div>
  );
}

function Choice({ options, value, onChange, render }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} className={`btn px-2 py-1 text-[12px] ${o === value ? "bg-ochre" : "bg-cream"}`} aria-pressed={o === value} onClick={() => onChange(o)}>
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function ActionSheet({ kind, life, onClose, onDo }) {
  const { t, tx } = useI18n();
  const [frac, setFrac] = useState(0.5);
  const monthlyOptions = [500, 1000, 2000, 5000].filter((m) => m * 12 <= Math.max(6000, life.income * 0.35));
  const current = kind === "rd" ? life.rdMonthly : kind === "sip" ? life.sipMonthly : 0;
  const [monthly, setMonthly] = useState(current || monthlyOptions[Math.min(1, monthlyOptions.length - 1)] || 500);
  const amounts = [10000, 25000, 50000, 100000, 200000].filter((a) => a <= Math.max(10000, life.income * 0.6));
  const [amount, setAmount] = useState(amounts[0]);
  const sources = [...(life.bank ? ["bank"] : []), "lender", "app"];
  const [source, setSource] = useState(sources[0]);
  const desc = {
    bank: t("tool.bank.d", { rate: CFG.rates.bank }),
    learn: t("tool.learn.d", { lesson: tx(lessons[life.lessons]?.title) }),
    fd: t("tool.fd.d", { rate: CFG.rates.fd }),
    rd: t("tool.rd.d", { rate: CFG.rates.rd }),
    gold: t("tool.gold.d"),
    sip: t("tool.sip.d"),
    insurance: t("tool.insurance.d", { premium: rupees(CFG.insurance.premium), cover: CFG.insurance.coverPct }),
    loan: t("tool.loan.d"),
    repay: t("tool.repay.d"),
  }[kind];
  let action = {};
  let body = null;
  if (kind === "fd" || kind === "gold") {
    action = { frac };
    body = <Choice options={[0.25, 0.5, 1]} value={frac} onChange={setFrac} render={(f) => t("amount.share", { pct: f * 100, amount: rupees(Math.round((life.wallet * f) / 100) * 100) })} />;
  }
  if (kind === "rd" || kind === "sip") {
    action = { monthly };
    body = (
      <>
        <Choice options={[...monthlyOptions, ...(current ? [0] : [])]} value={monthly} onChange={setMonthly} render={(m) => (m ? t("amount.monthly", { amount: rupees(m) }) : t("amount.stop"))} />
        {kind === "sip" && monthly > 0 && (
          <div className="mt-2">
            <TreeGrow value={life.sip} />
            <RangeBand series={sipProjection(life, monthly)} label={t("as.projection", { monthly: rupees(monthly) })} />
          </div>
        )}
      </>
    );
  }
  if (kind === "loan") {
    action = { amount, source };
    body = (
      <>
        <Choice options={amounts} value={amount} onChange={setAmount} render={(a) => rupees(a)} />
        <Choice options={sources} value={source} onChange={setSource} render={(s) => t(`loan.source.${s}`)} />
        <LoanTerms key={`${amount}${source}`} quote={loanQuote(life, amount, source)} />
      </>
    );
  }
  if (kind === "repay") {
    action = { frac };
    const can = Math.min(life.wallet, totalDebt(life));
    body = (
      <>
        <Choice options={[0.5, 1]} value={frac} onChange={setFrac} render={(f) => rupees(Math.round((can * f) / 100) * 100)} />
        <ul className="mt-2 text-[12px]">
          {[...life.loans].sort((a, b) => b.annualPct - a.annualPct).map((l) => (
            <li key={l.id}>
              {t(`loan.source.${l.fromRoleflip ? "roleflip" : l.source}`)} · {l.annualPct}% · {rupees(l.balance)}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <Modal label={t(`tool.${kind}`)} onClose={onClose}>
      <h2 className="text-lg font-black">
        {ACTION_ICON[kind]} {t(`tool.${kind}`)}
      </h2>
      <p className="mt-1 text-[13px]">{desc}</p>
      {body}
      <button className="btn mt-4 w-full bg-leaf py-2 text-cream" onClick={() => onDo(action)} data-testid="do-action">
        {t("act.confirm")} · {t("act.cost")}
      </button>
    </Modal>
  );
}

// A calm tree for the market: it grows with the SIP — no ticker.
function TreeGrow({ value }) {
  const s = Math.min(1, 0.35 + Math.log10(1 + value / 1000) / 3);
  return (
    <svg viewBox="0 0 80 60" className="mx-auto h-16" aria-hidden>
      <rect x="0" y="52" width="80" height="8" fill="#a0703c" />
      <g transform={`translate(40 52) scale(${s}) translate(-40 -52)`}>
        <rect x="37" y="30" width="6" height="22" fill="#6b4423" stroke="#241510" />
        <circle cx="40" cy="24" r="16" fill="#3d7a4a" stroke="#241510" strokeWidth="2" />
        <circle cx="30" cy="30" r="9" fill="#4f9a5e" stroke="#241510" strokeWidth="1.5" />
        <circle cx="51" cy="29" r="9" fill="#4f9a5e" stroke="#241510" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
