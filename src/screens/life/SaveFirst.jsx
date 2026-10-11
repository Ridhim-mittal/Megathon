import React, { useMemo, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { PixelPortrait } from "../../ui/PixelPortrait.jsx";
import { sounds } from "../../ui/sound.js";
import { PixelIcon } from "../../ui/PixelIcon.jsx";
import { SAVE_LEVELS, forecast, levelOf, planFor } from "../../ui/savePlan.js";

// The story's budget as one choice: how much do you save first? Needs are fixed, the rest is fun
// money. The forecast shows what the choice means: when the dream comes, how many surprises the
// safety jar covers, how much fun is left.
const END_AGE = 36;
const PARTS = [
  { id: "needs", icon: "home" },
  { id: "wants", icon: "candy" },
  { id: "emergency", icon: "ring" },
  { id: "goal", icon: "target" },
  { id: "invest", icon: "sprout" },
];

function CoinStack({ n }) {
  return (
    <span className="sv-stack" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ bottom: `${i * 9}px`, animationDelay: `${i * 60}ms` }} />
      ))}
    </span>
  );
}

export function SaveFirst({ life, dispatch, avatar = "boy" }) {
  const { t, money } = useT();
  const rules = select.budgetRules(life);
  const hud = select.hud(life);
  const ctx = { emergency: hud.jars.emergency ?? 0, stage: hud.stage ?? life.stage, priceIndex: hud.priceIndex };
  const [level, setLevel] = useState(() => levelOf(rules, rules.suggested));
  const plans = useMemo(() => Object.fromEntries(SAVE_LEVELS.map((l) => [l.id, planFor(rules, l.share, ctx)])), [rules.monthlyIncome, rules.minNeeds, ctx.emergency]); // eslint-disable-line react-hooks/exhaustive-deps
  const jars = plans[level];
  const share = SAVE_LEVELS.find((l) => l.id === level).share;
  const fc = forecast(jars, { age: life.age, dream: hud.dream, ...ctx, income: rules.monthlyIncome, share, storylineId: life.storylineId });
  const saved = (jars.emergency ?? 0) + (jars.goal ?? 0) + (jars.invest ?? 0);
  const dreamPos = fc.dreamAge == null ? 1 : Math.min(1, (fc.dreamAge - life.age) / Math.max(1, END_AGE - life.age));

  function go() {
    sounds.coin?.();
    dispatch({ type: "SET_BUDGET", jars, investIn: "invest" in jars ? rules.investIn : undefined });
  }

  return (
    <div className="view sv-view">
      <header className="sv-head">
        <span className="sv-granny">
          <PixelPortrait role="mentor" />
        </span>
        <div className="sv-bubble">
          <h2>{t("save.title")}</h2>
        </div>
        <span className="sv-income" aria-label={t("save.income", { n: money(rules.monthlyIncome) })}>
          <i aria-hidden="true">
            <PixelIcon name="bag" size={24} />
          </i>
          <b>{money(rules.monthlyIncome)}</b>
          <small>{t("save.perMonth")}</small>
        </span>
      </header>

      {/* Where every rupee goes, as one bar. */}
      <div className="sv-bar" role="img" aria-label={PARTS.filter((p) => p.id in jars).map((p) => `${t(`save.part.${p.id}`)} ${money(jars[p.id])}`).join(", ")}>
        {PARTS.filter((p) => p.id in jars && jars[p.id] > 0).map((p) => (
          <span key={p.id} className={`sv-seg seg-${p.id}`} style={{ flexGrow: jars[p.id] }} title={`${t(`save.part.${p.id}`)} ${money(jars[p.id])}`}>
            <i aria-hidden="true">{p.id === "needs" ? <Lock size={12} /> : <PixelIcon name={p.icon} size={13} />}</i>
            <b>{money(jars[p.id])}</b>
          </span>
        ))}
      </div>

      <div className="sv-levels" role="radiogroup" aria-label={t("save.title")}>
        {SAVE_LEVELS.map((l, i) => {
          const p = plans[l.id];
          const amount = (p.emergency ?? 0) + (p.goal ?? 0) + (p.invest ?? 0);
          return (
            <button
              key={l.id}
              role="radio"
              aria-checked={level === l.id}
              className={`sv-level lv-${l.id} ${level === l.id ? "on" : ""}`}
              onClick={() => {
                setLevel(l.id);
                sounds.tap?.();
              }}
            >
              <CoinStack n={2 + i * 2} />
              <span className="sv-face" aria-hidden="true">
                <PixelIcon name={["jarLow", "jarMid", "jarFull"][i]} size={34} />
              </span>
              <b>{t(`save.level.${l.id}`)}</b>
              <em>
                {money(amount)}
                <small>{t("save.perMonth")}</small>
              </em>
            </button>
          );
        })}
      </div>

      <div className="sv-forecast">
        <div className="sv-fc fc-dream">
          <span className="sv-fc-icon" aria-hidden="true">
            <PixelIcon name="target" size={18} />
          </span>
          <div className="sv-track" aria-hidden="true">
            <span className="sv-age now">{life.age}</span>
            <span className="sv-line" />
            <span className="sv-runner">
              <PixelPortrait role="player" avatar={avatar} stage={hud.stage} />
            </span>
            <span className={`sv-flag ${fc.dreamAge == null ? "never" : ""}`} style={{ left: `calc(${dreamPos * 100}% - 12px)` }}>
              <PixelIcon name="flag" size={22} />
            </span>
            <span className="sv-age end">{END_AGE}</span>
          </div>
          <b className="sv-big" key={fc.dreamAge}>
            {fc.dreamAge == null || fc.dreamAge > END_AGE ? t("save.never") : t("save.atAge", { n: fc.dreamAge })}
          </b>
          <small>{t("save.dream")}</small>
        </div>
        <div className="sv-fc fc-safety">
          <span className="sv-fc-icon" aria-hidden="true">
            <PixelIcon name="ring" size={18} />
          </span>
          <span className="sv-icons" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={i < fc.shields ? "on" : ""}>
                <PixelIcon name="shield" size={20} />
              </i>
            ))}
          </span>
          <b className="sv-big">×{Math.min(fc.shields, 9)}</b>
          <small>{t("save.safety")}</small>
        </div>
        <div className="sv-fc fc-fun">
          <span className="sv-fc-icon" aria-hidden="true">
            <PixelIcon name="candy" size={12} />
          </span>
          <span className="sv-icons" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={i < Math.round((fc.fun * 6) / 10) ? "on" : ""}>
                <PixelIcon name="lolly" size={22} />
              </i>
            ))}
          </span>
          <b className="sv-big">{money(jars.wants)}</b>
          <small>{t("save.fun")}</small>
        </div>
      </div>

      <footer className="sv-foot">
        {rules.squeezed && (
          <span className="sv-tight">
            <PixelIcon name="faceSad" size={16} /> {t("save.tight")}
          </span>
        )}
        <ol className="sv-steps" aria-label={t("save.howTitle")}>
          <li>
            <b>1</b>
            <PixelIcon name="jarMid" size={18} />
            <span>{t("save.how1")}</span>
          </li>
          <li>
            <b>2</b>
            <PixelIcon name="ring" size={16} />
            <span>{t("save.how2")}</span>
          </li>
          <li>
            <b>3</b>
            <PixelIcon name="candy" size={10} />
            <span>{t("save.how3")}</span>
          </li>
        </ol>
        <button className="primary-button big sv-go" onClick={go} autoFocus>
          {t("budget.confirm")} <ArrowRight size={18} />
        </button>
      </footer>
      <span className="sr-only">{t("save.summary", { saved: money(saved), fun: money(jars.wants) })}</span>
    </div>
  );
}
