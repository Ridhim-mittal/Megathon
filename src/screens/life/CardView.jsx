import React, { useEffect, useRef, useState } from "react";
import { FileText, Glasses, Waves } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { DocumentViewer } from "../../ui/DocumentViewer.jsx";
import { Portrait } from "../../ui/Portrait.jsx";
import { sounds } from "../../ui/sound.js";

export function CardView({ life, dispatch }) {
  const { t, pick, rich, castName, plain } = useT();
  const card = select.currentCard(life);
  const [docOpen, setDocOpen] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [hoverEcho, setHoverEcho] = useState(null);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    if (card?.echoFrom) sounds.ripple();
  }, [card?.echoFrom]);

  // Keyboard: 1–4 picks a choice (not while typing or reading a document).
  useEffect(() => {
    const onKey = (e) => {
      if (docOpen || e.target.closest?.("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (card?.choices.length ?? 0)) {
        e.preventDefault();
        dispatch({ type: "CHOOSE", choiceId: card.choices[n - 1].id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, docOpen, dispatch]);

  if (!card) return null;
  const speaker = card.speaker ?? "narrator";
  const speakerName = speaker === "narrator" ? t("intro.storyteller") : speaker === "headline" ? "" : castName(speaker);
  const hasHidden = card.clarity.length > 0;
  const anyRevealed = card.clarity.some((c) => c.revealed);
  const echoChoice = card.choices.find((c) => c.id === hoverEcho);

  function openDoc() {
    if (!card.document.opened) dispatch({ type: "OPEN_DOCUMENT", docId: card.document.id });
    setDocOpen(true);
  }

  return (
    <div className={`view card-view kind-${card.kind}`}>
      <article className="event-card" aria-labelledby="card-title">
        <div className="card-top">
          <span className={`kind-tag kind-${card.kind}`}>{t(`card.kind.${card.kind}`)}</span>
          {card.lessonTitle && <span className="lesson-tag">{pick(card.lessonTitle)}</span>}
          {card.crisis && <span className="crisis-tag">{t(`card.crisis.${card.crisis}`)}</span>}
        </div>
        {card.echoFrom && (
          <p className="echo-from" role="note">
            <span className="ripple" aria-hidden="true" />
            <Waves size={14} aria-hidden="true" /> {t("card.echoFrom", { age: card.echoFrom.age })}
            {card.echoFrom.hint && <em> · {pick(card.echoFrom.hint)}</em>}
          </p>
        )}
        <div className="card-body">
          <div className="card-speaker">
            <Portrait role={speaker} age={life.age} />
            {speakerName && <span>{speakerName}</span>}
          </div>
          <div className="card-copy">
            <h2 id="card-title" ref={heading} tabIndex={-1}>
              {plain(card.title)}
            </h2>
            <p className="card-text">{rich(card.text, { phrases: card.clarity })}</p>
            {anyRevealed && <p className="clarity-help">{card.clarity.every((c) => c.free) ? t("card.freeReveal") : t("card.tapPhrase")}</p>}
          </div>
        </div>
        {(hasHidden || card.document) && (
          <div className="card-tools">
            {hasHidden && (
              <button
                className={`glasses-button ${card.glasses.worn ? "worn" : ""}`}
                aria-pressed={card.glasses.worn}
                disabled={!card.glasses.canUse && !card.glasses.worn}
                onClick={() => {
                  sounds.chime();
                  dispatch({ type: "USE_GLASSES" });
                }}
                title={t("card.glassesHelp")}
              >
                <Glasses size={18} />
                <span>{card.glasses.worn ? t("card.glassesWorn") : t("card.glassesOn")}</span>
                <span className="lens-row" aria-label={t("card.charges", { n: card.glasses.charges })}>
                  {Array.from({ length: Math.min(card.glasses.charges, 8) }, (_, i) => (
                    <i key={i} />
                  ))}
                  {card.glasses.charges === 0 && <small>{t("card.noCharges")}</small>}
                </span>
              </button>
            )}
            {card.document && (
              <button className="doc-button" onClick={openDoc}>
                <FileText size={18} /> {t("card.readDocs")}
                {card.document.flagged.length > 0 && <b className="doc-count">{card.document.flagged.length}</b>}
              </button>
            )}
          </div>
        )}
        <div className="choices" role="group" aria-label={t("card.choose")}>
          <span className="choices-label">
            {t("card.choose")} <small>{t("card.keys", { n: card.choices.length })}</small>
          </span>
          {card.choices.map((c, i) => (
            <button
              key={c.id}
              className={`choice ${c.echo ? `has-echo echo-${c.echo.level}` : ""}`}
              onClick={() => dispatch({ type: "CHOOSE", choiceId: c.id })}
              onMouseEnter={() => c.echo && setHoverEcho(c.id)}
              onMouseLeave={() => setHoverEcho(null)}
              onFocus={() => c.echo && setHoverEcho(c.id)}
              onBlur={() => setHoverEcho(null)}
              style={{ animationDelay: `${0.08 * i + 0.1}s` }}
            >
              <kbd aria-hidden="true">{i + 1}</kbd>
              <span>{plain(c.label)}</span>
              {c.echo && <span className="choice-ripple" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p className={`echo-whisper ${echoChoice ? "on" : ""}`} aria-live="polite">
          {echoChoice && (
            <>
              <Portrait role="mentor" className="whisper-face" mood="look" />
              <span>{echoChoice.echo.hint ? pick(echoChoice.echo.hint) : t("card.echoHint")}</span>
            </>
          )}
        </p>
      </article>
      {docOpen && card.document && (
        <DocumentViewer
          doc={card.document}
          verifyError={verifyError}
          onFlag={(lineId) => {
            sounds.page();
            dispatch({ type: "FLAG_LINE", docId: card.document.id, lineId });
          }}
          onVerify={() => setVerifyError(Boolean(dispatch({ type: "VERIFY_DOCUMENT", docId: card.document.id })))}
          onClose={() => setDocOpen(false)}
        />
      )}
    </div>
  );
}
