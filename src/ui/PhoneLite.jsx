import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CandlestickChart, Gamepad2, Landmark, MessageSquare, TrendingUp, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { select } from "./gameAdapter.js";

// A small in-game phone: messages, bank and invest apps. It is the stand-in until the full
// phone (src/ui/phone/Phone.jsx) lands; both take the same props.
export function PhoneLite({ life, dispatch, onClose, onNotification, onLearn, onExchange, onArcade, initialApp = null }) {
  const { t, plain, money } = useT();
  const [app, setApp] = useState(initialApp);
  const phone = select.phone(life);
  const market = select.market(life);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") (app ? setApp(null) : onClose());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app, onClose]);

  const APPS = [
    { id: "messages", icon: MessageSquare, badge: phone.notifications.length },
    { id: "bank", icon: Landmark },
    { id: "invest", icon: TrendingUp },
    { id: "exchange", icon: CandlestickChart },
    { id: "arcade", icon: Gamepad2 },
    { id: "gyaan", icon: BookOpen },
  ];

  return (
    <div className="phone-overlay" role="dialog" aria-modal="true" aria-label={t("phone.open")}>
      <div className="phone">
        <div className="phone-status">
          <span>{t("common.age", { age: life.age })}</span>
          <span>{money(life.money.cash)}</span>
          <button className="phone-close" onClick={onClose} aria-label={t("phone.close")}>
            <X size={16} />
          </button>
        </div>
        <div className="phone-screen">
          {!app && (
            <div className="app-grid">
              {APPS.map((a) => (
                <button key={a.id} className={`app-icon app-${a.id}`} onClick={() => (a.id === "gyaan" ? onLearn?.(null) : a.id === "exchange" ? onExchange?.() : a.id === "arcade" ? onArcade?.() : setApp(a.id))}>
                  <a.icon size={26} />
                  <span>{t(`phone.apps.${a.id}`)}</span>
                  {a.badge > 0 && <b className="badge">{a.badge}</b>}
                </button>
              ))}
            </div>
          )}
          {app && (
            <button className="app-back" onClick={() => setApp(null)}>
              <ArrowLeft size={15} /> {t(`phone.apps.${app}`)}
            </button>
          )}
          {app === "messages" && (
            <ul className="msg-list">
              {phone.notifications.length === 0 && <li className="quiet">{t("phone.noMessages")}</li>}
              {phone.notifications.map((n) => (
                <li key={n.key}>
                  <button onClick={() => onNotification(n.key)}>
                    <MessageSquare size={15} /> {n.title ? plain(n.title) : t("phone.apps.messages")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {app === "bank" && <BankApp life={life} phone={phone} dispatch={dispatch} />}
          {app === "invest" && <InvestApp market={market} dispatch={dispatch} onLearn={onLearn} />}
        </div>
      </div>
    </div>
  );
}

function BankApp({ phone, dispatch }) {
  const { t, money } = useT();
  const [from, setFrom] = useState("cash");
  const [to, setTo] = useState("goal");
  const [amount, setAmount] = useState(500);
  const accounts = ["cash", "emergency", "goal", ...(phone.accounts.bank != null ? ["bank"] : [])];
  return (
    <div className="bank-app">
      <dl className="balances">
        {accounts.map((a) => (
          <div key={a}>
            <dt>{t(`sources.${a}`)}</dt>
            <dd>{money(phone.accounts[a] ?? 0)}</dd>
          </div>
        ))}
      </dl>
      <form
        className="move-form"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "MOVE_MONEY", from, to, amount: Number(amount) });
        }}
      >
        <strong>{t("phone.move")}</strong>
        <label>
          {t("phone.from")}
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {t(`sources.${a}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("phone.to")}
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {t(`sources.${a}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("phone.amount")}
          <input type="number" min="1" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="secondary-button" type="submit">
          {t("phone.moveButton")}
        </button>
      </form>
      <strong>{t("phone.loans")}</strong>
      {phone.loans.length === 0 && <p className="quiet">{t("phone.noLoans")}</p>}
      <ul className="loan-list">
        {phone.loans.map((l) => (
          <li key={l.id}>
            <span>
              <b>{t(`loans.${l.source}`)}</b> {money(l.balance)} · {Math.round(l.rateYearly * 100)}%
            </span>
            <button className="secondary-button small" onClick={() => dispatch({ type: "REPAY", loanId: l.id, amount: "all" })}>
              {t("phone.prepayAll")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spark({ history }) {
  const ys = history.map((h) => h.price);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys, lo + 1);
  const pts = ys.map((v, i) => `${(i / Math.max(1, ys.length - 1)) * 96 + 2},${30 - ((v - lo) / (hi - lo)) * 26}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 32" aria-hidden="true">
      <polyline points={pts} fill="none" strokeWidth="2" />
    </svg>
  );
}

function InvestApp({ market, dispatch, onLearn }) {
  const { t, money, signed } = useT();
  const [amount, setAmount] = useState(1000);
  if (!market.unlocked) return <p className="quiet">{market.reason === "age" ? t("phone.minAge", { age: market.minAge }) : t("phone.locked")}</p>;
  const row = (x) => {
    const gain = x.value - x.invested;
    return (
      <li key={x.id} className="instrument">
        <div className="ins-head">
          <b>{t(`instruments.${x.id}`)}</b>
          <span className={`risk risk-${x.risk}`} title={t("phone.risk")}>
            {"●".repeat(x.risk)}
            {"○".repeat(5 - x.risk)}
          </span>
        </div>
        <Spark history={x.history} />
        <small>
          {x.lastReturn != null && t("phone.lastYear", { pct: (x.lastReturn * 100).toFixed(1) })}
          {x.expenseRatio != null && ` · ${t("phone.fee", { pct: (x.expenseRatio * 100).toFixed(1) })}`}
          {x.badNews.length > 0 && ` · ${t("phone.badNews", { ages: x.badNews.join(", ") })}`}
        </small>
        {x.value > 0 && (
          <small>
            {t("phone.value", { value: money(x.value) })} · <span className={gain >= 0 ? "up" : "down"}>{signed(gain)}</span>
          </small>
        )}
        <div className="ins-actions">
          <button className="secondary-button small" onClick={() => dispatch({ type: "TRADE", product: x.id, amount: Number(amount) })}>
            {t("phone.buy")}
          </button>
          {x.value > 0 && (
            <button className="secondary-button small" onClick={() => dispatch({ type: "TRADE", product: x.id, amount: -Number(amount) })}>
              {t("phone.sell")}
            </button>
          )}
          {onLearn && (
            <button className="text-button" onClick={() => onLearn(x.kind === "stock" ? "topic:share" : x.id === "mf_active" ? "topic:index_vs_active" : x.id === "mf_debt" ? "topic:debt_fund" : "topic:sip")}>
              {t("gyaan.learnMore")}
            </button>
          )}
        </div>
      </li>
    );
  };
  return (
    <div className="invest-app">
      <p className="quiet">{t("phone.noTicker")}</p>
      <label className="amount-field">
        {t("phone.amount")}
        <input type="number" min="100" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <p className="quiet">{t("phone.cash", { amount: money(market.cash) })}</p>
      {market.concentration > 0.5 && market.total > 0 && <p className="warn-line">{t("phone.concentration", { pct: Math.round(market.concentration * 100) })}</p>}
      <h3>{t("phone.funds")}</h3>
      <ul>{market.funds.map(row)}</ul>
      <h3>{t("phone.stocks")}</h3>
      <p className="quiet">{t("phone.brokerage", { amount: money(market.brokerage) })}</p>
      <ul>{market.stocks.map(row)}</ul>
      {market.hasBank && (
        <>
          <h3>{t("phone.deposits")}</h3>
          <ul>{market.deposits.map(row)}</ul>
        </>
      )}
    </div>
  );
}
