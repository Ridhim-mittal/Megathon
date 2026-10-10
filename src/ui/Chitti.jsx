import { useEffect, useMemo, useState } from "react";
import { CFG } from "../engine/data.js";
import { chittiOutcome, chittiSchedule } from "../engine/engine.js";
import { useI18n, rupees } from "../i18n.js";
import { Modal } from "./bits.jsx";

// 30-second chitti auction with 5 NPC members. No wheels, no luck animations:
// just people raising their hands, and an honest "what you gave up" at the end.
export function ChittiGame({ life, onDone, onCancel }) {
  const { t } = useI18n();
  const { seconds, maxBidPct, stepPct, members } = CFG.chitti;
  const choices = [1000, 2000, 5000].filter((m) => m * 12 <= Math.max(12000, life.income * 0.4));
  const [monthly, setMonthly] = useState(choices.at(-1) >= 2000 ? 2000 : choices[0]);
  const [phase, setPhase] = useState("pick");
  const [startAt, setStartAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [myBid, setMyBid] = useState(0);
  const [myLog, setMyLog] = useState([]);
  const schedule = useMemo(() => chittiSchedule(life.seed, life.age), [life.seed, life.age]);
  const pot = monthly * members;

  useEffect(() => {
    if (phase !== "auction") return;
    const id = setInterval(() => {
      const e = (Date.now() - startAt) / 1000;
      setElapsed(e);
      if (e >= seconds) setPhase("result");
    }, 100);
    return () => clearInterval(id);
  }, [phase, startAt, seconds]);

  const npcBids = schedule.bids.filter((b) => b.t <= elapsed);
  const npcHigh = npcBids.at(-1)?.pct ?? 0;
  const high = Math.max(npcHigh, myBid);
  const nextBid = Math.min(maxBidPct, high + stepPct);
  const result = phase === "result" ? chittiOutcome(life.seed, life.age, monthly, myBid) : null;
  const winner = schedule.bids.at(-1)?.member ?? 1;
  const feed = [...npcBids.map((b) => ({ t: b.t, text: t("ch.member", { n: b.member, pct: b.pct }) })), ...myLog].sort((a, b) => b.t - a.t);

  return (
    <Modal label={t("ch.title")} onClose={phase === "pick" ? onCancel : undefined}>
      <h2 className="text-lg font-black">🤝 {t("ch.title")}</h2>
      <p className="mt-1 text-[13px]">{t("ch.intro", { monthly: rupees(monthly), pot: rupees(pot) })}</p>
      {phase === "pick" && (
        <>
          <p className="mt-3 text-sm font-bold">{t("ch.pick")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {choices.map((m) => (
              <button key={m} className={`btn px-3 py-1 ${m === monthly ? "bg-ochre" : "bg-cream"}`} onClick={() => setMonthly(m)} aria-pressed={m === monthly}>
                {t("amount.monthly", { amount: rupees(m) })}
              </button>
            ))}
          </div>
          <button
            className="btn mt-4 w-full bg-leaf py-2 text-cream"
            onClick={() => {
              setStartAt(Date.now());
              setPhase("auction");
            }}
          >
            {t("ch.start")}
          </button>
        </>
      )}
      {phase === "auction" && (
        <div className="mt-3" data-testid="chitti-auction">
          <div className="flex items-center justify-between font-black">
            <span>{t("ch.time", { s: Math.max(0, Math.ceil(seconds - elapsed)) })}</span>
            <span>
              {high}% · {rupees((pot * high) / 100)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-ink/20">
            <div className="h-full bg-indigo" style={{ width: `${Math.min(100, (elapsed / seconds) * 100)}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1 text-center text-xl" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={npcBids.at(-1)?.member === n && npcHigh === high ? "rise" : "opacity-60"}>
                {npcBids.at(-1)?.member === n && npcHigh === high ? "🙋" : "🧑"}
              </span>
            ))}
            <span>{myBid === high && myBid ? "🙋" : "🫵"}</span>
          </div>
          <ul className="mt-2 h-20 overflow-y-auto rounded border-2 border-ink bg-white/70 p-1 text-[12px]" aria-live="polite">
            {feed.map((f, i) => (
              <li key={i}>{f.text}</li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              className="btn bg-ochre py-2 text-sm"
              disabled={myBid === high && myBid > 0 ? true : high >= maxBidPct}
              onClick={() => {
                setMyBid(nextBid);
                setMyLog((l) => [...l, { t: elapsed, text: t("ch.you", { pct: nextBid }) }]);
              }}
            >
              {t("ch.bid", { pct: nextBid })}
            </button>
            <button
              className="btn bg-cream py-2 text-sm"
              onClick={() => {
                setMyBid(0);
                setPhase("result");
              }}
            >
              {t("ch.wait")}
            </button>
          </div>
        </div>
      )}
      {result && (
        <div className="mt-3 space-y-2" data-testid="chitti-result">
          <p className="font-black">{result.won ? t("ch.won", { amount: rupees(result.takeEarly) }) : t("ch.lost", { n: winner })}</p>
          <Compare label={t("ch.early", { amount: rupees(result.earlyTotal) })} value={result.earlyTotal} max={result.waitTotal} color="#e9a53b" />
          <Compare label={t("ch.later", { amount: rupees(result.waitTotal) })} value={result.waitTotal} max={result.waitTotal} color="#3d7a4a" />
          <p className="text-[13px] font-bold text-debt">{t("ch.gaveUp", { amount: rupees(result.gaveUp), pct: result.yearlyCostPct })}</p>
          <button className="btn w-full bg-leaf py-2 text-cream" onClick={() => onDone({ monthly, bidPct: myBid })}>
            {t("ch.done")}
          </button>
        </div>
      )}
    </Modal>
  );
}

const Compare = ({ label, value, max, color }) => (
  <div>
    <div className="text-[12px] font-bold">{label}</div>
    <div className="h-3 rounded border-2 border-ink bg-white">
      <div className="h-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  </div>
);
