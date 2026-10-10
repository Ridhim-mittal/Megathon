import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, FileWarning, HelpCircle, Sparkles, Waves } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { describeMovements } from "../../ui/movements.js";

export function OutcomeView({ life, dispatch }) {
  const { t, pick, rich, plain, money, signed } = useT();
  const out = select.lastOutcome(life);
  const card = select.currentCard(life);
  const [why, setWhy] = useState(false);
  const heading = useRef(null);
  const next = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!out) return null;
  const chosen = card?.choices.find((c) => c.id === out.choiceId);
  const lines = describeMovements(out.money.movements, { t, money });
  const nw = out.money.netWorthChange;
  const lesson = out.lesson && out.lesson.from !== out.lesson.to ? out.lesson : null;

  return (
    <div className="view outcome-view">
      <article className="outcome-card">
        <span className="eyebrow">{t("outcome.eyebrow")}</span>
        {card && <p className="outcome-choice">{plain(card.title)} · <b>{plain(chosen?.label)}</b></p>}
        <h2 ref={heading} tabIndex={-1} className="outcome-text">
          {out.outcome ? rich(out.outcome) : plain(chosen?.label)}
        </h2>
        {out.why && (
          <div className="why">
            <button className="why-button" aria-expanded={why} aria-controls="why-text" onClick={() => setWhy(!why)}>
              <HelpCircle size={17} /> {why ? t("outcome.hideWhy") : t("outcome.why")}
            </button>
            {why && (
              <p id="why-text" className="why-text">
                {rich(out.why)}
              </p>
            )}
          </div>
        )}
        <section className="money-moves" aria-label={t("outcome.money")}>
          <h3>{t("outcome.money")}</h3>
          {lines.length ? (
            <ul>
              {lines.map((l, i) => (
                <li key={i} className={`move ${l.tone}`} style={{ animationDelay: `${0.12 * i}s` }}>
                  <span className="coin-dot" aria-hidden="true">₹</span>
                  {l.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet">{t("outcome.noMoney")}</p>
          )}
          {nw !== 0 && <p className={`nw-change ${nw > 0 ? "up" : "down"}`}>{t("outcome.netWorth", { change: signed(nw) })}</p>}
        </section>
        {out.document && out.document.wentAhead && (
          <p className={`doc-result ${out.document.problem ? (out.document.caught ? "caught" : "missed") : "clean"}`}>
            <FileWarning size={16} aria-hidden="true" />
            {out.document.problem ? (out.document.caught ? t("outcome.document.caught") : t("outcome.document.missed")) : t("outcome.document.clean")}
          </p>
        )}
        {lesson && (
          <p className={`gyaan-card status-${lesson.to}`}>
            {lesson.to === "applied" ? <BadgeCheck size={18} /> : <Sparkles size={18} />}
            <span>
              <b>{t(`outcome.lesson.${lesson.to}`)}</b>
              {card?.lessonTitle && <small>{pick(card.lessonTitle)}</small>}
            </span>
          </p>
        )}
        {out.echo && (
          <p className="echo-line">
            <span className="ripple" aria-hidden="true" />
            <Waves size={14} aria-hidden="true" /> {pick(out.echo.hint)}
          </p>
        )}
        <div className="action-row">
          <span />
          <button ref={next} className="primary-button big" onClick={() => dispatch({ type: "ADVANCE" })}>
            {t("outcome.next")} <ArrowRight size={18} />
          </button>
        </div>
      </article>
    </div>
  );
}
