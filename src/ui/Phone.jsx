import { useRef, useState } from "react";
import { msgById } from "../engine/data.js";
import { eraFor } from "../engine/engine.js";
import { useI18n } from "../i18n.js";
import { Modal } from "./bits.jsx";

// Phone inbox (scam module). Messages arrive mid-year; swipe left to flag, right to reply.
export function Phone({ life, step, send, toast, open, setOpen }) {
  const { t, tx } = useI18n();
  const pending = step?.kind === "message" ? msgById[step.msgId] : null;
  const smart = eraFor(life.cur?.age ?? life.age).phone === "smart";
  const history = life.years.filter((y) => y.message).reverse();

  const decide = (verdict) => {
    const msg = pending;
    send({ type: "message", msgId: msg.id, verdict });
    if (msg.scam && verdict === "flag") toast({ tone: "good", title: t("phone.goodCatch"), body: tx(msg.fact) });
    else if (!msg.scam && verdict === "flag") toast({ tone: "bad", title: t("phone.wasReal"), body: tx(msg.fact) });
    else toast({ tone: "plain", title: t("phone.replied") });
    setOpen(false);
  };

  return (
    <>
      <button
        className={`btn fixed bottom-4 right-3 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-indigo text-2xl text-cream ${pending ? "buzz" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={`${t("phone.open")}${pending ? " (1)" : ""}`}
        data-testid="phone"
      >
        <span aria-hidden>{smart ? "📱" : "📟"}</span>
        {pending && (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-debt text-xs font-black" data-testid="phone-badge">
            1
          </span>
        )}
      </button>
      {open && (
        <Modal label={t("phone.open")} onClose={() => setOpen(false)}>
          <h2 className="text-lg font-black">{smart ? "📱" : "📟"} {t("phone.open")}</h2>
          {pending ? <SwipeCard key={pending.id} msg={pending} onDecide={decide} /> : <p className="mt-2 text-sm">{t("phone.empty")}</p>}
          {history.length > 0 && (
            <ul className="mt-4 space-y-1 border-t-2 border-ink pt-2 text-[12px]">
              {history.map((y) => (
                <li key={y.age} className="opacity-80">
                  {t("age", { age: y.age })} · {tx(msgById[y.message.msgId].sender)} · {y.message.verdict === "flag" ? "🚩" : "↩"}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}

function SwipeCard({ msg, onDecide }) {
  const { t, tx } = useI18n();
  const [dx, setDx] = useState(0);
  const [hint, setHint] = useState(false);
  const start = useRef(null);
  const onDown = (e) => {
    start.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => start.current !== null && setDx(e.clientX - start.current);
  const onUp = () => {
    if (dx < -90) onDecide("flag");
    else if (dx > 90) onDecide("reply");
    start.current = null;
    setDx(0);
  };
  return (
    <div className="mt-2" data-testid="message">
      <p className="text-center text-[11px] font-bold opacity-70">{t("phone.swipe")}</p>
      <div className="relative mt-1">
        <div className="absolute inset-0 flex items-center justify-between rounded-xl px-3 text-xl font-black" aria-hidden>
          <span className={dx < -20 ? "opacity-100" : "opacity-20"}>🚩</span>
          <span className={dx > 20 ? "opacity-100" : "opacity-20"}>↩</span>
        </div>
        <div
          className="relative touch-pan-y select-none rounded-xl border-[3px] border-ink bg-white p-3 shadow-[3px_3px_0_#241510]"
          style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: start.current === null ? "transform .2s" : "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <p className="text-[12px] font-black text-indigo">{tx(msg.sender)}</p>
          <p className="mt-1 text-[14px]">{tx(msg.text)}</p>
        </div>
      </div>
      <button className="btn mt-2 w-full bg-ochre/60 py-1 text-[12px]" onClick={() => setHint((h) => !h)} aria-expanded={hint}>
        🧔 {t("phone.tenali")}
      </button>
      {hint && <p className="rise mt-1 rounded-lg border-2 border-ink bg-paper p-2 text-[12px] italic" data-testid="tenali">{tx(msg.hint)}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn bg-debt py-2 text-cream" onClick={() => onDecide("flag")}>
          {t("phone.flag")}
        </button>
        <button className="btn bg-leaf py-2 text-cream" onClick={() => onDecide("reply")}>
          {t("phone.reply")}
        </button>
      </div>
    </div>
  );
}

export function Toasts({ items, dismiss }) {
  const tones = { good: "bg-[#d6efc9]", bad: "bg-[#ffd9d2]", plain: "bg-cream" };
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-[70] mx-auto flex max-w-md flex-col gap-2 px-3" aria-live="polite">
      {items.map((x) => (
        <div key={x.id} className={`rise pointer-events-auto rounded-lg border-[3px] border-ink p-2 shadow-[3px_3px_0_#241510] ${tones[x.tone]}`} role="status" data-testid="toast">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-black">{x.title}</p>
            <button className="text-sm font-black" onClick={() => dismiss(x.id)} aria-label="×">
              ×
            </button>
          </div>
          {x.body && <p className="text-[12px]">{x.body}</p>}
        </div>
      ))}
    </div>
  );
}
