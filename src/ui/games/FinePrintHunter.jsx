import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Calculator, Clock, FileSearch, Scale, Search } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { MiniShell, useCountdown } from "./MiniShell.jsx";
import { AMOUNT, BANK, MONTHS, QUICKCASH, bankLoan, quickCash } from "./finePrint.js";

// Fine Print Hunter (L14 borrowing compared): a loan app's agreement says "only 1.5% a month, no
// hidden charges". 1) Tap the hidden charges. 2) Work out what you really pay back. 3) Pick the
// cheaper loan by "how much you pay back for every ₹100 you get". Win: 4 of 5 charges found and
// the cheaper loan picked. A wrong total is not a loss: the receipt shows the right sum.

const SECONDS = 45;
const NEED = 4;
const rs = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// The agreement's clauses, in order. `trap` clauses hide a cost; the chip shows what it costs.
const CLAUSES = [
  { key: "amount" },
  { key: "fee", trap: true },
  { key: "rate", trap: true },
  { key: "tenure" },
  { key: "insurance", trap: true },
  { key: "due" },
  { key: "late", trap: true },
  { key: "prepay", trap: true },
  { key: "care" },
];
const TRAPS = CLAUSES.filter((c) => c.trap).length;

function chipFor(key, q) {
  if (key === "fee") return `−${rs(q.fee)}`;
  if (key === "rate") return `+${rs(q.interest)}`;
  if (key === "insurance") return `+${rs(q.insurance)}`;
  if (key === "late") return `${rs(QUICKCASH.lateFeePerDay)}/day`;
  if (key === "prepay") return `+${rs(AMOUNT * QUICKCASH.prepayPct)}`;
  return "";
}

function Play({ onFinish }) {
  const { t } = useT();
  const q = quickCash();
  const b = bankLoan();
  const [phase, setPhase] = useState("find"); // find | total | compare
  const [found, setFound] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [penalty, setPenalty] = useState(0);
  const [guess, setGuess] = useState(null);
  const [pick, setPick] = useState(null);
  const foundRef = useRef([]);
  const raw = useCountdown(SECONDS, () => phase === "find" && setPhase("total"), phase === "find");
  const left = Math.max(0, raw - penalty);
  useEffect(() => {
    if (phase === "find" && left <= 0) setPhase("total");
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function tap(c) {
    if (phase !== "find" || foundRef.current.includes(c.key)) return;
    if (c.trap) {
      const next = [...foundRef.current, c.key];
      foundRef.current = next;
      setFound(next);
      sounds.marker?.();
      if (next.length === TRAPS) setTimeout(() => setPhase("total"), 700);
    } else {
      setWrong(c.key);
      setPenalty((p) => p + 3);
      sounds.thud?.();
      setTimeout(() => setWrong(null), 500);
    }
  }

  // Three totals: the right one, and the two usual mistakes (believing the ad, forgetting extras).
  const options = [
    { id: "ad", value: AMOUNT * (1 + QUICKCASH.monthlyFlat) }, // "1.5%", once
    { id: "right", value: q.payBack },
    { id: "interestOnly", value: AMOUNT + q.interest },
  ];

  return (
    <div className="fp-play">
      <div className="fp-top">
        {phase === "find" && (
          <>
            <span className="fp-step">{t(`fineprint.phase.${phase}`)}</span>
            <span className="fp-found">
              <Search size={16} aria-hidden="true" /> {found.length}/{TRAPS}
            </span>
            <span className={`fp-clock ${left <= 8 ? "hurry" : ""}`}>
              <Clock size={15} aria-hidden="true" /> {Math.ceil(left)}
            </span>
          </>
        )}
      </div>

      {phase === "find" && (
        <div className="fp-paper">
          <div className="fp-ad">
            <b>QuickCash</b> {t("fineprint.ad")}
          </div>
          <ol className="fp-clauses">
            {CLAUSES.map((c, i) => {
              const got = found.includes(c.key);
              return (
                <li key={c.key}>
                  <button className={`fp-clause ${got ? "found" : ""} ${wrong === c.key ? "wrong" : ""}`} onClick={() => tap(c)} disabled={got}>
                    <span className="fp-no">{i + 1}.</span>
                    <span>{t(`fineprint.clause.${c.key}`)}</span>
                    {got && <b className="fp-chip">{chipFor(c.key, q)}</b>}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="fp-sign">✍️ ____________</p>
        </div>
      )}

      {phase === "total" && (
        <div className="fp-total">
          <p className="fp-q">🧮 {t("fineprint.totalQ")}</p>
          {guess == null ? (
            <div className="fp-options">
              {options.map((o) => (
                <button
                  key={o.id}
                  className="fp-option"
                  onClick={() => {
                    setGuess(o.id);
                    (o.id === "right" ? sounds.right : sounds.wrong)?.();
                    for (let i = 0; i < 6; i++) setTimeout(() => sounds.printer?.(), 350 + i * 90);
                  }}
                >
                  {rs(o.value)}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className={`fp-verdict ${guess === "right" ? "good" : "bad"}`}>{guess === "right" ? t("fineprint.right") : t(`fineprint.mistake.${guess}`)}</p>
              <Receipt loan={q} />
              <button className="primary-button big" onClick={() => setPhase("compare")}>
                {t("fineprint.next")} <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {phase === "compare" && (
        <div className="fp-compare">
          <p className="fp-q">⚖️ {t("fineprint.compareQ")}</p>
          <div className="fp-offers">
            {[
              { id: "quick", name: "QuickCash", tag: t("fineprint.quickTag"), loan: q },
              { id: "bank", name: t("fineprint.bankName"), tag: t("fineprint.bankTag", { rate: Math.round(BANK.yearly * 100), fee: rs(BANK.fee) }), loan: b },
            ].map((o) => (
              <button key={o.id} className={`fp-offer offer-${o.id} ${pick === o.id ? (o.id === "bank" ? "right" : "wrongpick") : ""}`} disabled={pick != null} onClick={() => setPick(o.id)}>
                <b>{o.name}</b>
                <small>{o.tag}</small>
                <span className="fp-line">
                  🤲 {t("fineprint.inHand")} <b>{rs(o.loan.inHand)}</b>
                </span>
                <span className="fp-line">
                  🔁 {t("fineprint.payBack")} <b>{rs(o.loan.payBack)}</b>
                </span>
                {pick != null && (
                  <span className="fp-per100">
                    {t("fineprint.per100", { n: Math.round(o.loan.per100) })}
                    <i style={{ width: `${Math.min(100, (o.loan.per100 - 90) * 2.2)}%` }} />
                  </span>
                )}
              </button>
            ))}
          </div>
          {pick != null && (
            <>
              <p className={`fp-verdict ${pick === "bank" ? "good" : "bad"}`}>
                {pick === "bank" ? t("fineprint.saved", { amount: rs(q.payBack - b.payBack) }) : t("fineprint.pickedQuick")}
              </p>
              <button
                className="primary-button big"
                onClick={() => onFinish(found.length >= NEED && pick === "bank", t("fineprint.score", { n: found.length, total: TRAPS, saved: rs(q.payBack - b.payBack) }))}
              >
                {t("fineprint.finish")} <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// The honest sum: what reaches your hand, and what goes back.
function Receipt({ loan }) {
  const { t } = useT();
  return (
    <div className="fp-receipt">
      <p>
        <span>{t("fineprint.r.loan")}</span>
        <b>{rs(AMOUNT)}</b>
      </p>
      <p className="minus">
        <span>{t("fineprint.r.fee")}</span>
        <b>−{rs(loan.fee)}</b>
      </p>
      <p className="sum">
        <span>🤲 {t("fineprint.inHand")}</span>
        <b>{rs(loan.inHand)}</b>
      </p>
      <hr />
      <p>
        <span>{t("fineprint.r.loan")}</span>
        <b>{rs(AMOUNT)}</b>
      </p>
      <p className="plus">
        <span>{t("fineprint.r.interest")}</span>
        <b>+{rs(loan.interest)}</b>
      </p>
      <p className="plus">
        <span>{t("fineprint.r.insurance")}</span>
        <b>+{rs(loan.insurance)}</b>
      </p>
      <p className="sum">
        <span>🔁 {t("fineprint.payBack")}</span>
        <b>{rs(loan.payBack)}</b>
      </p>
      <p className="fp-takeaway">{t("fineprint.per100", { n: Math.round(loan.per100) })}</p>
    </div>
  );
}

export function FinePrintHunter({ mode = "story", avatar, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  return (
    <MiniShell
      id="fineprint"
      icon={FileSearch}
      ribbon={t("fineprint.ribbon")}
      title={t("fineprint.title")}
      lead={t("fineprint.lead")}
      mentor="mentor"
      avatar={avatar}
      mode={mode}
      steps={[
        { art: <Search size={28} />, text: t("fineprint.step1") },
        { art: <Calculator size={28} />, text: t("fineprint.step2") },
        { art: <Scale size={28} />, text: t("fineprint.step3") },
      ]}
      rule={t("fineprint.rule", { need: NEED, total: TRAPS })}
      wonText={t("fineprint.wonText")}
      lostText={t("fineprint.lostText")}
      play={(p) => <Play {...p} />}
      onWin={onWin}
      onClose={onClose}
      onGiveUp={onGiveUp}
    />
  );
}
