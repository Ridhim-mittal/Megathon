import { useState } from "react";
import mentorData from "../data/mentor.json";
import { hud, wheelState } from "../engine/engine.js";
import { METERS } from "../engine/data.js";
import { useI18n, rupees } from "../i18n.js";
import { Modal } from "./bits.jsx";

function conditions(life) {
  const year = life.years.at(-1);
  const age = life.cur?.age ?? life.age;
  const h = hud(life);
  return {
    always: true,
    debtGrew: Boolean(year && year.after.debt > year.before.debt),
    goalDropped: Boolean(year && (year.goalWithdrawn > 0 || year.after.goalPct < year.before.goalPct)),
    hasLoan: life.loans.length > 0,
    lowWallet: h.wallet < life.income * 0.25,
    marketAge: age >= 22,
    uninsured: age >= 23 && !life.insured,
    chittiAge: age >= 20,
  };
}

export function pickQuestions(life) {
  const c = conditions(life);
  const specific = mentorData.filter((q) => q.when !== "always" && c[q.when]);
  const general = mentorData.filter((q) => q.when === "always");
  return [...specific, ...general].slice(0, 3);
}

// Ask the server function (game state only). Any failure → canned JSON answer.
async function askServer(question, lang, life) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
  const h = hud(life);
  const w = wheelState(life);
  const state = { ...h, age: life.cur?.age ?? life.age, debtRate: w.dir < 0 ? w.rate : 0, insured: life.insured, loans: life.loans.length };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, lang, state }),
      signal: ctrl.signal,
    });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) return null;
    const data = await res.json();
    return typeof data.answer === "string" ? data.answer : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function Mentor({ life, open, setOpen }) {
  const { t, tx, lang } = useI18n();
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const qs = pickQuestions(life);
  const ask = async (q) => {
    setBusy(true);
    setAnswer({ q });
    const w = wheelState(life);
    const weakest = METERS.reduce((a, b) => (life.meters[a] <= life.meters[b] ? a : b));
    const canned = tx(q.a, { debtRate: w.rate, debtFlow: rupees(w.debtFlow), wallet: rupees(life.wallet), weakest: t(weakest) });
    const live = await askServer(q.q.en, lang, life);
    setAnswer({ q, text: live || canned });
    setBusy(false);
  };
  return (
    <>
      <button
        className="btn fixed bottom-4 left-3 z-40 flex items-center gap-1 rounded-full bg-paper p-1 text-[12px] min-[420px]:pr-3"
        aria-label={t("mentor.pick")}
        onClick={() => {
          setAnswer(null);
          setOpen(true);
        }}
        data-testid="mentor"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-ochre text-2xl" aria-hidden>
          👵
        </span>
        <span className="hidden min-[420px]:inline">{t("mentor.pick")}</span>
      </button>
      {open && (
        <Modal label={t("mentor.pick")} onClose={() => setOpen(false)}>
          <div className="flex items-start gap-2">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink bg-ochre text-3xl" aria-hidden>
              👵
            </span>
            <p className="rounded-xl border-2 border-ink bg-white p-2 text-[13px]" data-testid="mentor-answer" aria-live="polite">
              {!answer ? t("mentor.hello") : busy ? t("mentor.thinking") : answer.text}
            </p>
          </div>
          <div className="mt-3 space-y-1.5">
            {qs.map((q) => (
              <button key={q.id} className="btn block w-full bg-cream px-2 py-1.5 text-left text-[13px]" onClick={() => ask(q)} disabled={busy}>
                {t("mentor.why")} {tx(q.q)}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
