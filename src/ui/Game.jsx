import { useCallback, useEffect, useRef, useState } from "react";
import { cardById, crossById } from "../engine/data.js";
import { currentStep, eraFor, isFastForward } from "../engine/engine.js";
import { useI18n, rupees, signed } from "../i18n.js";
import { Hud, House } from "./Hud.jsx";
import { YearPanel, Threads, Seed, ACTION_ICON, optionLabel, useNoteText } from "./Scroll.jsx";
import { VillageArt } from "./VillageArt.jsx";
import { Pots, AutoSplit } from "./Pots.jsx";
import { Actions } from "./Actions.jsx";
import { EventCard } from "./EventCard.jsx";
import { Crossroads } from "./Crossroads.jsx";
import { RoleFlip } from "./RoleFlip.jsx";
import { Phone, Toasts } from "./Phone.jsx";
import { Mentor } from "./Mentor.jsx";
import { Assumptions, Settings } from "./Panels.jsx";
import { Ending } from "./Ending.jsx";
import { METER_ICON, METERS } from "./bits.jsx";

export function Game({ life, send, meta, setMeta, onMenu, onNewLife }) {
  const step = currentStep(life);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [toasts, setToasts] = useState([]);
  const scrollRef = useRef(null);
  const currentRef = useRef(null);
  const dismiss = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (x) => {
      const id = `${Date.now()}${Math.random()}`;
      setToasts((ts) => [...ts, { ...x, id }]);
      setTimeout(() => dismiss(id), 7000);
    },
    [dismiss],
  );

  const stepKey = `${life.cur?.age}-${step?.kind}-${step?.cardId || step?.msgId || ""}`;
  useEffect(() => {
    if (!currentRef.current || step?.kind === "event") return;
    currentRef.current.scrollIntoView({ block: step?.kind === "yearEnd" ? "end" : "start", behavior: "smooth" });
  }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (life.phase === "ending") return <Ending life={life} meta={meta} setMeta={setMeta} onNewLife={onNewLife} onMenu={onMenu} />;

  const cur = life.cur;
  const past = life.years.filter((y) => y.age !== cur.age);
  const queuedEvents = life.queue.filter((q) => q.kind === "event").length;
  const total = cur.events.length + queuedEvents;

  return (
    <div className="min-h-dvh pb-28">
      <Hud life={life} onAssumptions={() => setPanel("assumptions")} onSettings={() => setPanel("settings")} onMenu={onMenu} />
      <House life={life} />
      <main className="relative mx-auto max-w-xl pl-2 pr-14 pt-3 sm:pr-24">
        <div ref={scrollRef} className="relative flex flex-col gap-3" data-testid="scroll">
          {past.map((y) => (
            <YearPanel key={y.age} year={y} />
          ))}
          <div ref={currentRef}>
            <CurrentYear life={life} step={step} send={send} openPhone={() => setPhoneOpen(true)} openWhy={() => setMentorOpen(true)} />
          </div>
          <Threads container={scrollRef} deps={[life.years.length, cur.events.length, stepKey, meta.lang]} />
        </div>
      </main>
      <Mentor life={life} open={mentorOpen} setOpen={setMentorOpen} />
      <Phone life={life} step={step} send={send} toast={toast} open={phoneOpen} setOpen={setPhoneOpen} />
      <Toasts items={toasts} dismiss={dismiss} />
      {step?.kind === "event" && !phoneOpen && <EventCard key={step.cardId} life={life} step={step} index={cur.events.length + 1} total={total} send={send} />}
      {step?.kind === "crossroads" && <Crossroads life={life} step={step} send={send} />}
      {step?.kind === "roleflip" && <RoleFlip send={send} />}
      {panel === "assumptions" && <Assumptions life={life} onClose={() => setPanel(null)} />}
      {panel === "settings" && <Settings meta={meta} setMeta={setMeta} onClose={() => setPanel(null)} />}
    </div>
  );
}

function CurrentYear({ life, step, send, openPhone, openWhy }) {
  const { t, tx } = useI18n();
  const cur = life.cur;
  const ff = isFastForward(cur.age);
  return (
    <section key={cur.age} className="unroll panel panel-current overflow-hidden pt-3 pb-3" data-testid="current-year" data-age={cur.age}>
      <VillageArt era={eraFor(cur.age)} className="border-b-2 border-ink" />
      <div className="space-y-1 px-3 pt-2 text-[13px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{t("age", { age: cur.age })}</h2>
          {ff && <span className="rounded bg-indigo px-1.5 py-0.5 text-[10px] font-black text-cream">⏩ {t("year.fast")}</span>}
        </div>
        {cur.crossroads && (
          <p className="font-bold text-indigo">
            🛤 {tx(crossById[cur.crossroads.id].title)}: {optionLabel(tx, "crossroads", cur.crossroads.id, cur.crossroads.optionId)}
            {cur.crossroads.planted && <Seed id={cur.crossroads.planted} />}
          </p>
        )}
        {cur.income > 0 && (
          <p className="flex items-center gap-2 font-bold" data-testid="income">
            <span className="coin-drop grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-gold font-black shadow-[1px_1px_0_#241510]" aria-hidden>
              ₹
            </span>
            {t("coin", { amount: rupees(cur.income) })}
          </p>
        )}
        {step?.kind === "budget" ? <Pots life={life} onSeal={send} /> : cur.split && <AutoSplit split={cur.split} />}
        {cur.roleflip && <p className="font-bold">🏢 {t("rf.title")} → {t(`rf.${cur.roleflip.mostPicked}`)}</p>}
        {step?.kind === "actions" ? (
          <Actions life={life} send={send} />
        ) : (
          cur.actions.length > 0 && (
            <p>
              {t("year.actions")}:{" "}
              {cur.actions.map((a, i) => (
                <span key={i} className="mr-1" title={t(`tool.${a.kind}`)}>
                  {ACTION_ICON[a.kind]}
                </span>
              ))}
            </p>
          )
        )}
        <ul className="space-y-0.5">
          {cur.events.map((e, i) => (
            <li key={i} data-thread-target={e.seedId || undefined} className={e.seedId ? "rounded bg-[#ffe9a8] px-1" : ""}>
              {cardById[e.cardId].art} <b>{tx(cardById[e.cardId].title)}</b> → {optionLabel(tx, "event", e.cardId, e.optionId)}
              {e.planted && <Seed id={e.planted} />}
            </li>
          ))}
          {step?.kind === "event" && (
            <li data-thread-target={step.seedId || undefined} className="opacity-70">
              {cardById[step.cardId].art} {tx(cardById[step.cardId].title)} …
            </li>
          )}
        </ul>
        {step?.kind === "message" && (
          <button className="btn buzz-once mt-1 w-full bg-indigo py-2 text-cream" onClick={openPhone} data-testid="phone-prompt">
            📳 {t("phone.new")}
          </button>
        )}
        {cur.message && (
          <p>
            📱 {cur.message.verdict === "flag" ? "🚩" : "↩"}
            {cur.message.planted && <Seed id={cur.message.planted} />}
          </p>
        )}
        {step?.kind === "yearEnd" && <YearEnd life={life} send={send} openWhy={openWhy} />}
      </div>
    </section>
  );
}

function YearEnd({ life, send, openWhy }) {
  const { t } = useI18n();
  const noteText = useNoteText();
  const y = life.cur;
  const last = y.age >= 32;
  const diff = (k) => y.after[k] - y.before[k];
  return (
    <div className="mt-2 border-t-2 border-dashed border-ink pt-2" data-testid="year-end">
      <div className="stamp mx-auto w-fit rounded-md border-[3px] border-red px-3 py-1 text-center text-lg font-black uppercase text-red">{t("year.stamp", { age: y.age })}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-1 text-[12px] font-bold">
        <span className="rounded border-2 border-ink bg-cream px-1.5">₹ {signed(diff("wallet"))}</span>
        <span className="rounded border-2 border-ink bg-[#ffe1dc] px-1.5 text-debt">
          {t("debt")} {signed(diff("debt"))}
        </span>
        <span className="rounded border-2 border-ink bg-cream px-1.5">🏡 {signed(diff("goalPct"))}%</span>
        {METERS.map((m) =>
          diff(m) ? (
            <span key={m} className="rounded border-2 border-ink bg-cream px-1.5">
              {METER_ICON[m]} {signed(diff(m))}
            </span>
          ) : null,
        )}
      </div>
      {y.goalWithdrawn > 0 && <p className="mt-1 text-[12px] font-bold text-debt">🧱 {t("year.bricksFell", { amount: rupees(y.goalWithdrawn) })}</p>}
      {y.notes.map((n, i) => (
        <p key={i} className="text-[12px] italic">
          {noteText(n)}
        </p>
      ))}
      {y.luck.map((l, i) => (
        <p key={`l${i}`} className="text-[12px]">
          🎲 {t(`year.${l.key}`, { pct: signed(l.pct) })}
        </p>
      ))}
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
        <button className="btn bg-cream px-3 py-2" onClick={openWhy} data-testid="why">
          {t("year.why")}
        </button>
        <button className="btn bg-leaf py-2 text-cream" onClick={() => send({ type: "nextYear" })} data-testid="next-year">
          {last ? t("year.end") : t("year.next")}
        </button>
      </div>
    </div>
  );
}
