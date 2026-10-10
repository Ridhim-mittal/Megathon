import React, { useEffect, useRef, useState } from "react";
import { content, select } from "../gameAdapter.js";
import { LessonPage } from "./LessonPage.jsx";
import { useGyaanText } from "./strings.js";
import "./gyaan.css";

// A full-screen Gyaan reader with the same props as src/ui/GyaanLite.jsx, so the map can swap
// it in. `lessonId` is "L07", "topic:share", or null (opens the first lesson the player has met).
const parse = (id) => (id?.startsWith("topic:") ? { id: id.slice(6), kind: "topic" } : id ? { id, kind: "lesson" } : null);

export function GyaanReader({ life, lessonId, onClose }) {
  const { g, pick, lang } = useGyaanText();
  const report = select.lessonReport(life);
  const topics = Object.keys(content.gyaan?.topics ?? {});
  const [open, setOpen] = useState(
    () => parse(lessonId) ?? { id: report.lessons.find((l) => l.status !== "unseen")?.id ?? "L01", kind: "lesson" },
  );
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  // Opening a page puts focus on its title.
  useEffect(() => {
    ref.current?.querySelector(".gy-reader-page [data-autofocus]")?.focus();
  }, [open]);

  const item = (id, kind, title, locked, status) => {
    const on = open.id === id && open.kind === kind;
    return (
      <li key={`${kind}-${id}`}>
        <button
          type="button"
          className={`gy-reader-item${on ? " is-on" : ""}${status ? ` st-${status}` : ""}`}
          aria-current={on ? "page" : undefined}
          disabled={locked}
          title={locked ? g("locked") : undefined}
          onClick={() => setOpen({ id, kind })}
        >
          {locked ? "🔒 " : ""}
          {title}
        </button>
      </li>
    );
  };

  return (
    <div className="gy-reader-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="gy-reader" role="dialog" aria-modal="true" aria-label={g("reader")} ref={ref} lang={lang}>
        <nav className="gy-reader-nav" aria-label={g("reader")}>
          <div className="gy-reader-top">
            <h2>{g("reader")}</h2>
            <button type="button" className="gy-close" onClick={onClose} aria-label={g("closeReader")}>
              ✕
            </button>
          </div>
          <h3>{g("lessons")}</h3>
          <ul>{report.lessons.map((l) => item(l.id, "lesson", pick(l.title), l.status === "unseen", l.status))}</ul>
          {topics.length > 0 && (
            <>
              <h3>{g("topics")}</h3>
              <ul>{topics.map((id) => item(id, "topic", pick(content.gyaan.topics[id].title), false))}</ul>
            </>
          )}
        </nav>
        <div className="gy-reader-page">
          <LessonPage key={`${open.kind}-${open.id}`} id={open.id} kind={open.kind} onClose={onClose} />
        </div>
      </section>
    </div>
  );
}

export default GyaanReader;
