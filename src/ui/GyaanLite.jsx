import React, { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { content, select } from "./gameAdapter.js";
import { GyaanWidget } from "./GyaanWidgets.jsx";

// The Gyaan reader: each lesson as a few picture slides instead of a page of text: the big idea,
// the key points, a worked example revealed step by step, a myth card to flip, a "try it"
// calculator and a one-question quiz. Market topics (shares, funds, fees…) are in the list too.
const PILLAR_ICON = { PLAN: "🗺️", SAVE: "🏺", SAFE: "🛡️", INVEST: "🌱" };
const SLIDE_ICON = { idea: "💡", points: "🔑", example: "🧮", myth: "🃏", try: "🎛️", quiz: "❓", summary: "📘" };

export function GyaanLite({ life, lessonId, onClose }) {
  const { t, pick } = useT();
  const report = select.lessonReport(life);
  const [id, setId] = useState(() => lessonId ?? report.lessons.find((l) => l.status !== "unseen")?.id ?? "L01");
  const [showIndex, setShowIndex] = useState(!lessonId);
  const close = useRef(null);
  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const topics = Object.entries(content.gyaan?.topics ?? {});
  const topicId = id.startsWith("topic:") ? id.slice(6) : null;
  const lesson = topicId ? null : (content.lessons ?? []).find((l) => l.id === id);
  const page = topicId ? content.gyaan?.topics?.[topicId] : content.gyaan?.lessons?.[id];
  const pickLesson = (x) => {
    setId(x);
    setShowIndex(false);
  };
  return (
    <div className="phone-overlay" role="dialog" aria-modal="true" aria-label={t("gyaan.title")}>
      <div className={`gyaan-book slides-mode ${showIndex ? "index-open" : ""}`}>
        <header>
          <BookOpen size={18} aria-hidden="true" />
          <h2>{t("gyaan.title")}</h2>
          <button className={`gyaan-all ${showIndex ? "on" : ""}`} aria-expanded={showIndex} onClick={() => setShowIndex(!showIndex)}>
            <List size={16} /> {t("gyaan.all")}
          </button>
          <button ref={close} className="panel-close" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </header>
        <div className="gyaan-body">
          {showIndex && (
            <nav className="gyaan-index">
              {report.lessons.map((l) => (
                <button key={l.id} className={`status-${l.status} ${l.id === id ? "on" : ""}`} disabled={l.status === "unseen"} onClick={() => pickLesson(l.id)}>
                  <span>{PILLAR_ICON[l.pillar] ?? l.id}</span> {pick(l.title)}
                </button>
              ))}
              {topics.length > 0 && <h3 className="gyaan-index-title">{t("gyaan.topics")}</h3>}
              {topics.map(([tid, tp]) => (
                <button key={tid} className={`topic ${id === `topic:${tid}` ? "on" : ""}`} onClick={() => pickLesson(`topic:${tid}`)}>
                  <span>📈</span> {pick(tp.title)}
                </button>
              ))}
            </nav>
          )}
          <Slides key={id} id={id} lesson={lesson} page={page} />
        </div>
      </div>
    </div>
  );
}

function Slides({ id, lesson, page }) {
  const { t, pick, rich } = useT();
  const [at, setAt] = useState(0);
  const [steps, setSteps] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState(null);
  const slides = page
    ? ["idea", page.points?.length && "points", page.example && "example", page.myth && "myth", page.widget && "try", page.quiz && "quiz"].filter(Boolean)
    : lesson
      ? ["summary"]
      : [];
  const go = (n) => setAt(Math.max(0, Math.min(slides.length - 1, n)));
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,select,textarea")) return;
      if (e.key === "ArrowRight") go(at + 1);
      else if (e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!slides.length) return <article className="gyaan-page"><p className="quiet">{t("report.status.unseen")}</p></article>;
  const kind = slides[at];
  const title = pick(page?.title ?? lesson?.title);
  const icon = lesson ? PILLAR_ICON[lesson.pillar] : "📈";
  return (
    <article className="gyaan-page gyaan-slides">
      <div className="slide-top">
        <span className="slide-badge" aria-hidden="true">
          {icon}
        </span>
        <h3>{title}</h3>
        {slides.length > 1 && (
          <span className="slide-count">
            {at + 1}/{slides.length}
          </span>
        )}
      </div>
      {slides.length > 1 && (
        <span className="slide-progress" aria-hidden="true">
          <i style={{ width: `${((at + 1) / slides.length) * 100}%` }} />
        </span>
      )}
      <section className={`slide slide-${kind} tone-${kind}`} key={kind} aria-live="polite">
        <span className="slide-icon" aria-hidden="true">
          {SLIDE_ICON[kind]}
        </span>
        <span className="eyebrow">{t(`gyaan.slide.${kind}`)}</span>
        {kind === "idea" && <p className="slide-big">{rich(page.big_idea)}</p>}
        {kind === "summary" && (
          <>
            <p className="slide-big">{rich(lesson.summary)}</p>
            {lesson.keyNumber && (
              <p className="key-number">
                <span>{t("gyaan.keyNumber")}</span> {rich(lesson.keyNumber)}
              </p>
            )}
          </>
        )}
        {kind === "points" && (
          <ol className="slide-points">
            {page.points.map((p, i) => (
              <li key={i} style={{ animationDelay: `${0.12 + i * 0.18}s` }}>
                <b aria-hidden="true">{i + 1}</b>
                <span>{rich(p)}</span>
              </li>
            ))}
          </ol>
        )}
        {kind === "example" && (
          <div className="slide-example">
            <p className="slide-sub">{pick(page.example.title)}</p>
            <ol>
              {page.example.steps.slice(0, steps).map((s, i) => (
                <li key={i}>{rich(s)}</li>
              ))}
            </ol>
            {steps < page.example.steps.length ? (
              <button className="secondary-button" onClick={() => setSteps(steps + 1)}>
                {t("gyaan.nextStep")} ▸
              </button>
            ) : (
              <p className="slide-result">✅ {rich(page.example.result)}</p>
            )}
          </div>
        )}
        {kind === "myth" && (
          <button className={`flip-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-pressed={flipped}>
            <span className="flip-inner">
              <span className="flip-face front">
                <b>❌ {t("gyaan.myth")}</b>
                <span>{rich(page.myth.myth)}</span>
                <small>{t("gyaan.tapToFlip")}</small>
              </span>
              <span className="flip-face back">
                <b>✅ {t("gyaan.truth")}</b>
                <span>{rich(page.myth.truth)}</span>
              </span>
            </span>
          </button>
        )}
        {kind === "try" && <GyaanWidget key={id} id={page.widget} />}
        {kind === "quiz" && (
          <div className="slide-quiz">
            <p className="slide-big">{rich(page.quiz.q)}</p>
            <div className="quiz-options">
              {page.quiz.options.map((o, i) => (
                <button
                  key={i}
                  className={`quiz-option ${answer != null && i === page.quiz.answer ? "right" : ""} ${answer === i && i !== page.quiz.answer ? "wrong" : ""}`}
                  disabled={answer != null}
                  onClick={() => setAnswer(i)}
                >
                  {pick(o)}
                </button>
              ))}
            </div>
            {answer != null && (
              <p className={`quiz-result ${answer === page.quiz.answer ? "up" : "down"}`}>
                <span aria-hidden="true">{answer === page.quiz.answer ? "🎉" : "🤔"}</span>
                <span>
                  <b>{answer === page.quiz.answer ? t("gyaan.right") : t("gyaan.wrong")}</b> {rich(page.quiz.explain)}
                </span>
              </p>
            )}
          </div>
        )}
      </section>
      {slides.length > 1 && (
        <nav className="slide-nav">
          <button className="slide-arrow" onClick={() => go(at - 1)} disabled={at === 0} aria-label={t("gyaan.prev")}>
            <ChevronLeft size={20} />
          </button>
          <span className="slide-dots">
            {slides.map((k, i) => (
              <button key={k} className={i === at ? "on" : i < at ? "seen" : ""} onClick={() => go(i)} aria-label={t(`gyaan.slide.${k}`)} title={t(`gyaan.slide.${k}`)}>
                {SLIDE_ICON[k]}
              </button>
            ))}
          </span>
          <button className="slide-arrow next" onClick={() => go(at + 1)} disabled={at === slides.length - 1} aria-label={t("gyaan.next")}>
            <span>{t("gyaan.next")}</span> <ChevronRight size={20} />
          </button>
        </nav>
      )}
    </article>
  );
}
