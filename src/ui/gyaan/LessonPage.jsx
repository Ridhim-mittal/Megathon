import React, { useState } from "react";
import { content } from "../gameAdapter.js";
import { useGyaanText } from "./strings.js";
import { WIDGETS } from "./widgets/index.js";
import "./gyaan.css";

// A Gyaan lesson or market topic: big idea, points, a worked example, a myth, a widget, a quiz.
// Falls back to the short lesson card (title, summary, key number) if gyaan content is missing.
export function LessonPage({ id, kind = "lesson", onClose }) {
  const { g, pick, plain, lang } = useGyaanText();
  const page = kind === "topic" ? content.gyaan?.topics?.[id] : content.gyaan?.lessons?.[id];
  const basic = kind === "lesson" ? (content.lessons ?? []).find((l) => l.id === id) : null;
  const tag = kind === "topic" ? g("topicTag") : `${g("lessonTag")} ${id}`;

  const header = (title) => (
    <header className="gy-head">
      <div>
        <p className="gy-tag">{tag}</p>
        <h2 className="gy-title" tabIndex={-1} data-autofocus>
          {title}
        </h2>
      </div>
      <button type="button" className="gy-close" onClick={onClose} aria-label={g("close")}>
        ✕
      </button>
    </header>
  );

  if (!page) {
    return (
      <article className="gy-page" lang={lang}>
        {header(basic ? plain(basic.title) : id)}
        {basic ? (
          <>
            <p className="gy-big">{plain(basic.summary)}</p>
            {basic.keyNumber && (
              <p className="gy-key-number">
                <span>{g("keyNumber")}</span> {plain(basic.keyNumber)}
              </p>
            )}
          </>
        ) : (
          <p className="gy-help">{g("notReady")}</p>
        )}
      </article>
    );
  }

  const Widget = page.widget ? WIDGETS[page.widget] : null;
  return (
    <article className="gy-page" lang={lang}>
      {header(plain(page.title))}

      <section className="gy-section">
        <h3 className="gy-h">{g("bigIdea")}</h3>
        <p className="gy-big">{plain(page.big_idea)}</p>
        {page.points?.length > 0 && (
          <ul className="gy-points">
            {page.points.map((p, i) => (
              <li key={i}>{plain(p)}</li>
            ))}
          </ul>
        )}
      </section>

      {page.example && (
        <section className="gy-section gy-example">
          <h3 className="gy-h">
            {g("example")}: {plain(page.example.title)}
          </h3>
          <ol className="gy-steps">
            {page.example.steps?.map((step, i) => (
              <li key={i}>{plain(step)}</li>
            ))}
          </ol>
          {page.example.result && <p className="gy-example-result">{plain(page.example.result)}</p>}
        </section>
      )}

      {page.myth && (
        <section className="gy-section gy-myth">
          <p>
            <span className="gy-myth-tag">{g("myth")}</span> {plain(page.myth.myth)}
          </p>
          <p>
            <span className="gy-truth-tag">{g("truth")}</span> {plain(page.myth.truth)}
          </p>
        </section>
      )}

      {Widget && (
        <section className="gy-section">
          <h3 className="gy-h">{g("tryIt")}</h3>
          <Widget lang={lang} />
        </section>
      )}

      {page.quiz && <Quiz quiz={page.quiz} pick={pick} plain={plain} g={g} />}
    </article>
  );
}

function Quiz({ quiz, plain, g }) {
  const [picked, setPicked] = useState(null);
  const right = picked === quiz.answer;
  return (
    <section className="gy-section gy-quiz" aria-labelledby="gy-quiz-q">
      <h3 className="gy-h">{g("quiz")}</h3>
      <p id="gy-quiz-q" className="gy-quiz-q">
        {plain(quiz.q)}
      </p>
      <div className="gy-quiz-options">
        {quiz.options.map((o, i) => {
          const state = picked == null ? "" : i === quiz.answer ? (picked === i ? " is-right" : "") : picked === i ? " is-wrong" : "";
          return (
            <button
              key={i}
              type="button"
              className={`gy-option${state}`}
              aria-pressed={picked === i}
              disabled={picked != null && right}
              onClick={() => setPicked(i)}
            >
              {plain(o)}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <div className={`gy-quiz-feedback ${right ? "is-right" : "is-wrong"}`} role="status">
          <b>{right ? g("correct") : g("wrong")}</b> {right && plain(quiz.explain)}
          {!right && (
            <button type="button" className="gy-btn gy-btn-alt" onClick={() => setPicked(null)}>
              {g("tryAgain")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default LessonPage;
