import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Check, FileWarning, Lightbulb, Sparkles, Waves } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { describeMovements } from "../../ui/movements.js";
import { PixelPortrait as Portrait } from "../../ui/PixelPortrait.jsx";
import { Actor } from "./CardView.jsx";

// The speaker reacts to the choice: a short stamp, then the story and the money as coins.
export function OutcomeView({ life, dispatch, onLearn }) {
  const { t, pick, rich, plain, money, signed } = useT();
  const out = select.lastOutcome(life);
  const card = select.currentCard(life);
  const [why, setWhy] = useState(false);
  const heading = useRef(null);
  const next = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!out) return null;
  const chosen = card?.choices.find((c) => c.id === out.choiceId);
  const moves = out.money.movements ?? [];
  // Money put away (jars, savings products) shows as coins; the rest is listed below them.
  const saved = moves.filter((m) => (m.type === "jar" && m.amount > 0) || (m.type === "open" && m.paid > 0 && !m.shortfall));
  const lines = describeMovements(
    moves.filter((m) => !saved.includes(m)),
    { t, money },
  );
  const { netWorthChange: nw, debtChange: debt } = out.money;
  const lesson = out.lesson && out.lesson.from !== out.lesson.to ? out.lesson : null;
  const quality = out.quality ?? "neutral";
  const coins = [
    ...saved.map((m, i) => ({
      key: `s${i}`,
      label: m.type === "jar" ? t(`sources.${m.jar === "wants" ? "wallet" : m.jar}`) : t(`products.${m.product}`),
      value: m.type === "jar" ? m.amount : m.paid,
      tone: "save",
    })),
    nw ? { key: "nw", label: t("hud.netWorth"), value: nw, tone: nw > 0 ? "up" : "down" } : null,
    debt ? { key: "debt", label: t("hud.debt"), value: debt, tone: debt < 0 ? "up" : "down" } : null,
  ].filter(Boolean);

  return (
    <div className={`view outcome-view vn quality-${quality}`}>
      <article className="outcome-card vn-card">
        <Actor life={life} speaker={card?.speaker ?? "narrator"} mood={quality} />
        <div className="vn-main">
          <div className="vn-tags">
            <span className="eyebrow vn-kind">{t("outcome.eyebrow")}</span>
            <span className={`vn-stamp q-${quality}`}>{t(`outcome.react.${quality}`)}</span>
          </div>
          {chosen && (
            <p className="outcome-choice">
              <Check size={14} aria-hidden="true" /> {plain(chosen.label)}
            </p>
          )}
          <div className="vn-bubble">
            <h2 ref={heading} tabIndex={-1} className="outcome-text">
              {out.outcome ? rich(out.outcome) : plain(chosen?.label)}
            </h2>
          </div>

          <section className="money-moves vn-money" aria-label={t("outcome.money")}>
            {coins.length > 0 ? (
              <div className="vn-coins">
                {coins.map((c, i) => (
                  <span key={c.key} className={`vn-coin ${c.tone}`} style={{ animationDelay: `${0.15 + 0.12 * i}s` }}>
                    <b className="coin-face" aria-hidden="true">
                      ₹
                    </b>
                    <span>
                      <small>{c.label}</small>
                      <strong>{signed(c.value)}</strong>
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="quiet vn-nomoney">{t("outcome.noMoney")}</p>
            )}
            {lines.length > 0 && (
              <ul className="vn-moves">
                {lines.map((l, i) => (
                  <li key={i} className={`move ${l.tone}`} style={{ animationDelay: `${0.3 + 0.08 * i}s` }}>
                    {l.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(lesson || out.document?.wentAhead || out.echo) && (
            <div className="vn-rewards">
              {lesson && (
                <p className={`gyaan-card vn-gyaan status-${lesson.to}`}>
                  <span className="vn-gyaan-icon">{lesson.to === "applied" ? <BadgeCheck size={20} /> : <Sparkles size={20} />}</span>
                  <span>
                    <b>{t(`outcome.lesson.${lesson.to}`)}</b>
                    {card?.lessonTitle && <small>{pick(card.lessonTitle)}</small>}
                  </span>
                </p>
              )}
              {out.document && out.document.wentAhead && (
                <p className={`doc-result ${out.document.problem ? (out.document.caught ? "caught" : "missed") : "clean"}`}>
                  <FileWarning size={16} aria-hidden="true" />
                  {out.document.problem ? (out.document.caught ? t("outcome.document.caught") : t("outcome.document.missed")) : t("outcome.document.clean")}
                </p>
              )}
              {out.echo && (
                <p className="echo-line">
                  <span className="ripple" aria-hidden="true" />
                  <Waves size={14} aria-hidden="true" /> {pick(out.echo.hint)}
                </p>
              )}
            </div>
          )}

          {out.why && (
            <div className={`why vn-why ${why ? "open" : ""}`}>
              <button className="why-button" aria-expanded={why} aria-controls="why-text" onClick={() => setWhy(!why)}>
                <Lightbulb size={17} /> {why ? t("outcome.hideWhy") : t("outcome.why")}
              </button>
              {why && (
                <div className="vn-why-note">
                  <Portrait role="mentor" className="whisper-face" />
                  <p id="why-text" className="why-text">
                    {rich(out.why)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="action-row">
            {onLearn && card?.lesson ? (
              <button className="secondary-button" onClick={() => onLearn(card.lesson)}>
                {t("gyaan.learnMore")}
              </button>
            ) : (
              <span />
            )}
            <button ref={next} className="primary-button big" onClick={() => dispatch({ type: "ADVANCE" })}>
              {t("outcome.next")} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
