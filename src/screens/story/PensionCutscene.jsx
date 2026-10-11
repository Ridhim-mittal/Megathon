import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, SkipForward } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { ASSUMPTIONS } from "../../ui/gameAdapter.js";
import { PixelPortrait } from "../../ui/PixelPortrait.jsx";
import { sounds } from "../../ui/sound.js";

// "Two old ages": a short cutscene before Ammamma's pension scene. At 60 the pay stops; then the
// same old age twice, side by side: without a pension the savings jar empties, a medicine bill
// lands, the children are busy and the sahukar lends; with one, a monthly "tap" pays for it all.
// It ends with the sum: ₹3,000 a month from 35 becomes a pot that pays every month after 60.

const MONTHLY = 3000;
const START_AGE = 35;
const RETIRE_AGE = 60;
const PAYOUT_RATE = 0.06; // what the pot pays out a year in old age (an annuity, illustrative)

export function pensionSum() {
  const r = (ASSUMPTIONS.products?.pension?.rate ?? 0.08) / 12;
  const n = (RETIRE_AGE - START_AGE) * 12;
  const pot = (MONTHLY * ((1 + r) ** n - 1)) / r;
  return { pot, monthly: (pot * PAYOUT_RATE) / 12 };
}

const STEPS = ["stop", "sixty", "medicine", "help", "sum"];
const STEP_MS = 4200;
const lakh = (n) => `₹${(n / 100000).toFixed(0)} lakh`;
const rs = (n) => `₹${(Math.round(n / 500) * 500).toLocaleString("en-IN")}`;

export function PensionCutscene({ avatar = "boy", onDone }) {
  const { t } = useT();
  const [at, setAt] = useState(0);
  const btn = useRef(null);
  const kind = STEPS[at];
  const sum = pensionSum();
  const last = at === STEPS.length - 1;

  useEffect(() => {
    if (last) {
      sounds.chime?.();
      btn.current?.focus();
      return undefined;
    }
    if (kind === "medicine") sounds.thud?.();
    const id = setTimeout(() => setAt((x) => x + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [at]); // eslint-disable-line react-hooks/exhaustive-deps

  const side = (good) => {
    const jar = { sixty: 70, medicine: 15, help: 0 }[kind] ?? 0;
    return (
      <div className={`pc-side ${good ? "good" : "bad"}`}>
        <span className="pc-tag">{good ? t("pension.cut.with") : t("pension.cut.without")}</span>
        <div className="pc-scene">
          <PixelPortrait role="player" avatar={avatar} stage="old" className="pc-face" />
          {good ? (
            <span className="pc-tap" aria-hidden="true">
              🚰
              <i className="pc-drip">🪙</i>
              <i className="pc-drip d2">🪙</i>
            </span>
          ) : (
            <span className="pc-jar" aria-hidden="true">
              <i style={{ height: `${jar}%` }} />
            </span>
          )}
          {kind === "medicine" && <span className="pc-bill">💊</span>}
          {kind === "help" && <span className="pc-extra">{good ? "☕👧👦" : "📵 🏚️"}</span>}
        </div>
        <p className="pc-line">{t(`pension.cut.${kind}.${good ? "with" : "without"}`, { monthly: rs(sum.monthly) })}</p>
      </div>
    );
  };

  return (
    <div className="view pension-cut" role="dialog" aria-modal="true" aria-label={t("pension.cut.title")}>
      <header className="pc-head">
        <span className="eyebrow">{t("pension.cut.title")}</span>
        <ol className="pc-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= at ? "on" : ""} />
          ))}
        </ol>
        {!last && (
          <button className="text-button pc-skip" onClick={onDone}>
            <SkipForward size={15} /> {t("pension.cut.skip")}
          </button>
        )}
      </header>

      <div className="pc-stage" key={kind}>
        {kind === "stop" && (
          <div className="pc-stop">
            <PixelPortrait role="player" avatar={avatar} stage="old" className="pc-face big" />
            <span className="pc-coins" aria-hidden="true">
              <i>🪙</i>
              <i>🪙</i>
              <i>🪙</i>
              <b>✋</b>
            </span>
            <p className="pc-big">{t("pension.cut.stop")}</p>
          </div>
        )}
        {["sixty", "medicine", "help"].includes(kind) && (
          <>
            <p className="pc-age">{t("pension.cut.age", { age: { sixty: 60, medicine: 63, help: 66 }[kind] })}</p>
            <div className="pc-split">
              {side(false)}
              {side(true)}
            </div>
          </>
        )}
        {kind === "sum" && (
          <div className="pc-sum">
            <p className="pc-chain">
              <span>
                <small>{t("pension.cut.from", { age: START_AGE })}</small>
                <b>₹{MONTHLY.toLocaleString("en-IN")}</b>
                <small>{t("pension.cut.aMonth")}</small>
              </span>
              <i>➜</i>
              <span>
                <small>{t("pension.cut.at", { age: RETIRE_AGE })}</small>
                <b>{lakh(sum.pot)}</b>
                <small>{t("pension.cut.pot")}</small>
              </span>
              <i>➜</i>
              <span className="pc-pay">
                <small>{t("pension.cut.after")}</small>
                <b>{rs(sum.monthly)}</b>
                <small>{t("pension.cut.everyMonth")}</small>
              </span>
            </p>
            <p className="pc-lesson">{t("pension.cut.lesson")}</p>
          </div>
        )}
      </div>

      <div className="action-row">
        <span />
        {last ? (
          <button ref={btn} className="primary-button big" onClick={onDone}>
            {t("pension.cut.toAmmamma")} <ArrowRight size={18} />
          </button>
        ) : (
          <button className="secondary-button" onClick={() => setAt((x) => Math.min(STEPS.length - 1, x + 1))}>
            {t("pension.cut.next")} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
