import React, { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { askMentor, suggestedQuestions } from "./gameAdapter.js";
import { Portrait } from "./Portrait.jsx";

// A side panel: ask a question, get Ammamma's answer (AI if /api/ask works, otherwise the
// closest answer from her offline notebook).
export function AskAmmamma({ state, lesson, onClose, onAsked }) {
  const { t, pick, lang } = useT();
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function ask(q) {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuestion("");
    setThread((th) => [...th, { from: "you", text }]);
    const res = await askMentor({ question: text, language: lang, state });
    onAsked?.();
    setThread((th) => [
      ...th,
      { from: "ammamma", text: res.answer ? pick(res.answer) : t("ask.noAnswer"), offline: res.source === "offline" },
    ]);
    setBusy(false);
  }

  return (
    <aside className="ask-panel" role="dialog" aria-modal="false" aria-label={t("ask.title")}>
      <header>
        <Portrait role="mentor" className="ask-portrait" />
        <h2>{t("ask.title")}</h2>
        <button className="panel-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={18} />
        </button>
      </header>
      <div className="ask-thread" aria-live="polite">
        {!thread.length && (
          <div className="ask-try">
            <span>{t("ask.try")}</span>
            {suggestedQuestions(lesson).map((f) => (
              <button key={f.id} type="button" onClick={() => ask(pick(f.q))}>
                {pick(f.q)}
              </button>
            ))}
          </div>
        )}
        {thread.map((m, i) => (
          <p key={i} className={`bubble ${m.from}`}>
            {m.offline && <small>{t("ask.offline")}</small>}
            {m.text}
          </p>
        ))}
        {busy && <p className="bubble ammamma thinking">{t("ask.thinking")}</p>}
      </div>
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          ref={input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("ask.placeholder")}
          aria-label={t("ask.placeholder")}
          maxLength={300}
        />
        <button type="submit" className="primary-button" disabled={busy || !question.trim()} aria-label={t("ask.send")}>
          <Send size={16} />
        </button>
      </form>
      <small className="ask-note">{t("ask.disclaimer")}</small>
    </aside>
  );
}
