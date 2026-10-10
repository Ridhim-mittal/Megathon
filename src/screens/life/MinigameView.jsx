import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Coins, FastForward } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { Portrait } from "../../ui/Portrait.jsx";

// Sahukar's chair (inspired by Shady Sam): pick one of three offers for each borrower, score the
// lender's profit, then see what each loan did to its borrower.
export function MinigameView({ life, dispatch }) {
  const { t, pick, money, rich, castName } = useT();
  const mg = select.minigame(life);
  const config = mg?.config ?? {};
  const borrowers = config.borrowers ?? [];
  const [stepIdx, setStepIdx] = useState(0); // 0 = intro, 1..n = borrowers, n+1 = reveal
  const [picks, setPicks] = useState({});
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), [stepIdx]);

  const finish = () =>
    dispatch({ type: "MINIGAME_RESULT", id: mg.id, score, ...(config.rewards?.lesson ? { lesson: config.rewards.lesson } : {}) });
  const chosen = borrowers.map((b) => b.offers.find((o) => o.id === picks[b.id])).filter(Boolean);
  const score = chosen.reduce((a, o) => a + (o.profit ?? 0), 0);
  const borrower = borrowers[stepIdx - 1];

  if (!borrowers.length) {
    return (
      <div className="view minigame-view">
        <button className="primary-button" onClick={() => dispatch({ type: "ADVANCE" })}>
          {t("common.continue")}
        </button>
      </div>
    );
  }

  return (
    <div className="view minigame-view">
      <div className="desk">
        <div className="desk-head">
          <Portrait role="lender" age={life.age} />
          <div>
            <span className="eyebrow">{t("minigame.eyebrow")}</span>
            <h2 ref={heading} tabIndex={-1}>
              {config.title ? pick(config.title) : t("minigame.title")}
            </h2>
          </div>
          <span className="desk-score" role="status">
            <Coins size={16} /> {t("minigame.score", { amount: money(score) })}
          </span>
        </div>

        {stepIdx === 0 && (
          <div className="desk-intro">
            {(config.intro ?? []).map((p, i) => (
              <p key={i} className="bubble lender">
                <b>{castName(p.speaker ?? "lender")}:</b> {rich(p.text)}
              </p>
            ))}
            {config.scoring && <p className="quiet">{pick(config.scoring)}</p>}
            <div className="action-row">
              <button className="text-button" onClick={() => dispatch({ type: "ADVANCE" })}>
                <FastForward size={15} /> {t("minigame.skip")}
              </button>
              <button className="primary-button big" onClick={() => setStepIdx(1)} autoFocus>
                {t("common.next")} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {borrower && (
          <div className="desk-borrower" key={borrower.id}>
            <span className="eyebrow">{t("minigame.borrower", { n: stepIdx, total: borrowers.length })}</span>
            <h3>
              {pick(borrower.name)} · {money(borrower.amount)}
            </h3>
            <p>{pick(borrower.story)}</p>
            <p className="choices-label">{t("minigame.pick")}</p>
            <div className="offer-grid">
              {borrower.offers.map((o) => (
                <button
                  key={o.id}
                  className={`offer ${picks[borrower.id] === o.id ? "selected" : ""}`}
                  aria-pressed={picks[borrower.id] === o.id}
                  onClick={() => setPicks({ ...picks, [borrower.id]: o.id })}
                >
                  <strong>{pick(o.label)}</strong>
                  <span>{t("minigame.profit", { amount: money(o.profit ?? 0) })}</span>
                </button>
              ))}
            </div>
            <div className="action-row">
              <span />
              <button className="primary-button big" disabled={!picks[borrower.id]} onClick={() => setStepIdx(stepIdx + 1)}>
                {stepIdx === borrowers.length ? t("minigame.reveal") : t("common.next")} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {stepIdx > borrowers.length && (
          <div className="desk-reveal">
            <h3>{t("minigame.reveal")}</h3>
            <ul>
              {borrowers.map((b) => {
                const o = b.offers.find((x) => x.id === picks[b.id]);
                return (
                  <li key={b.id}>
                    <b>{pick(b.name)}</b> · {pick(o?.label)} · <span className="rate">{t("minigame.rate", { pct: o?.rateYearly ?? "?" })}</span>
                    <p>{pick(o?.reveal)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="action-row">
              <span />
              <button className="primary-button big" onClick={finish} autoFocus>
                {t("minigame.finish")} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
