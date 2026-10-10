import React, { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { content, select } from "./gameAdapter.js";

// The Gyaan reader: a lesson's deeper page (content.gyaan when it exists, else the lesson's
// summary). Stand-in for the full LessonPage with interactive widgets.
export function GyaanLite({ life, lessonId, onClose }) {
  const { t, pick, rich } = useT();
  const report = select.lessonReport(life);
  const [id, setId] = useState(() => lessonId ?? report.lessons.find((l) => l.status !== "unseen")?.id ?? "L01");
  const [answer, setAnswer] = useState(null);
  const close = useRef(null);
  useEffect(() => close.current?.focus(), []);
  useEffect(() => setAnswer(null), [id]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const lesson = (content.lessons ?? []).find((l) => l.id === id);
  const page = content.gyaan?.lessons?.[id];
  return (
    <div className="phone-overlay" role="dialog" aria-modal="true" aria-label={t("gyaan.title")}>
      <div className="gyaan-book">
        <header>
          <BookOpen size={18} aria-hidden="true" />
          <h2>{t("gyaan.title")}</h2>
          <button ref={close} className="panel-close" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </header>
        <div className="gyaan-body">
          <nav className="gyaan-index">
            {report.lessons.map((l) => (
              <button key={l.id} className={`status-${l.status} ${l.id === id ? "on" : ""}`} disabled={l.status === "unseen"} onClick={() => setId(l.id)}>
                <span>{l.id}</span> {pick(l.title)}
              </button>
            ))}
          </nav>
          <article className="gyaan-page">
            {!lesson && <p className="quiet">{t("report.status.unseen")}</p>}
            {lesson && (
              <>
                <span className="eyebrow">
                  {lesson.id} · {t(`report.pillar.${lesson.pillar}`)}
                </span>
                <h3>{pick(page?.title ?? lesson.title)}</h3>
                {page?.big_idea && <p className="big-idea">{rich(page.big_idea)}</p>}
                {!page && lesson.summary && <p>{rich(lesson.summary)}</p>}
                {page?.points && (
                  <ul>
                    {page.points.map((p, i) => (
                      <li key={i}>{rich(p)}</li>
                    ))}
                  </ul>
                )}
                {page?.example && (
                  <section className="example">
                    <h4>{t("gyaan.example")}: {pick(page.example.title)}</h4>
                    <ol>
                      {page.example.steps.map((s, i) => (
                        <li key={i}>{rich(s)}</li>
                      ))}
                    </ol>
                    <p>
                      <b>{rich(page.example.result)}</b>
                    </p>
                  </section>
                )}
                {lesson.keyNumber && (
                  <p className="key-number">
                    <span>{t("gyaan.keyNumber")}</span> {rich(lesson.keyNumber)}
                  </p>
                )}
                {page?.quiz && (
                  <section className="quiz">
                    <h4>{t("gyaan.quiz")}</h4>
                    <p>{rich(page.quiz.q)}</p>
                    {page.quiz.options.map((o, i) => (
                      <button key={i} className={`secondary-button ${answer === i ? (i === page.quiz.answer ? "right" : "wrong") : ""}`} onClick={() => setAnswer(i)}>
                        {pick(o)}
                      </button>
                    ))}
                    {answer != null && (
                      <p className={answer === page.quiz.answer ? "up" : "down"}>
                        {answer === page.quiz.answer ? t("gyaan.right") : t("gyaan.wrong")} {rich(page.quiz.explain)}
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
