import React, { useId, useState } from "react";
import { select } from "../../gameAdapter.js";
import { usePhoneText } from "../strings.js";
import { AmountRow, AppTitle, Line, plainPct } from "./shared.jsx";

const MOVABLE = ["cash", "emergency", "goal", "bank"];

export function BankApp({ life, run }) {
  const { s, t, money, name } = usePhoneText();
  const phone = select.phone(life);
  const market = select.market(life);
  const { accounts } = phone;
  const hasBank = accounts.bank != null;
  const accountName = (k) => s(`acc_${k}`);

  return (
    <div className="ph-app ph-bank">
      <AppTitle>{s("app_bank")}</AppTitle>

      <section className="ph-card" aria-labelledby="ph-bal">
        <h3 id="ph-bal" className="ph-card-title">{s("balances")}</h3>
        {["cash", "emergency", "goal", "wallet"].map((k) => (
          <Line key={k} label={accountName(k)} value={money(accounts[k])} />
        ))}
        <Line label={accountName("bank")} value={hasBank ? money(accounts.bank) : s("noBank")} />
      </section>

      <MoveMoney run={run} hasBank={hasBank} s={s} money={money} accountName={accountName} />

      <section className="ph-card" aria-labelledby="ph-loans">
        <h3 id="ph-loans" className="ph-card-title">{s("loans")}</h3>
        {phone.loans.length === 0 ? (
          <p className="ph-muted">{s("noLoans")}</p>
        ) : (
          <>
            <p className="ph-tip">{s("prepayTip")}</p>
            <ul className="ph-list">
              {[...phone.loans]
                .sort((a, b) => b.rateYearly - a.rateYearly)
                .map((l) => {
                  const loanName = t(`loans.${l.source}`);
                  return (
                    <li key={l.id} className="ph-loan">
                      <div className="ph-loan-head">
                        <b className="ph-cap">{loanName}</b>
                        <span className={l.rateYearly >= 0.24 ? "ph-tone-bad" : undefined}>{s("rateLine", { rate: plainPct(l.rateYearly) })}</span>
                      </div>
                      <Line label={s("leftToPay")} value={money(l.balance)} strong />
                      <p className="ph-muted">{s("emiLine", { emi: money(l.emi), months: l.monthsLeft })}</p>
                      <AmountRow
                        label={s("amount")}
                        actions={[
                          {
                            label: s("prepay"),
                            aria: s("prepayAria", { loan: loanName }),
                            onClick: (amount) => run({ type: "REPAY", loanId: l.id, amount }, s("repaid", { amount: money(amount), loan: loanName })),
                          },
                          {
                            label: s("payOff"),
                            tone: "alt",
                            noAmount: true,
                            onClick: () => run({ type: "REPAY", loanId: l.id, amount: l.balance }, s("repaid", { amount: money(l.balance), loan: loanName })),
                          },
                        ]}
                      />
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </section>

      <section className="ph-card" aria-labelledby="ph-dep">
        <h3 id="ph-dep" className="ph-card-title">{s("deposits")}</h3>
        {!market.hasBank && <p className="ph-tip">{s("needsBank")}</p>}
        <ul className="ph-list">
          {market.deposits.map((d) => (
            <li key={d.id} className="ph-deposit">
              <div className="ph-loan-head">
                <b>{name(d.id)}</b>
                {d.rate != null && d.id !== "gold" && <span>{s("rateLine", { rate: plainPct(d.rate) })}</span>}
              </div>
              <p className="ph-muted">{d.value > 0 ? s("youHold", { value: money(d.value) }) : s("holdNone")}</p>
              <AmountRow
                label={s("amount")}
                actions={[
                  { label: s("putIn"), onClick: (amount) => run({ type: "TRADE", product: d.id, amount }, s("depositDone", { amount: money(amount), name: name(d.id) })) },
                  { label: s("takeOut"), tone: "alt", onClick: (amount) => run({ type: "TRADE", product: d.id, amount: -amount }, s("withdrawDone", { amount: money(amount), name: name(d.id) })) },
                ]}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MoveMoney({ run, hasBank, s, money, accountName }) {
  const fromId = useId();
  const toId = useId();
  const places = MOVABLE.filter((k) => k !== "bank" || hasBank);
  const [from, setFrom] = useState("cash");
  const [to, setTo] = useState(hasBank ? "bank" : "emergency");
  return (
    <section className="ph-card" aria-labelledby="ph-move">
      <h3 id="ph-move" className="ph-card-title">{s("move")}</h3>
      <div className="ph-two">
        <div>
          <label htmlFor={fromId} className="ph-amount-label">{s("from")}</label>
          <select id={fromId} className="ph-input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {places.map((k) => (
              <option key={k} value={k}>{accountName(k)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={toId} className="ph-amount-label">{s("to")}</label>
          <select id={toId} className="ph-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {places.map((k) => (
              <option key={k} value={k}>{accountName(k)}</option>
            ))}
          </select>
        </div>
      </div>
      <AmountRow
        label={s("amount")}
        actions={[
          {
            label: s("moveBtn"),
            onClick: (amount) => run({ type: "MOVE_MONEY", from, to, amount }, s("moved", { amount: money(amount), from: accountName(from), to: accountName(to) })),
          },
        ]}
      />
    </section>
  );
}
