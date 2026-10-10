import React, { useEffect, useState } from "react";
import { content, select } from "../../gameAdapter.js";
import { PriceChart } from "../PriceChart.jsx";
import { LEARN_TOPICS, usePhoneText } from "../strings.js";
import { AmountRow, AppTitle, Line, pct, plainPct } from "./shared.jsx";

export function InvestApp({ life, run, openLesson, backRef }) {
  const { s, money, name } = usePhoneText();
  const [openId, setOpenId] = useState(null);
  const market = select.market(life);

  // Back from an instrument page returns to the list.
  useEffect(() => {
    if (!backRef) return undefined;
    backRef.current = openId
      ? () => {
          setOpenId(null);
          return true;
        }
      : null;
    return () => {
      backRef.current = null;
    };
  }, [openId, backRef]);

  if (!market.unlocked) {
    return (
      <div className="ph-app ph-invest">
        <AppTitle>{s("invest")}</AppTitle>
        <div className="ph-locked">
          <span className="ph-locked-icon" aria-hidden="true">🔒</span>
          <p>{market.reason === "age" ? s("lockedAge", { age: market.minAge }) : s("lockedPhone")}</p>
        </div>
      </div>
    );
  }

  const all = [...market.funds, ...market.stocks, ...market.deposits];
  const open = all.find((x) => x.id === openId);
  if (open) return <Instrument x={open} market={market} run={run} openLesson={openLesson} onBack={() => setOpenId(null)} />;

  const profit = market.total - market.invested;
  const groups = [
    ["funds", market.funds],
    ["stocks", market.stocks],
    ["safe", market.deposits],
  ];

  return (
    <div className="ph-app ph-invest">
      <AppTitle>{s("invest")}</AppTitle>
      <section className="ph-card ph-summary" aria-label={s("worthNow")}>
        <Line label={s("worthNow")} value={money(market.total)} strong />
        <Line label={s("youPutIn")} value={money(market.invested)} />
        <Line label={s("profit")} value={money(profit)} tone={profit < 0 ? "bad" : profit > 0 ? "good" : undefined} />
        <p className="ph-muted">{s("cashToUse", { cash: money(market.cash) })}</p>
      </section>

      {market.concentration > 0.5 && market.biggest && (
        <p className="ph-warn" role="note">
          <span aria-hidden="true">⚠ </span>
          {s("concentration", { pct: Math.round(market.concentration * 100), name: name(market.biggest) })}
        </p>
      )}

      <p className="ph-tip">{s("calmNote")}</p>

      {groups.map(([key, list]) => (
        <section key={key} aria-labelledby={`ph-g-${key}`}>
          <h3 id={`ph-g-${key}`} className="ph-group-title">{s(key)}</h3>
          <ul className="ph-list">
            {list.map((x) => (
              <li key={x.id}>
                <button type="button" className="ph-row-btn" onClick={() => setOpenId(x.id)}>
                  <span className="ph-row-main">
                    <span className="ph-row-name">{name(x.id)}</span>
                    <RiskMeter risk={x.risk} compact />
                  </span>
                  <span className="ph-row-side">
                    <span>{x.value > 0 ? money(x.value) : "—"}</span>
                    {x.lastReturn != null && (
                      <span className={`ph-small ${x.lastReturn < 0 ? "ph-tone-bad" : "ph-tone-good"}`}>
                        {s("lastYear")} {pct(x.lastReturn)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function RiskMeter({ risk, compact }) {
  const { s } = usePhoneText();
  const label = s(`risk${risk}`);
  return (
    <span className={`ph-risk${compact ? " is-compact" : ""}`} role="img" aria-label={s("riskAria", { n: risk, label })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`ph-risk-cell${i <= risk ? ` is-on r${risk}` : ""}`} />
      ))}
      {!compact && <span className="ph-risk-label">{label}</span>}
    </span>
  );
}

function Instrument({ x, market, run, openLesson, onBack }) {
  const { s, money, name, pick } = usePhoneText();
  const isStock = x.kind === "stock";
  const profit = x.value - x.invested;
  const topics = LEARN_TOPICS[x.id] ?? [];
  const topicTitle = (id) => pick(content.gyaan?.topics?.[id]?.title) || id.replace(/_/g, " ");
  const label = name(x.id);
  return (
    <div className="ph-app ph-invest">
      <button type="button" className="ph-link-back" onClick={onBack}>
        ◀ {s("invest")}
      </button>
      <AppTitle>{label}</AppTitle>

      <PriceChart history={x.history} badNews={x.badNews} name={label} />

      <section className="ph-card">
        <div className="ph-line">
          <span>{s("risk")}</span>
          <RiskMeter risk={x.risk} />
        </div>
        {x.expenseRatio != null && (
          <Line label={s("expense")} value={s("expenseLine", { pct: plainPct(x.expenseRatio, 2), per: money(x.expenseRatio * 10000) })} />
        )}
        {x.kind === "deposit" && x.rate != null && x.id !== "gold" && <Line label={s("interest")} value={s("rateLine", { rate: plainPct(x.rate) })} />}
        {x.lastReturn != null && <Line label={s("lastYear")} value={pct(x.lastReturn)} tone={x.lastReturn < 0 ? "bad" : "good"} />}
        {isStock && <p className="ph-muted">{s("brokerage", { fee: money(market.brokerage) })}</p>}
      </section>

      <section className="ph-card">
        {x.value > 0 ? (
          <>
            <Line label={s("yourValue")} value={money(x.value)} strong />
            <Line label={s("youPutIn")} value={money(x.invested)} />
            <Line label={s("profit")} value={money(profit)} tone={profit < 0 ? "bad" : profit > 0 ? "good" : undefined} />
          </>
        ) : (
          <p className="ph-muted">{s("noHolding")}</p>
        )}
        <p className="ph-muted">{s("cashToUse", { cash: money(market.cash) })}</p>
        <AmountRow
          label={s("amount")}
          actions={[
            { label: s("buy"), onClick: (amount) => run({ type: "TRADE", product: x.id, amount }, s("bought", { amount: money(amount), name: label })) },
            { label: s("sell"), tone: "alt", onClick: (amount) => run({ type: "TRADE", product: x.id, amount: -amount }, s("sold", { amount: money(amount), name: label })) },
          ]}
        />
      </section>

      {topics.length > 0 && (
        <div className="ph-learn">
          {topics.map((id) => (
            <button key={id} type="button" className="ph-btn ph-btn-learn" onClick={() => openLesson(id, "topic")}>
              📖 {s("learn", { topic: topicTitle(id) })}
            </button>
          ))}
        </div>
      )}
      <p className="ph-small ph-muted">{s("assumptions")}</p>
    </div>
  );
}
