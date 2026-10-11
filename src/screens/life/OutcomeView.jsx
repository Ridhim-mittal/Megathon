import React, { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, Check, FileWarning, Lightbulb, Sparkles, Waves } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { content, select } from "../../ui/gameAdapter.js";
import { PixelPortrait as Portrait } from "../../ui/PixelPortrait.jsx";
import { Actor } from "./CardView.jsx";

// The speaker reacts to the choice: a big reaction, one line of story and the money as coins.
// Then the answer, straight away: why a good choice works, or the smarter move and why.
const REACTION = { good: "🎉", ok: "👍", risky: "😬", bad: "😟", neutral: "🙂" };
const RANK = { good: 4, ok: 3, neutral: 2, risky: 1, bad: 0 };
// Story choices carry a quality in the content; the card the player sees never does.
const storyChoices = (cardId) => {
  for (const m of content.story?.missions ?? []) {
    const node = m.nodes?.find((n) => n.id === cardId);
    if (node) return node.choices ?? [];
  }
  return [];
};
export function OutcomeView({ life, dispatch, onLearn }) {
  const { t, pick, rich, plain, signed } = useT();
  const out = select.lastOutcome(life);
  const card = select.currentCard(life);
  const heading = useRef(null);
  const next = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!out) return null;
  const chosen = card?.choices.find((c) => c.id === out.choiceId);
  const moves = out.money.movements ?? [];
  // Money put away (jars, savings products) shows as coins; the rest is listed below them.
  const saved = moves.filter((m) => (m.type === "jar" && m.amount > 0) || (m.type === "open" && m.paid > 0 && !m.shortfall));
  const { netWorthChange: nw, debtChange: debt } = out.money;
  const quality = out.quality ?? "neutral";
  const right = quality === "good";
  // The best choice on the card, when the player picked something worse.
  const best = !right
    ? storyChoices(card?.id)
        .filter((c) => c.quality && !c.hidden && c.id !== out.choiceId)
        .sort((a, b) => (RANK[b.quality] ?? 0) - (RANK[a.quality] ?? 0))[0]
    : null;
  const better = best && (RANK[best.quality] ?? 0) > (RANK[quality] ?? 0) ? best : null;
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

  // A delayed scam looks like it worked; the truth arrives later on the phone.
  if (out.delayed) {
    const id = String(out.cardId).split(".")[2];
    const hook = t(`inbox.hook.${id}`);
    return (
      <div className="view outcome-view">
        <article className="outcome-card delayed">
          <span className="eyebrow">{t("outcome.eyebrow")}</span>
          {card && <p className="outcome-choice">{plain(card.title)} · <b>{plain(chosen?.label)}</b></p>}
          <h2 ref={heading} tabIndex={-1} className="outcome-text">
            {t("outcome.delayed.title")}
          </h2>
          <p className="sms-bubble">{hook.startsWith("inbox.") ? t("inbox.hook.default") : hook}</p>
          <p className="quiet">{t("outcome.delayed.note")}</p>
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

  return (
    <div className={`view outcome-view vn quality-${quality}`}>
      <article className="outcome-card vn-card">
        <Actor life={life} speaker={card?.speaker ?? "narrator"} mood={quality} />
        <div className="vn-main">
          <div className="vn-tags">
            <span className="eyebrow vn-kind">{t("outcome.eyebrow")}</span>
            <span className={`vn-stamp q-${quality}`}>
              <i className="vn-react" aria-hidden="true">
                {REACTION[quality] ?? REACTION.neutral}
              </i>
              {t(`outcome.react.${quality}`)}
            </span>
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
            ) : null}
          </section>

          {(out.why || better) && (
            <div className={`vn-answer ${right ? "is-right" : "is-better"}`}>
              <span className="vn-answer-face" aria-hidden="true">
                <Portrait role="mentor" />
              </span>
              <div>
                <b className="vn-answer-head">
                  {right ? <Sparkles size={15} aria-hidden="true" /> : <Lightbulb size={15} aria-hidden="true" />}
                  {right ? t("outcome.answer.right") : t("outcome.answer.better")}
                </b>
                {better && <p className="vn-answer-pick">{plain(better.label)}</p>}
                {out.why && <p className="vn-answer-why">{rich(out.why)}</p>}
              </div>
            </div>
          )}

          {(out.document?.wentAhead || out.echo) && (
            <div className="vn-rewards">
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

          <div className="action-row">
            <span className="vn-tools">
              {onLearn && card?.lesson && (
                <button className="secondary-button learn-more" onClick={() => onLearn(card.lesson)}>
                  <BookOpen size={16} aria-hidden="true" /> {t("gyaan.learnMore")}
                </button>
              )}
            </span>
            <button ref={next} className="primary-button big" onClick={() => dispatch({ type: "ADVANCE" })}>
              {t("outcome.next")} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
