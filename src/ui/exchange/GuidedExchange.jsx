import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { PixelPortrait } from "../PixelPortrait.jsx";
import { account, cancel, levels, queueAhead, submit, tick } from "./orderbook.js";

// The Exchange, one small step at a time: each step shows only what it needs, one short line from
// Ammamma and one big button. Results are shown as little sums, not paragraphs. At the end (or on
// "skip"), the full market opens.

const STEPS = ["meet", "buy", "wait", "big", "sell", "news", "done"];
const rs = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function GuidedExchange({ book, onFinish, onClose }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null); // what the last action did, as a little picture
  const [waitPrice, setWaitPrice] = useState(null);
  const [waiting, setWaiting] = useState(null); // { id, price, since }
  const [newsFrom, setNewsFrom] = useState(null);
  const [, setV] = useState(0);
  const redraw = () => setV((v) => v + 1);
  const kind = STEPS[step];

  // The other traders keep trading; while you wait for a price or for news, time runs faster.
  useEffect(() => {
    const fast = kind === "wait" || kind === "news";
    const id = setInterval(() => {
      const r = tick(book);
      if (waiting && r.passive.some((p) => p.id === waiting.id)) {
        const filled = r.passive.filter((p) => p.id === waiting.id).reduce((a, p) => a + p.qty, 0);
        setResult({ kind: "filled", qty: filled, price: waiting.price });
        if (!book.bids.some((o) => o.id === waiting.id)) setWaiting(null);
      }
      if (kind === "news" && r.news) setResult({ kind: "news", news: r.news, from: newsFrom, to: book.ltp });
      redraw();
    }, fast ? 2000 : 5000); // every 5 s; 2 s while you wait for a price or the news
    return () => clearInterval(id);
  }, [book, kind, waiting, newsFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  // A news headline arrives soon after the news step starts.
  useEffect(() => {
    if (kind === "news") {
      setNewsFrom(book.ltp);
      book.nextNews = book.t + 4;
    }
    if (kind === "wait" && waitPrice == null) {
      const bid = book.bids[0]?.price ?? book.ltp - 1;
      const ask = book.asks[0]?.price ?? book.ltp + 1;
      setWaitPrice(Math.max(bid, ask - 1));
    }
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    setResult(null);
    setStep((x) => Math.min(STEPS.length - 1, x + 1));
  };

  function buyNow(qty) {
    const best = book.asks[0]?.price;
    const r = submit(book, { side: "buy", type: "market", qty, owner: "me", name: t("exchange.you") });
    const got = r.fills.reduce((a, f) => a + f.qty, 0);
    const prices = [...new Set(r.fills.map((f) => f.price))];
    setResult({ kind: qty > 10 ? "big" : "buy", qty: got, best, prices, total: r.fills.reduce((a, f) => a + f.qty * f.price, 0) });
    redraw();
  }
  function wait() {
    const r = submit(book, { side: "buy", type: "limit", qty: 5, price: waitPrice, owner: "me", name: t("exchange.you") });
    if (r.fills.length) {
      setResult({ kind: "filled", qty: r.fills.reduce((a, f) => a + f.qty, 0), price: waitPrice });
    } else {
      setWaiting({ id: r.id, price: waitPrice });
      setResult({ kind: "queued", ahead: queueAhead(book, r.id), price: waitPrice });
    }
    redraw();
  }
  function sellNow(qty) {
    const before = account(book);
    const r = submit(book, { side: "sell", type: "market", qty: Math.min(qty, Math.floor(before.shares)), owner: "me", name: t("exchange.you") });
    const got = r.fills.reduce((a, f) => a + f.qty, 0);
    const avgSell = got ? r.fills.reduce((a, f) => a + f.qty * f.price, 0) / got : 0;
    setResult({ kind: "sold", qty: got, paid: before.avg, price: avgSell, gain: (avgSell - before.avg) * got - book.fee });
    redraw();
  }

  const acc = account(book);
  const asks = levels(book.asks, 4).reverse();
  const bids = levels(book.bids, 4);
  const maxQty = Math.max(1, ...asks.map((l) => l.qty), ...bids.map((l) => l.qty));
  const up = book.ltp >= book.open;
  const queueNow = waiting ? queueAhead(book, waiting.id) : null;

  return (
    <div className="view exchange guided">
      <header className="gx-head">
        <div className="gx-price">
          <small>{t("exchange.guide.priceNow")}</small>
          <b className={up ? "up" : "down"}>
            {rs(book.ltp)} {up ? "▲" : "▼"}
          </b>
        </div>
        <div className="gx-wallet">
          <span title={t("exchange.cash")}>💵 {rs(acc.cash)}</span>
          <span title={t("exchange.shares")}>📦 {Math.floor(acc.shares)}</span>
        </div>
        <ol className="gx-dots" aria-label={t("exchange.guide.progress", { n: step + 1, total: STEPS.length })}>
          {STEPS.map((k, i) => (
            <li key={k} className={i < step ? "done" : i === step ? "on" : ""} />
          ))}
        </ol>
        <button className="panel-close" onClick={onClose} aria-label={t("exchange.close")}>
          <X size={17} />
        </button>
      </header>

      <div className="gx-coach" key={`${kind}-${result?.kind ?? ""}`}>
        <PixelPortrait role="mentor" className="gx-face" />
        <p>{result ? t(`exchange.guide.after.${result.kind === "sold" && result.gain < 0 ? "soldLoss" : result.kind}`) : t(`exchange.guide.say.${kind}`)}</p>
      </div>

      {["meet", "wait"].includes(kind) && (
        <div className="gx-book" aria-label={t("exchange.book")}>
          <p className="gx-side sell">🙋 {t("exchange.guide.sellers")}</p>
          {asks.map((l) => (
            <div key={`a${l.price}`} className="gx-row sell">
              <b>{rs(l.price)}</b>
              <i style={{ width: `${(l.qty / maxQty) * 100}%` }} />
            </div>
          ))}
          <div className="gx-mid">
            {t("exchange.guide.lastDeal")} <b>{rs(book.ltp)}</b>
          </div>
          {bids.map((l) => (
            <div key={`b${l.price}`} className={`gx-row buy ${l.mine ? "mine" : ""}`}>
              <b>{rs(l.price)}</b>
              <i style={{ width: `${(l.qty / maxQty) * 100}%` }} />
              {l.mine && <span className="gx-you">🙋 {t("exchange.you")}</span>}
            </div>
          ))}
          <p className="gx-side buy">🙋 {t("exchange.guide.buyers")}</p>
        </div>
      )}

      {result && <ResultPicture r={result} queueNow={queueNow} fee={book.fee} now={book.ltp} />}

      <div className="gx-actions">
        {kind === "meet" && (
          <button className="primary-button big" onClick={next}>
            {t("exchange.guide.gotIt")} <ArrowRight size={18} />
          </button>
        )}
        {kind === "buy" && !result && (
          <button className="primary-button big gx-buy" onClick={() => buyNow(5)}>
            🛒 {t("exchange.guide.buyN", { n: 5 })}
          </button>
        )}
        {kind === "wait" && !waiting && result?.kind !== "filled" && (
          <div className="gx-wait">
            <div className="gx-stepper">
              <button onClick={() => setWaitPrice((p) => p - 1)} aria-label="−1">
                <Minus size={18} />
              </button>
              <b>{rs(waitPrice ?? book.ltp)}</b>
              <button onClick={() => setWaitPrice((p) => p + 1)} aria-label="+1">
                <Plus size={18} />
              </button>
            </div>
            <button className="primary-button big" onClick={wait}>
              ⏳ {t("exchange.guide.waitAt", { price: rs(waitPrice ?? book.ltp) })}
            </button>
          </div>
        )}
        {kind === "wait" && waiting && (
          <button
            className="text-button"
            onClick={() => {
              cancel(book, waiting.id);
              setWaiting(null);
              setResult(null);
              setWaitPrice((p) => p + 1);
            }}
          >
            {t("exchange.guide.moveCloser")}
          </button>
        )}
        {kind === "big" && !result && (
          <button className="primary-button big gx-buy" onClick={() => buyNow(40)}>
            📦 {t("exchange.guide.buyN", { n: 40 })}
          </button>
        )}
        {kind === "sell" && (
          <button className="primary-button big gx-sell" onClick={() => sellNow(10)} disabled={acc.shares < 1}>
            💰 {t("exchange.guide.sellN", { n: 10 })}
          </button>
        )}
        {kind === "done" && (
          <button className="primary-button big" onClick={onFinish}>
            {t("exchange.guide.openFull")} <ArrowRight size={18} />
          </button>
        )}
        {result && kind !== "done" && !(kind === "wait" && result.kind === "queued") && !(kind === "news" && result.kind !== "news") && (
          <button className="primary-button big" onClick={next}>
            {t("exchange.guide.next")} <ArrowRight size={18} />
          </button>
        )}
        {kind === "news" && !result && <p className="gx-watch">📰 {t("exchange.guide.watching")}</p>}
      </div>

      {kind === "done" && (
        <ul className="gx-recap">
          {["recap1", "recap2", "recap3", "recap4"].map((k, i) => (
            <li key={k} style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
              {t(`exchange.guide.${k}`)}
            </li>
          ))}
        </ul>
      )}

      {kind !== "done" && (
        <button className="text-button gx-skip" onClick={onFinish}>
          {t("exchange.guide.skip")}
        </button>
      )}
    </div>
  );
}

// What just happened, as a small sum with pictures.
function ResultPicture({ r, queueNow, fee, now }) {
  const { t } = useT();
  if (r.kind === "buy")
    return (
      <div className="gx-result good">
        <p className="gx-sum">
          🛒 {r.qty} × {rs(r.best)} = <b>{rs(r.total)}</b>
        </p>
        <p className="gx-small">🧾 {t("exchange.guide.fee", { fee: rs(fee) })}</p>
      </div>
    );
  if (r.kind === "queued")
    return (
      <div className="gx-result info">
        <p className="gx-sum">
          ⏳ {t("exchange.guide.inLine", { price: rs(r.price) })}
        </p>
        <p className="gx-queue" aria-label={t("exchange.ahead", { n: queueNow ?? r.ahead })}>
          {Array.from({ length: Math.min(6, Math.ceil((queueNow ?? r.ahead) / 10)) }, (_, i) => (
            <span key={i}>🧍</span>
          ))}
          <span className="me">🙋</span>
        </p>
        <p className="gx-small">{t("exchange.guide.ahead", { n: queueNow ?? r.ahead })}</p>
      </div>
    );
  if (r.kind === "filled")
    return (
      <div className="gx-result good">
        <p className="gx-sum">
          🎉 {r.qty} × {rs(r.price)} ✅
        </p>
      </div>
    );
  if (r.kind === "big")
    return (
      <div className="gx-result info">
        <p className="gx-steps">
          {r.prices.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <span className="arrow">→</span>}
              <b style={{ animationDelay: `${i * 0.25}s` }}>{rs(p)}</b>
            </React.Fragment>
          ))}
        </p>
        <p className="gx-small">
          📦 {r.qty} × ≈{rs(r.total / Math.max(1, r.qty))} = {rs(r.total)}
        </p>
      </div>
    );
  if (r.kind === "sold")
    return (
      <div className={`gx-result ${r.gain >= 0 ? "good" : "bad"}`}>
        <p className="gx-sum">
          {rs(r.paid)} ➜ {rs(r.price)}
        </p>
        <p className="gx-big">{r.gain >= 0 ? `📈 +${rs(r.gain)}` : `📉 −${rs(-r.gain)}`}</p>
      </div>
    );
  if (r.kind === "news")
    return (
      <div className={`gx-result ${r.news.good ? "good" : "bad"}`}>
        <p className="gx-sum">📰 {t(`exchange.news.${r.news.id}`)}</p>
        <p className="gx-big">
          {rs(r.from)} {r.news.good ? "⬆️" : "⬇️"} {rs(now)}
        </p>
      </div>
    );
  return null;
}
