import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, BookOpen, CalendarCheck, ChevronDown, ChevronUp, Home, Landmark, MessageSquare, Smartphone, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { headlineText } from "./movements.js";
import { sounds } from "./sound.js";

// Phone notifications over the map, so updates and SMSes show without opening the phone.
// New messages pop up for a few seconds (a scam reveal stays until dismissed); the bell opens
// the full list. Waiting phone events and "go home" show at the top as things to do.
const POP_MS = 7000;
const shortId = (cardId) => String(cardId ?? "").split(".")[2] ?? "";

export function NotificationTray({ messages, phoneEvents, canFinish, active, onOpenPhoneEvent, onGoHome, onLearn }) {
  const { t } = useT();
  const newest = messages[0]?.id ?? 0;
  // Messages that existed when the map opened are already "seen": no pop-ups for an old save.
  const [seen, setSeen] = useState(newest);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const [popTimes, setPopTimes] = useState({});

  const unseen = messages.filter((m) => m.id > seen);
  // Start each new message's pop-up clock once the map is free to show it.
  useEffect(() => {
    if (!active) return;
    const now = Date.now();
    setPopTimes((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const m of unseen) if (!next[m.id]) (next[m.id] = now), (changed = true);
      if (changed) sounds.ping();
      return changed ? next : prev;
    });
  }, [active, unseen.map((m) => m.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const [, tick] = useState(0);
  useEffect(() => {
    if (!active || !unseen.length) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active, unseen.length]);

  const now = Date.now();
  const sticky = (m) => m.kind === "scamReveal";
  const popups = active ? unseen.filter((m) => !dismissed.has(m.id) && (sticky(m) || !popTimes[m.id] || now - popTimes[m.id] < POP_MS)).slice(0, 3) : [];

  const dismiss = (id) => setDismissed((d) => new Set(d).add(id));
  const toggle = () => {
    setOpen(!open);
    setSeen(newest);
  };

  const todo = useMemo(() => {
    const list = phoneEvents.map((e) => ({ key: e.key, type: "phone", title: e.title }));
    if (canFinish) list.push({ key: "home", type: "home" });
    return list;
  }, [phoneEvents, canFinish]);

  if (!active) return null;
  const badge = unseen.length;
  return (
    <aside className={`notif-tray ${open ? "open" : ""}`} aria-label={t("inbox.title")}>
      <button className="notif-head" aria-expanded={open} aria-label={badge ? `${t("inbox.title")} (${badge})` : t("inbox.title")} title={t("inbox.title")} onClick={toggle}>
        <Bell size={15} aria-hidden="true" />
        <strong>{t("inbox.title")}</strong>
        {badge > 0 && <b className="badge">{badge}</b>}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {todo.map((x) =>
        x.type === "phone" ? (
          <button key={x.key} className="notif todo phone" onClick={onOpenPhoneEvent}>
            <Smartphone size={15} aria-hidden="true" />
            <span>
              <small>{t("inbox.phoneEvent")}</small>
              <b>{x.title ? <Plain value={x.title} /> : t("phone.apps.messages")}</b>
            </span>
            <em>{t("inbox.open")}</em>
          </button>
        ) : (
          <button key={x.key} className="notif todo home" onClick={onGoHome}>
            <Home size={15} aria-hidden="true" />
            <span>
              <b>{t("quest.done")}</b>
            </span>
            <em>{t("quest.goHome")}</em>
          </button>
        ),
      )}
      {!open && (
        <div className="notif-pops" aria-live="polite">
          {popups.map((m) => (
            <Message key={m.id} m={m} onLearn={onLearn} onDismiss={() => dismiss(m.id)} pop />
          ))}
        </div>
      )}
      {open && (
        <ul className="notif-list">
          {messages.length === 0 && <li className="quiet">{t("phone.noMessages")}</li>}
          {messages.map((m) => (
            <li key={m.id}>
              <Message m={m} onLearn={onLearn} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function Plain({ value }) {
  const { plain } = useT();
  return <>{plain(value)}</>;
}

// One message: who it's from, and what it says, by kind.
function Message({ m, onLearn, onDismiss, pop = false }) {
  const { t, rich, plain, money } = useT();
  const card = shortId(m.cardId);
  const per = (base, vars) => {
    const own = t(`${base}.${card}`, vars);
    return own.startsWith(`${base}.`) ? t(`${base}.default`, vars) : own;
  };
  let from;
  let body;
  let Icon = MessageSquare;
  let tone = "";
  switch (m.kind) {
    case "chapter":
      Icon = BookOpen;
      from = t("inbox.from.game");
      body = t("inbox.chapter", { name: t(`chapter.names.${m.chapterId}`), n: m.required });
      break;
    case "phoneGift":
      Icon = Smartphone;
      from = t("inbox.from.amma");
      body = t("chapter.phoneGift");
      break;
    case "year":
      Icon = CalendarCheck;
      from = t("inbox.from.game");
      body = `${t("inbox.year", { age: m.yearAge })} ${headlineText(m.headline, { t, money })}`;
      tone = m.netWorthChange < 0 ? "down" : "";
      break;
    case "scamHook":
      from = per("inbox.hookFrom");
      body = per("inbox.hook");
      break;
    case "debit":
      Icon = Landmark;
      from = per("inbox.debitFrom");
      body = per("inbox.debit", { amount: money(m.amount) });
      tone = "down";
      break;
    case "scamReveal":
      Icon = AlertTriangle;
      from = t("inbox.from.alert");
      tone = "alert";
      break;
    default:
      return null;
  }
  return (
    <div className={`notif msg kind-${m.kind} ${tone} ${pop ? "pop" : ""}`} role={m.kind === "scamReveal" && pop ? "alert" : undefined}>
      <Icon size={15} aria-hidden="true" />
      <span>
        <small>
          {from} · {t("common.age", { age: m.age })}
        </small>
        {m.kind === "scamReveal" ? (
          <>
            <b>{t("inbox.reveal", { title: plain(m.title) })}</b>
            {m.outcome && <span className="notif-body">{rich(m.outcome)}</span>}
            <span className="notif-body">{t("inbox.revealLost", { amount: money(m.amount) })}</span>
            <span className="notif-help">{t("inbox.help")}</span>
            {m.lesson && onLearn && (
              <button className="text-button" onClick={() => onLearn(m.lesson)}>
                {t("gyaan.learnMore")}
              </button>
            )}
          </>
        ) : (
          <span className="notif-body">{body}</span>
        )}
      </span>
      {onDismiss && (
        <button className="notif-x" onClick={onDismiss} aria-label={t("inbox.dismiss")}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}
