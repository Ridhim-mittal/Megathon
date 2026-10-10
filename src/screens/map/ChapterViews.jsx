import React, { useEffect, useRef } from "react";
import { ArrowRight, Newspaper, TrendingDown, TrendingUp } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { headlineText, habitText } from "../../ui/movements.js";
import { Mentor } from "../../ui/Mentor.jsx";
import { PixelPortrait } from "../../ui/PixelPortrait.jsx";

// The title card shown when a chapter starts.
export function ChapterIntro({ chapter, avatar, phoneGift, onStart }) {
  const { t } = useT();
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className="chapter-intro" role="dialog" aria-modal="true" aria-labelledby="chapter-title">
      <div className="chapter-card">
        <span className="eyebrow">{t("chapter.number", { n: chapter.number, total: chapter.total })}</span>
        <h2 id="chapter-title">{t(`chapter.names.${chapter.id}`)}</h2>
        <span className="chapter-ages">{t("chapter.ages", { from: chapter.from, to: chapter.to })}</span>
        <div className="chapter-sprites" aria-hidden="true">
          <PixelPortrait role="player" avatar={avatar} stage={chapter.id} />
          <PixelPortrait role="mentor" />
        </div>
        <p>{t(`chapter.intro.${chapter.id}`)}</p>
        {phoneGift && <p className="chapter-gift">{t("chapter.phoneGift")}</p>}
        <p className="chapter-howto">{t("chapter.howTo")}</p>
        <button ref={btn} className="primary-button big" onClick={onStart}>
          {t("chapter.start")} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// The summary when a chapter ends: years, money, dream, the market.
export function ChapterEnd({ chapter, castName, onNext, last }) {
  const { t, money, signed } = useT();
  const s = chapter.summary;
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  if (!s) return null;
  const habit = [...s.years].reverse().find((y) => y.habitEcho)?.habitEcho;
  const index = Object.entries(s.market.index);
  return (
    <div className="view chapter-end">
      <span className="eyebrow">{t("chapter.endTitle")}</span>
      <h2 ref={heading} tabIndex={-1}>
        {t(`chapter.names.${s.id}`)} · {t("chapter.ages", { from: s.from, to: s.to })}
      </h2>
      <dl className="year-stats">
        <div>
          <dt>{t("yearEnd.netWorth")}</dt>
          <dd>
            {money(s.netWorth)}
            <small className={s.netWorthChange >= 0 ? "up" : "down"}>
              {s.netWorthChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {signed(s.netWorthChange)}
            </small>
          </dd>
        </div>
        <div className={s.debt > 0 ? "debt" : ""}>
          <dt>{t("yearEnd.debt")}</dt>
          <dd>
            {money(s.debt)}
            {s.debtChange !== 0 && <small className={s.debtChange > 0 ? "down" : "up"}>{signed(s.debtChange)}</small>}
          </dd>
        </div>
        <div>
          <dt>{t("yearEnd.savings")}</dt>
          <dd>{money(s.savings + s.investments)}</dd>
        </div>
        <div>
          <dt>{t("yearEnd.dream")}</dt>
          <dd>
            {t("chapter.dream", { from: s.dream.pct - s.dreamChange, to: s.dream.pct })}
            <span className="dream-bar mini" aria-hidden="true">
              <i style={{ width: `${s.dream.pct}%` }} />
            </span>
          </dd>
        </div>
      </dl>
      <h3 className="years-title">{t("chapter.years")}</h3>
      <ol className="years-list">
        {s.years.map((y) => (
          <li key={y.age}>
            <b>{t("common.age", { age: y.age })}</b>
            <Newspaper size={13} aria-hidden="true" />
            <span>{headlineText(y.headline, { t, money })}</span>
            <small className={y.netWorthChange >= 0 ? "up" : "down"}>{signed(y.netWorthChange)}</small>
          </li>
        ))}
      </ol>
      <div className="market-strip" aria-label={t("chapter.market")}>
        <span>{t("chapter.market")}</span>
        <div className="bars">
          {index.map(([age, r]) => (
            <i key={age} className={r >= 0 ? "up" : "down"} style={{ height: `${Math.min(100, Math.abs(r) * 250) + 6}%` }} title={`${age}: ${(r * 100).toFixed(1)}%`}>
              <em>{age}</em>
            </i>
          ))}
        </div>
      </div>
      {Object.entries(s.market.badNews).map(([age, ids]) =>
        ids.map((id) => (
          <p key={`${age}-${id}`} className="quiet">
            {t("chapter.badNews", { name: t(`instruments.${id}`), age })}
          </p>
        )),
      )}
      <ul className="meter-changes">
        {Object.entries(s.meterChanges)
          .filter(([, d]) => d !== 0)
          .map(([m, d]) => (
            <li key={m} className={d > 0 ? "up" : "down"}>
              {t(`meter.${m}`)} {d > 0 ? `+${d}` : d}
            </li>
          ))}
      </ul>
      {habit && (
        <Mentor name={castName("mentor")} look compact>
          {habitText(habit, { t, money })}
        </Mentor>
      )}
      <div className="action-row">
        <span />
        <button className="primary-button big" onClick={onNext}>
          {last ? t("chapter.final") : t("chapter.next", { n: s.id === "settle" ? 5 : ["child", "teen", "young", "adult"].indexOf(s.id) + 2 })}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// What a place is for, when nothing is happening there.
export function PlaceInfo({ placeId, waiting, onClose, onShop, canFinish, onFinish, requiredLeft }) {
  const { t } = useT();
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className="view place-info">
      <span className="eyebrow">{t(`places.${placeId}`)}</span>
      <h2>{t(`places.${placeId}`)}</h2>
      <p>{t(`placeInfo.${placeId}`)}</p>
      {placeId === "home" && canFinish && <p className="chapter-gift">{t("map.finishConfirm")}</p>}
      {!(placeId === "home" && canFinish) && <p className="quiet">{t("map.nothing")}</p>}
      {placeId === "home" && !canFinish && requiredLeft > 0 && waiting.length > 0 && (
        <p className="quiet">{t("map.waiting", { places: waiting.map((w) => t(`places.${w}`)).join(", ") })}</p>
      )}
      <div className="action-row">
        <button ref={btn} className="text-button" onClick={onClose}>
          {t("map.close")}
        </button>
        {placeId === "shop" && (
          <button className="primary-button big" onClick={onShop}>
            {t("map.shop")} <ArrowRight size={18} />
          </button>
        )}
        {placeId === "home" && canFinish && (
          <button className="primary-button big" onClick={onFinish}>
            {t("map.finish")} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
