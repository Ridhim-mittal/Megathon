import React, { useCallback, useEffect, useRef, useState } from "react";
import { CandlestickChart, Check, FastForward, Newspaper, Pause, Play, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { ASSUMPTIONS } from "../gameAdapter.js";
import { account, available, cancel, checkOrder, createBook, levels, priceBand, queueAhead, submit, tick } from "./orderbook.js";
import { GuidedExchange } from "./GuidedExchange.jsx";

// The phone's practice exchange: a live order book with other traders, where the player places
// market and limit orders with practice money and learns how prices are really made.

const MISSIONS = ["read", "market", "limit", "limitFill", "slippage", "profit", "news"];
const SPEEDS = [5000, 1500]; // the market moves every 5 s (fast: 1.5 s), slow enough to follow

// The session survives closing the phone (until the page reloads).
let session = null;
function getSession() {
  if (!session) session = { book: createBook({ price: 100, cash: 10000, fee: ASSUMPTIONS.market?.brokerage ?? 20 }), done: [], explain: null };
  return session;
}

const rs = (n, d = 0) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export function StockExchange({ onClose, onLearn }) {
  const { t } = useT();
  const s = getSession();
  const book = s.book;
  const [, setVersion] = useState(0);
  const redraw = () => setVersion((v) => v + 1);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [ticket, setTicket] = useState({ side: "buy", type: "market", qty: 5, price: book.bids[0]?.price ?? book.ltp });
  const [error, setError] = useState(null);
  // First time: the guided steps; after finishing or skipping them, the full market.
  const [guided, setGuided] = useState(!s.guideDone);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  const complete = useCallback((id) => {
    if (!s.done.includes(id)) s.done = [...s.done, id];
  }, [s]);
  const explain = (tone, text) => {
    s.explain = { tone, text, key: Date.now() };
  };

  // The other traders act on a timer.
  useEffect(() => {
    if (!running || guided) return undefined;
    const id = setInterval(() => {
      const r = tick(book);
      if (r.news) complete("news");
      for (const p of r.passive) {
        complete("limitFill");
        let text = t(p.side === "buy" ? "exchange.explain.passiveBuy" : "exchange.explain.passiveSell", { name: p.name, qty: p.qty, price: rs(p.price) });
        if (p.side === "sell" && p.avg && p.price > p.avg) {
          complete("profit");
          text += ` ${t("exchange.explain.profit", { gain: rs((p.price - p.avg) * p.qty) })}`;
        }
        explain("good", text);
      }
      redraw();
    }, SPEEDS[speed]);
    return () => clearInterval(id);
  }, [running, speed, book, complete, t, guided]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function place(e) {
    e.preventDefault();
    const order = { side: ticket.side, type: ticket.type, qty: Math.round(Number(ticket.qty)), price: Math.round(Number(ticket.price)) };
    const err = checkOrder(book, order);
    if (err) {
      const band = priceBand(book);
      setError(t(`exchange.err.${err}`, { fee: rs(book.fee), lo: rs(band.lo), hi: rs(band.hi) }));
      return;
    }
    setError(null);
    const before = account(book);
    const r = submit(book, { ...order, owner: "me", name: t("exchange.you") });
    const filled = r.fills.reduce((a, f) => a + f.qty, 0);
    const prices = [...new Set(r.fills.map((f) => f.price))];
    const avg = filled ? r.fills.reduce((a, f) => a + f.price * f.qty, 0) / filled : 0;
    const parts = [];
    if (filled) {
      parts.push(
        t(order.side === "buy" ? "exchange.explain.bought" : "exchange.explain.sold", {
          qty: filled,
          n: r.fills.length,
          avg: rs(avg, 2),
          best: rs(r.bestBefore),
          fee: rs(book.fee),
        }),
      );
      if (prices.length > 1) {
        parts.push(t("exchange.explain.slippage", { levels: prices.length, best: rs(r.bestBefore), avg: rs(avg, 2), cost: rs((avg - r.bestBefore) * filled * (order.side === "buy" ? 1 : -1)) }));
        if (order.type === "market") complete("slippage");
      }
      if (order.type === "market" && order.side === "buy") complete("market");
      if (order.side === "sell" && before.shares && avg > before.avg) {
        complete("profit");
        parts.push(t("exchange.explain.profit", { gain: rs((avg - before.avg) * filled - book.fee) }));
      }
    }
    if (r.rested) {
      parts.push(t(order.side === "buy" ? "exchange.explain.restedBuy" : "exchange.explain.restedSell", { qty: r.rested, price: rs(order.price), ahead: queueAhead(book, r.id) }));
      complete("limit");
    }
    if (r.cancelled) parts.push(t("exchange.explain.cancelled", { qty: r.cancelled }));
    explain(filled ? "good" : "info", parts.join(" "));
    redraw();
  }

  const asks = levels(book.asks).reverse();
  const bids = levels(book.bids);
  const maxQty = Math.max(1, ...asks.map((l) => l.qty), ...bids.map((l) => l.qty));
  const bestBid = book.bids[0]?.price;
  const bestAsk = book.asks[0]?.price;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const acc = account(book);
  const av = available(book);
  const change = book.ltp - book.open;
  const mine = [...book.bids, ...book.asks].filter((o) => o.owner === "me");
  const tape = book.trades.slice(-9).reverse();
  const current = MISSIONS.find((m) => !s.done.includes(m));
  const showNews = book.news && book.t - book.news.t < 14;

  const pickPrice = (price) => {
    setTicket((x) => ({ ...x, type: "limit", price }));
    complete("read");
    explain("info", t("exchange.explain.read", { bid: rs(bestBid), ask: rs(bestAsk), spread: rs(spread ?? 0) }));
    redraw();
  };

  if (guided)
    return (
      <GuidedExchange
        book={book}
        onClose={onClose}
        onFinish={() => {
          s.guideDone = true;
          setGuided(false);
        }}
      />
    );

  const row = (l, side) => (
    <tr key={`${side}-${l.price}`} className={`ex-row ${side} ${l.mine ? "mine" : ""}`} onClick={() => pickPrice(l.price)} title={t("exchange.pickPrice")}>
      <td className="ex-price">
        <i className="ex-depth" style={{ width: `${(l.qty / maxQty) * 100}%` }} aria-hidden="true" />
        {rs(l.price)}
        {l.mine && <b className="ex-you">{t("exchange.you")}</b>}
      </td>
      <td>{l.qty}</td>
      <td>{l.orders}</td>
    </tr>
  );

  return (
    <div className="view exchange">
      <header className="ex-head">
        <div className="ex-title">
          <span className="eyebrow">
            <CandlestickChart size={13} aria-hidden="true" /> {t("exchange.eyebrow")}
          </span>
          <h2 ref={heading} tabIndex={-1}>
            {t("instruments.stock_chai")}
          </h2>
        </div>
        <div className="ex-ltp">
          <small>{t("exchange.ltp")}</small>
          <strong>{rs(book.ltp)}</strong>
          <span className={change >= 0 ? "up" : "down"}>
            {change >= 0 ? "▲" : "▼"} {rs(Math.abs(change))} ({((change / book.open) * 100).toFixed(1)}%)
          </span>
        </div>
        <Spark history={book.history} />
        <div className="ex-controls">
          <small>{t("exchange.volume", { n: book.volume.toLocaleString("en-IN") })}</small>
          <button className="icon-button" onClick={() => setRunning(!running)} aria-label={running ? t("exchange.pause") : t("exchange.play")} title={running ? t("exchange.pause") : t("exchange.play")}>
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className={`icon-button ${speed ? "on" : ""}`} onClick={() => setSpeed(speed ? 0 : 1)} aria-pressed={Boolean(speed)} aria-label={t("exchange.fast")} title={t("exchange.fast")}>
            <FastForward size={16} />
          </button>
          <button className="icon-button" onClick={onClose} aria-label={t("exchange.close")} title={t("exchange.close")}>
            <X size={16} />
          </button>
        </div>
      </header>

      {showNews && (
        <p className={`ex-news ${book.news.good ? "up" : "down"}`} role="status">
          <Newspaper size={15} aria-hidden="true" /> <b>{t(`exchange.news.${book.news.id}`)}</b> {t(book.news.good ? "exchange.newsGood" : "exchange.newsBad")}
        </p>
      )}

      <div className="ex-grid">
        <section className="ex-book" aria-label={t("exchange.book")}>
          <h3>{t("exchange.book")}</h3>
          <table>
            <thead>
              <tr>
                <th>{t("exchange.price")}</th>
                <th>{t("exchange.qty")}</th>
                <th>{t("exchange.orders")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="ex-label asks">
                <td colSpan={3}>{t("exchange.asks")}</td>
              </tr>
              {asks.map((l) => row(l, "ask"))}
              <tr className="ex-spread">
                <td colSpan={3}>
                  {t("exchange.spread", { spread: spread == null ? "—" : rs(spread), last: rs(book.ltp) })}
                </td>
              </tr>
              {bids.map((l) => row(l, "bid"))}
              <tr className="ex-label bids">
                <td colSpan={3}>{t("exchange.bids")}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="ex-trade">
          <form className="ex-ticket" onSubmit={place}>
            <div className="ex-toggle" role="group" aria-label={t("exchange.side")}>
              {["buy", "sell"].map((x) => (
                <button type="button" key={x} className={`${x} ${ticket.side === x ? "on" : ""}`} aria-pressed={ticket.side === x} onClick={() => setTicket({ ...ticket, side: x })}>
                  {t(`exchange.${x}`)}
                </button>
              ))}
            </div>
            <div className="ex-toggle small" role="group" aria-label={t("exchange.type")}>
              {["market", "limit"].map((x) => (
                <button type="button" key={x} className={ticket.type === x ? "on" : ""} aria-pressed={ticket.type === x} onClick={() => setTicket({ ...ticket, type: x })}>
                  {t(`exchange.${x}`)}
                </button>
              ))}
            </div>
            <p className="quiet ex-hint">{t(`exchange.typeHint.${ticket.type}.${ticket.side}`)}</p>
            <div className="ex-fields">
              <label>
                {t("exchange.qty")}
                <input type="number" min="1" step="1" value={ticket.qty} onChange={(e) => setTicket({ ...ticket, qty: e.target.value })} />
              </label>
              {ticket.type === "limit" && (
                <label>
                  {t("exchange.limitPrice")}
                  <input type="number" min="1" step="1" value={ticket.price} onChange={(e) => setTicket({ ...ticket, price: e.target.value })} />
                </label>
              )}
            </div>
            <button className={`primary-button ex-send ${ticket.side}`} type="submit">
              {t(`exchange.send.${ticket.side}`, { qty: ticket.qty || 0 })}
            </button>
            {error && (
              <p className="warn-line" role="alert">
                {error}
              </p>
            )}
            <p className="quiet">{t("exchange.fee", { fee: rs(book.fee) })}</p>
          </form>

          <dl className="ex-account">
            <div>
              <dt>{t("exchange.cash")}</dt>
              <dd>{rs(acc.cash)}</dd>
            </div>
            <div>
              <dt>{t("exchange.shares")}</dt>
              <dd>
                {acc.shares}
                {acc.shares > 0 && <small> @ {rs(acc.avg, 2)}</small>}
              </dd>
            </div>
            <div>
              <dt>{t("exchange.pnl")}</dt>
              <dd className={acc.pnl >= 0 ? "up" : "down"}>
                {acc.pnl >= 0 ? "+" : "−"}
                {rs(Math.abs(acc.pnl))}
              </dd>
            </div>
          </dl>
          {(av.cash < acc.cash || av.shares < acc.shares) && <p className="quiet">{t("exchange.reserved", { cash: rs(acc.cash - av.cash), shares: acc.shares - av.shares })}</p>}

          {mine.length > 0 && (
            <ul className="ex-mine" aria-label={t("exchange.myOrders")}>
              {mine.map((o) => (
                <li key={o.id} className={o.side}>
                  <span>
                    <b>{t(`exchange.${o.side}`)}</b> {o.qty}/{o.orig} @ {rs(o.price)}
                    <small>{t("exchange.ahead", { n: queueAhead(book, o.id) })}</small>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      cancel(book, o.id);
                      explain("info", t("exchange.explain.cancel"));
                      redraw();
                    }}
                  >
                    {t("exchange.cancel")}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {s.explain && (
            <p key={s.explain.key} className={`ex-explain ${s.explain.tone}`} aria-live="polite">
              <b>{t("exchange.whatHappened")}</b> {s.explain.text}
            </p>
          )}
        </section>

        <section className="ex-tape" aria-label={t("exchange.tape")}>
          <h3>{t("exchange.tape")}</h3>
          <ol>
            {tape.length === 0 && <li className="quiet">{t("exchange.noTrades")}</li>}
            {tape.map((x, i) => (
              <li key={`${x.t}-${i}-${x.price}`} className={`${x.aggressor} ${x.mine ? "mine" : ""}`}>
                <b>{rs(x.price)}</b> × {x.qty}
                <small>{t(x.aggressor === "buy" ? "exchange.tapeBuy" : "exchange.tapeSell", { buyer: x.buyer, seller: x.seller })}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="ex-missions" aria-label={t("exchange.missionsTitle")}>
          <h3>
            {t("exchange.missionsTitle")} <small>{t("exchange.missionsCount", { n: s.done.length, total: MISSIONS.length })}</small>
          </h3>
          <ol>
            {MISSIONS.map((m) => (
              <li key={m} className={s.done.includes(m) ? "done" : m === current ? "current" : ""}>
                <span className="ex-check" aria-hidden="true">
                  {s.done.includes(m) ? <Check size={12} /> : MISSIONS.indexOf(m) + 1}
                </span>
                <span>
                  <b>{t(`exchange.missions.${m}.title`)}</b>
                  {(m === current || s.done.includes(m)) && <small>{t(`exchange.missions.${m}.${s.done.includes(m) ? "learned" : "how"}`)}</small>}
                </span>
              </li>
            ))}
          </ol>
          {!current && <p className="ex-explain good">{t("exchange.allDone")}</p>}
        </section>
      </div>

      <footer className="ex-foot">
        <p className="quiet">{t("exchange.practice")}</p>
        {onLearn && (
          <button className="text-button" onClick={() => onLearn("topic:share")}>
            {t("gyaan.learnMore")}
          </button>
        )}
      </footer>
    </div>
  );
}

function Spark({ history }) {
  const ys = history.slice(-60);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys, lo + 1);
  const pts = ys.map((v, i) => `${(i / Math.max(1, ys.length - 1)) * 116 + 2},${34 - ((v - lo) / (hi - lo)) * 30}`).join(" ");
  const up = ys[ys.length - 1] >= ys[0];
  return (
    <svg className={`ex-spark ${up ? "up" : "down"}`} viewBox="0 0 120 36" aria-hidden="true">
      <polyline points={pts} fill="none" strokeWidth="2" />
    </svg>
  );
}
