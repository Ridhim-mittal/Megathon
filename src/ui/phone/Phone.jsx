import React, { useCallback, useEffect, useRef, useState } from "react";
import { select } from "../gameAdapter.js";
import { LessonPage } from "../gyaan/LessonPage.jsx";
import { PixelIcon } from "./PixelIcon.jsx";
import { usePhoneText } from "./strings.js";
import { BankApp } from "./apps/BankApp.jsx";
import { InvestApp } from "./apps/InvestApp.jsx";
import { MessagesApp } from "./apps/MessagesApp.jsx";
import { GyaanApp } from "./apps/GyaanApp.jsx";
import "./phone.css";

const APPS = [
  { id: "bank", icon: "bank", Component: BankApp },
  { id: "invest", icon: "invest", Component: InvestApp },
  { id: "messages", icon: "messages", Component: MessagesApp },
  { id: "gyaan", icon: "gyaan", Component: GyaanApp },
];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const APP_IDS = APPS.map((a) => a.id);

// The in-game phone. `dispatch(action)` returns null or an error { message }.
// Same props as src/ui/PhoneLite.jsx, so the map can swap it in: `initialApp` opens one app
// directly; `onLearn` is accepted but not needed, because lessons open inside this phone.
export function Phone({ life, dispatch, onClose, onNotification, onLearn, initialApp = null }) {
  const { s, money, lang } = usePhoneText();
  const [app, setApp] = useState(APP_IDS.includes(initialApp) ? initialApp : null);
  const [lesson, setLesson] = useState(null); // { id, kind }
  const [note, setNote] = useState(null); // { tone: "ok" | "error", text }
  const phoneRef = useRef(null);
  // An open app may set this to handle "back" itself (e.g. instrument page → list); it returns true if it did.
  const appBack = useRef(null);

  const hud = select.hud(life);
  const phone = select.phone(life);
  const unread = phone.notifications.length;

  // Run an engine action and show what happened.
  const run = useCallback(
    (action, okText) => {
      const err = dispatch(action);
      setNote(err ? { tone: "error", text: err.message } : { tone: "ok", text: okText ?? s("working") });
      return !err;
    },
    [dispatch, s],
  );

  const goBack = useCallback(() => {
    setNote(null);
    if (lesson) setLesson(null);
    else if (appBack.current?.()) return;
    else if (app) setApp(null);
    else onClose();
  }, [lesson, app, onClose]);

  // Escape steps back (lesson → app → home → closed); Tab stays inside the phone.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Tab" && phoneRef.current) {
        const items = [...phoneRef.current.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  // Remember what had focus, and give it back when the phone closes.
  useEffect(() => {
    const prev = document.activeElement;
    phoneRef.current?.querySelector(".ph-home-grid button, .ph-body button")?.focus();
    return () => prev?.focus?.();
  }, []);

  // Moving between screens puts focus on the new screen's heading.
  useEffect(() => {
    const target = phoneRef.current?.querySelector("[data-autofocus]") ?? phoneRef.current?.querySelector(".ph-home-grid button");
    target?.focus();
  }, [app, lesson]);

  const openApp = (id) => {
    setNote(null);
    appBack.current = null;
    setApp(id);
  };

  const current = APPS.find((a) => a.id === app);
  const title = lesson ? s("app_gyaan") : current ? s(`app_${current.id}`) : s("phone");

  return (
    <div className="ph-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="ph-phone" role="dialog" aria-modal="true" aria-label={s("phone")} ref={phoneRef} lang={lang}>
        <div className="ph-speaker" aria-hidden="true" />
        <div className="ph-screen">
          <header className="ph-status" aria-label={s("statusAria", { age: hud.age, cash: money(hud.cash) })}>
            <span className="ph-status-age">{s("age", { age: hud.age })}</span>
            <span className="ph-status-title" aria-hidden="true">{title}</span>
            <span className="ph-status-right">
              <span className="ph-status-cash">{money(hud.cash)}</span>
              <PixelIcon name="signal" size={16} />
              <PixelIcon name="battery" size={20} />
            </span>
          </header>

          <div className="ph-body">
            {lesson && <LessonPage id={lesson.id} kind={lesson.kind} onClose={() => setLesson(null)} />}
            {current ? (
              // Stays mounted under a lesson, so closing the lesson returns to the same screen.
              <div hidden={Boolean(lesson)}>
                <current.Component
                  life={life}
                  run={run}
                  openLesson={(id, kind = "lesson") => setLesson({ id, kind })}
                  onNotification={onNotification}
                  backRef={appBack}
                />
              </div>
            ) : lesson ? null : (
              <div className="ph-home">
                <h2 className="ph-sr-only">{s("homeScreen")}</h2>
                <ul className="ph-home-grid">
                  {APPS.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="ph-app-icon"
                        onClick={() => openApp(a.id)}
                        aria-label={a.id === "messages" && unread ? `${s(`app_${a.id}`)} (${s("unread", { n: unread })})` : s(`app_${a.id}`)}
                      >
                        <span className={`ph-app-tile ph-tile-${a.id}`}>
                          <PixelIcon name={a.icon} size={40} />
                          {a.id === "messages" && unread > 0 && <span className="ph-badge" aria-hidden="true">{unread}</span>}
                        </span>
                        <span className="ph-app-label">{s(`app_${a.id}`)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {note && (
            <p className={`ph-note ph-note-${note.tone}`} role={note.tone === "error" ? "alert" : "status"}>
              {note.text}
            </p>
          )}

          <nav className="ph-nav" aria-label={s("phone")}>
            <button type="button" className="ph-nav-btn" onClick={goBack} aria-label={app || lesson ? s("back") : s("close")}>
              ◀
            </button>
            <button
              type="button"
              className="ph-nav-btn ph-nav-home"
              onClick={() => {
                setNote(null);
                setLesson(null);
                appBack.current = null;
                setApp(null);
              }}
              aria-label={s("homeScreen")}
            >
              ●
            </button>
            <button type="button" className="ph-nav-btn" onClick={onClose} aria-label={s("close")}>
              ✕
            </button>
          </nav>
        </div>
      </section>
    </div>
  );
}

export default Phone;
