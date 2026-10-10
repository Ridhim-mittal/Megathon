import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  CloudRain,
  Dices,
  FileText,
  Gamepad2,
  Gift,
  Glasses,
  KeyRound,
  Lock,
  MessageCircleQuestion,
  ShieldAlert,
  Signpost,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { DocumentViewer } from "../../ui/DocumentViewer.jsx";
import { PixelPortrait as Portrait } from "../../ui/PixelPortrait.jsx";
import { sounds } from "../../ui/sound.js";
import { CHOICE_GAMES } from "../../ui/games/choiceGames.js";

export const KIND_ICON = {
  lesson: BookOpen,
  random: Dices,
  crossroads: Signpost,
  consequence: Waves,
  crisis: TriangleAlert,
  teachback: MessageCircleQuestion,
  scam: ShieldAlert,
  calamity: CloudRain,
  windfall: Gift,
};

// The person on the card, standing beside the dialogue. Story narration shows the player.
export function Actor({ life, speaker, mood = "", name }) {
  const { t, castName } = useT();
  const hud = select.hud(life);
  const role = speaker === "narrator" ? "player" : speaker;
  const label = name ?? (speaker === "narrator" ? hud.playerName || t("intro.storyteller") : speaker === "headline" ? "" : castName(speaker));
  return (
    <div className={`vn-actor ${mood ? `mood-${mood}` : ""}`}>
      <div className="vn-actor-figure">
        <span className="vn-actor-glow" aria-hidden="true" />
        <Portrait role={role} avatar={life.avatar ?? "boy"} stage={hud.stage} />
        <span className="vn-actor-shadow" aria-hidden="true" />
        {mood === "good" && (
          <span className="vn-sparkles" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
        {(mood === "bad" || mood === "risky") && <span className="vn-sweat" aria-hidden="true" />}
      </div>
      {label && <span className="vn-nameplate">{label}</span>}
    </div>
  );
}

export function CardView({ life, dispatch }) {
  const { t, pick, rich, plain } = useT();
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
  const hasHidden = card.clarity.length > 0;
  const anyRevealed = card.clarity.some((c) => c.revealed);
  const echoChoice = card.choices.find((c) => c.id === hoverEcho);
  const KindIcon = KIND_ICON[card.kind] ?? BookOpen;

  function openDoc() {
    if (!card.document.opened) dispatch({ type: "OPEN_DOCUMENT", docId: card.document.id });
    setDocOpen(true);
  }

  return (
    <div className={`view card-view vn kind-${card.kind}`}>
      <article className="event-card vn-card" aria-labelledby="card-title">
        <Actor life={life} speaker={speaker} mood={card.kind === "scam" ? "sly" : ""} />
        <div className="vn-main">
          <div className="vn-tags">
            <span className={`vn-kind kind-${card.kind}`}>
              <KindIcon size={14} aria-hidden="true" />
              {t(`card.kind.${card.kind}`)}
            </span>
            {card.lessonTitle && <span className="vn-lesson">{pick(card.lessonTitle)}</span>}
          </div>
          {card.crisis && <p className="vn-crisis">{t(`card.crisis.${card.crisis}`)}</p>}
          {card.echoFrom && (
            <p className="echo-from" role="note">
              <span className="ripple" aria-hidden="true" />
              <Waves size={14} aria-hidden="true" /> {t("card.echoFrom", { age: card.echoFrom.age })}
              {card.echoFrom.hint && <em> · {pick(card.echoFrom.hint)}</em>}
            </p>
          )}
          <div className={`vn-bubble ${speaker === "narrator" ? "is-thought" : ""}`}>
            <h2 id="card-title" ref={heading} tabIndex={-1}>
              {plain(card.title)}
            </h2>
            <p className="card-text">{rich(card.text, { phrases: card.clarity })}</p>
            {anyRevealed && <p className="clarity-help">{card.clarity.every((c) => c.free) ? t("card.freeReveal") : t("card.tapPhrase")}</p>}
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
                className={`choice ${c.echo ? `has-echo echo-${c.echo.level}` : ""} ${c.locked ? "locked" : ""}`}
                aria-disabled={c.locked || undefined}
                onClick={() => dispatch({ type: "CHOOSE", choiceId: c.id })}
                onMouseEnter={() => c.echo && setHoverEcho(c.id)}
                onMouseLeave={() => setHoverEcho(null)}
                onFocus={() => c.echo && setHoverEcho(c.id)}
                onBlur={() => setHoverEcho(null)}
                style={{ animationDelay: `${0.08 * i + 0.25}s` }}
              >
                <kbd aria-hidden="true">{i + 1}</kbd>
                <span>
                  {plain(c.label)}
                  {/* Story mode: closed (or opened) by an earlier decision. */}
                  {c.locked && (
                    <small className="choice-lock">
                      <Lock size={11} /> {c.lockedHint ? plain(c.lockedHint) : t("story.locked")}
                    </small>
                  )}
                  {/* Story mode: this choice is won by playing a mini-game. */}
                  {CHOICE_GAMES[c.id] && !c.locked && (
                    <small className="choice-game">
                      <Gamepad2 size={12} /> {t(`minigame.tag.${CHOICE_GAMES[c.id]}`)}
                    </small>
                  )}
                  {c.unlockedBy && (
                    <small className="choice-unlocked">
                      <KeyRound size={11} /> {t("story.unlocked")}
                    </small>
                  )}
                </span>
                {c.echo && <span className="choice-ripple" aria-hidden="true" />}
                <ChevronRight className="choice-arrow" size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className={`echo-whisper ${echoChoice ? "on" : ""}`} aria-live="polite">
            {echoChoice && (
              <>
                <Portrait role="mentor" className="whisper-face" />
                <span>{echoChoice.echo.hint ? pick(echoChoice.echo.hint) : t("card.echoHint")}</span>
              </>
            )}
          </p>
        </div>
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
