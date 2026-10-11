import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BatteryMedium, Delete, Flag, Lock, ShieldCheck, Signal, Wifi, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { bumpAdStat, loadAdStats } from "../persist.js";
import { sounds } from "../sound.js";
import { COSTS, adById, lostIn } from "./ads.js";

// Scam ads in the arcade, and the fake sites behind them. See ads.js for the three scams.

const rs = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ---------- the ads ----------

// Each ad looks like one of the game's own posters: a stamp, a pixel headline, a game button.
const AD_STAMP = { spin: "🎡", task: "🕹️", autopay: "⭐", loan: "💸", coins: "🪙", giveaway: "📱" };

function AdVisual({ id }) {
  return (
    <span className={`ad-stamp stamp-${id}`} aria-hidden="true">
      <span>{AD_STAMP[id]}</span>
    </span>
  );
}

// A sponsored banner. `big` is the full-screen version.
export function AdBanner({ ad, onOpen, onReport, big = false }) {
  const { t } = useT();
  const [reported, setReported] = useState(false);
  if (!ad) return null;
  const k = `arcade.ads.${ad.id}`;
  return (
    <aside className={`ad-banner ad-${ad.id} ${big ? "big" : ""} ${reported ? "reported" : ""}`} aria-label={t("arcade.ads.label")}>
      <span className="ad-tag">{t("arcade.ads.sponsored")}</span>
      {reported ? (
        <p className="ad-reported" role="status">
          <ShieldCheck size={18} aria-hidden="true" /> <b>{t("arcade.ads.reportedTitle")}</b> {t(`${k}.flags.0`)}
        </p>
      ) : (
        <button className="ad-body" onClick={() => onOpen(ad)}>
          <AdVisual id={ad.id} />
          <span className="ad-copy">
            <b>{t(`${k}.headline`)}</b>
            <small>{t(`${k}.sub`)}</small>
          </span>
          <span className="ad-cta">{t(`${k}.cta`)}</span>
        </button>
      )}
      {!reported && (
        <button
          className="ad-report"
          onClick={() => {
            setReported(true);
            bumpAdStat("reported");
            sounds.chime?.();
            setTimeout(() => onReport?.(ad), 2600);
          }}
          title={t("arcade.ads.report")}
          aria-label={t("arcade.ads.report")}
        >
          <Flag size={13} />
        </button>
      )}
    </aside>
  );
}

// A full-screen ad before a game, skippable after two seconds.
export function AdInterstitial({ ad, onOpen, onSkip }) {
  const { t } = useT();
  const [wait, setWait] = useState(2);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  return (
    <div className="ad-interstitial" role="dialog" aria-label={t("arcade.ads.label")}>
      <button className="ad-skip" onClick={onSkip} disabled={wait > 0}>
        {wait > 0 ? t("arcade.ads.skipIn", { n: wait }) : t("arcade.ads.skip")} {wait <= 0 && <X size={14} />}
      </button>
      <AdBanner ad={ad} onOpen={onOpen} onReport={onSkip} big />
    </div>
  );
}

// ---------- the phone the fake site opens on ----------

function Phone({ url, app, onClose, children }) {
  const { t } = useT();
  const [time] = useState(() => new Date().toTimeString().slice(0, 5));
  return (
    <div className="scam-phone">
      <div className="scam-status" aria-hidden="true">
        <span>{time}</span>
        <span>
          <Signal size={12} /> <Wifi size={12} /> <BatteryMedium size={14} />
        </span>
      </div>
      <div className={`scam-bar ${app ? "app" : ""}`}>
        {app ? (
          <b className="scam-app-name">{app}</b>
        ) : (
          <span className="scam-url">
            <Lock size={12} aria-hidden="true" /> {url}
          </span>
        )}
        <button className="scam-close" onClick={onClose} aria-label={t("arcade.ads.closeSite")} title={t("arcade.ads.closeSite")}>
          <X size={16} />
        </button>
      </div>
      <div className="scam-screen">{children}</div>
    </div>
  );
}

function Countdown({ from = 299 }) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    const id = setInterval(() => setLeft((x) => (x > 0 ? x - 1 : from)), 1000);
    return () => clearInterval(id);
  }, [from]);
  return (
    <b className="scam-timer">
      {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
    </b>
  );
}

// A UPI app asking for the PIN. `note` is the small print a scam hopes you skip.
function UpiPin({ ad, amount, heading, note, onPaid }) {
  const { t } = useT();
  const [pin, setPin] = useState("");
  const busy = pin.length >= 4;
  const paid = useRef(onPaid);
  paid.current = onPaid;
  useEffect(() => {
    if (pin.length < 4) return undefined;
    sounds.tap?.();
    const id = setTimeout(() => paid.current(), 1100);
    return () => clearTimeout(id);
  }, [pin]);
  const press = (d) => !busy && setPin((p) => (d === "del" ? p.slice(0, -1) : p.length < 4 ? p + d : p));
  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="upi">
      <div className="upi-payee">
        <span className="upi-avatar" aria-hidden="true">
          {ad.brand[0]}
        </span>
        <span>
          <b>{ad.brand}</b>
          <small>{ad.payee}</small>
        </span>
      </div>
      <p className="upi-heading">{heading}</p>
      <p className="upi-amount">{rs(amount)}</p>
      <p className="upi-note">{note}</p>
      <p className="upi-label">{busy ? t("arcade.ads.upi.processing") : t("arcade.ads.upi.enterPin")}</p>
      <div className="upi-dots" aria-label={t("arcade.ads.upi.enterPin")}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <div className="upi-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((d, i) =>
          d === "" ? (
            <span key={i} />
          ) : (
            <button key={i} onClick={() => press(d)} disabled={busy} aria-label={d === "del" ? t("arcade.ads.upi.delete") : d}>
              {d === "del" ? <Delete size={18} /> : d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function Sms({ items, onDone }) {
  const { t } = useT();
  const [shown, setShown] = useState(1);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    sounds.buzz?.();
    if (shown < items.length) {
      const id = setTimeout(() => setShown(shown + 1), 900);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => done.current(), 1800);
    return () => clearTimeout(id);
  }, [shown, items.length]);
  return (
    <div className="scam-sms">
      {items.slice(0, shown).map((x, i) => (
        <p key={i} className="sms">
          <small>
            {t("arcade.ads.bankSender")} · {x.when}
          </small>
          {x.text}
        </p>
      ))}
    </div>
  );
}

// ---------- the three fake sites ----------

const WHEEL = [100, 500, 10000, 50, 5000, 200, 1000, 20];

function SpinSite({ ad, step, go }) {
  const { t } = useT();
  const k = "arcade.ads.spin";
  const [turn, setTurn] = useState(0);
  if (step === "land" || step === "spinning")
    return (
      <div className="site site-spin">
        <p className="site-confetti" aria-hidden="true">
          🎉 🎊 🎉
        </p>
        <h3>{t(`${k}.landTitle`)}</h3>
        <p>{t(`${k}.landText`)}</p>
        <span className="spin-pointer" aria-hidden="true">
          ▼
        </span>
        <div className="spin-wheel" style={{ transform: `rotate(${turn}deg)` }} aria-hidden="true">
          {WHEEL.map((v, i) => (
            <span key={i} style={{ transform: `rotate(${i * 45 + 22.5}deg) translateY(-62px) rotate(90deg)` }}>
              {v >= 1000 ? `${v / 1000}K` : v}
            </span>
          ))}
        </div>
        <button
          className="site-cta"
          disabled={step === "spinning"}
          onClick={() => {
            // Land on ₹5,000 (segment 4) after a few turns.
            setTurn(360 * 5 - (4 * 45 + 22.5));
            go("spinning");
            setTimeout(() => go("won"), 2600);
          }}
        >
          {t(`${k}.spin`)}
        </button>
        <p className="site-small">
          {t("arcade.ads.offerEnds")} <Countdown />
        </p>
      </div>
    );
  if (step === "won")
    return (
      <div className="site site-spin won">
        <p className="site-confetti big" aria-hidden="true">
          🎊
        </p>
        <h3>{t(`${k}.wonTitle`)}</h3>
        <p className="site-prize">{rs(COSTS.spin.pin)}</p>
        <p>{t(`${k}.wonText`)}</p>
        <button className="site-cta" onClick={() => go("pin", "claim")}>
          {t(`${k}.claim`)}
        </button>
        <ul className="site-comments">
          <li>
            <b>Ravi K.</b> {t(`${k}.comment1`)}
          </li>
          <li>
            <b>Meena S.</b> {t(`${k}.comment2`)}
          </li>
        </ul>
      </div>
    );
  if (step === "pin") return <UpiPin ad={ad} amount={COSTS.spin.pin} heading={t(`${k}.upiHeading`)} note={t(`${k}.upiNote`)} onPaid={() => go("sms", "pin")} />;
  return <Sms items={[{ when: t("arcade.ads.now"), text: t(`${k}.sms`, { amount: rs(COSTS.spin.pin), payee: ad.payee }) }]} onDone={() => go("end")} />;
}

const TASKS = [
  { app: "Candy Blast", pay: 350 },
  { app: "Tiny Farm", pay: 420 },
  { app: "Cricket Star", pay: 380 },
];

function TaskSite({ ad, step, go }) {
  const { t } = useT();
  const k = "arcade.ads.task";
  const [rated, setRated] = useState([]);
  const earned = 1300 + rated.reduce((a, i) => a + TASKS[i].pay, 0);
  if (step === "land")
    return (
      <div className="site site-task">
        <h3>{t(`${k}.landTitle`)}</h3>
        <p>{t(`${k}.landText`)}</p>
        <p className="site-live">
          <i aria-hidden="true" /> {t(`${k}.joined`, { n: "12,481" })}
        </p>
        <ul className="site-comments">
          <li>
            <b>Priya, Warangal</b> {t(`${k}.comment1`)}
          </li>
          <li>
            <b>Arjun, Nellore</b> {t(`${k}.comment2`)}
          </li>
        </ul>
        <button className="site-cta" onClick={() => go("payJoin")}>
          {t(`${k}.join`, { fee: rs(COSTS.task.join) })}
        </button>
        <p className="site-small">{t(`${k}.refundable`)}</p>
      </div>
    );
  if (step === "payJoin") return <UpiPin ad={ad} amount={COSTS.task.join} heading={t(`${k}.joinHeading`)} note={t(`${k}.joinNote`)} onPaid={() => go("dash", "join")} />;
  if (step === "dash" || step === "locked")
    return (
      <div className="site site-task dash">
        <div className="task-wallet">
          <small>{t(`${k}.wallet`)}</small>
          <b>{rs(earned)}</b>
        </div>
        <ul className="task-list">
          {TASKS.map((x, i) => (
            <li key={x.app}>
              <span>
                <b>{x.app}</b> ★★★★★
              </span>
              <button disabled={rated.includes(i)} onClick={() => setRated([...rated, i])}>
                {rated.includes(i) ? "✓" : `+${rs(x.pay)}`}
              </button>
            </li>
          ))}
        </ul>
        <button className="site-cta" disabled={rated.length < 2} onClick={() => go("locked")}>
          {t(`${k}.withdraw`, { amount: rs(earned) })}
        </button>
        {step === "locked" && (
          <div className="site-modal" role="alertdialog">
            <p className="site-confetti" aria-hidden="true">
              🔒
            </p>
            <h4>{t(`${k}.lockedTitle`)}</h4>
            <p>{t(`${k}.lockedText`, { fee: rs(COSTS.task.vip), amount: rs(earned) })}</p>
            <p className="site-small">
              {t("arcade.ads.offerEnds")} <Countdown from={599} />
            </p>
            <button className="site-cta" onClick={() => go("payVip")}>
              {t(`${k}.upgrade`, { fee: rs(COSTS.task.vip) })}
            </button>
          </div>
        )}
      </div>
    );
  if (step === "payVip") return <UpiPin ad={ad} amount={COSTS.task.vip} heading={t(`${k}.vipHeading`)} note={t(`${k}.joinNote`)} onPaid={() => go("frozen", "vip")} />;
  return (
    <div className="site site-task">
      <p className="site-confetti big" aria-hidden="true">
        ⏳
      </p>
      <h3>{t(`${k}.frozenTitle`)}</h3>
      <p>{t(`${k}.frozenText`, { tax: rs(4999) })}</p>
      <button className="site-cta" onClick={() => go("end")}>
        {t(`${k}.payTax`, { tax: rs(4999) })}
      </button>
    </div>
  );
}

function AutopaySite({ ad, step, go }) {
  const { t } = useT();
  const k = "arcade.ads.autopay";
  const c = COSTS.autopay;
  if (step === "land")
    return (
      <div className="site site-pro">
        <span className="pro-badge" aria-hidden="true">
          PRO
        </span>
        <h3>{t(`${k}.landTitle`)}</h3>
        <ul className="pro-perks">
          <li>✅ {t(`${k}.perk1`)}</li>
          <li>✅ {t(`${k}.perk2`)}</li>
          <li>✅ {t(`${k}.perk3`)}</li>
        </ul>
        <p className="site-prize">
          <s>₹499</s> ₹1
        </p>
        <button className="site-cta" onClick={() => go("mandate")}>
          {t(`${k}.unlock`)}
        </button>
      </div>
    );
  if (step === "mandate")
    return (
      <div className="upi mandate">
        <div className="upi-payee">
          <span className="upi-avatar" aria-hidden="true">
            A
          </span>
          <span>
            <b>{ad.brand}</b>
            <small>{ad.payee}</small>
          </span>
        </div>
        <p className="upi-amount">₹1</p>
        <div className="mandate-fine">
          <b>{t(`${k}.autopay`)}</b>
          <span>{t(`${k}.fine`, { max: rs(c.monthly) })}</span>
          <label>
            <input type="checkbox" defaultChecked /> {t(`${k}.agree`)}
          </label>
        </div>
        <button className="site-cta" onClick={() => go("pin")}>
          {t(`${k}.approve`)}
        </button>
      </div>
    );
  if (step === "pin") return <UpiPin ad={ad} amount={c.first} heading={t(`${k}.pinHeading`)} note={t(`${k}.pinNote`)} onPaid={() => go("sms", "mandate")} />;
  return (
    <Sms
      items={[
        { when: t("arcade.ads.now"), text: t(`${k}.sms1`) },
        ...Array.from({ length: c.months }, (_, i) => ({ when: t(`${k}.month`, { n: i + 1 }), text: t(`${k}.sms2`, { amount: rs(c.monthly) }) })),
      ]}
      onDone={() => go("end")}
    />
  );
}

function Toggle({ on }) {
  return <span className={`perm-toggle ${on ? "on" : ""}`} aria-hidden="true" />;
}

function LoanSite({ ad, step, go }) {
  const { t } = useT();
  const k = "arcade.ads.loan";
  const c = COSTS.loan;
  if (step === "land")
    return (
      <div className="site site-loan">
        <span className="loan-logo" aria-hidden="true">
          ₹
        </span>
        <h3>{t(`${k}.landTitle`)}</h3>
        <p>{t(`${k}.landText`)}</p>
        <div className="loan-amount">
          <small>{t(`${k}.amount`)}</small>
          <b>₹50,000</b>
          <i aria-hidden="true">
            <span />
          </i>
        </div>
        <ul className="pro-perks">
          <li>✅ {t(`${k}.perk1`)}</li>
          <li>✅ {t(`${k}.perk2`)}</li>
          <li>✅ {t(`${k}.perk3`)}</li>
        </ul>
        <button className="site-cta" onClick={() => go("perms")}>
          {t(`${k}.get`)}
        </button>
        <p className="site-small">{t(`${k}.rating`)}</p>
      </div>
    );
  if (step === "perms")
    return (
      <div className="site site-perms">
        <span className="loan-logo small" aria-hidden="true">
          ₹
        </span>
        <h4>{t(`${k}.permsTitle`, { app: ad.brand })}</h4>
        <ul className="perm-list">
          {["contacts", "photos", "sms", "location"].map((x) => (
            <li key={x}>
              <span>{t(`${k}.perm.${x}`)}</span>
              <Toggle on />
            </li>
          ))}
        </ul>
        <button className="site-cta blue" onClick={() => go("approved", "perms")}>
          {t(`${k}.allow`)}
        </button>
      </div>
    );
  if (step === "approved")
    return (
      <div className="site site-loan">
        <p className="site-confetti big" aria-hidden="true">
          ✅
        </p>
        <h3>{t(`${k}.approvedTitle`)}</h3>
        <p>{t(`${k}.approvedText`, { fee: rs(c.fee) })}</p>
        <button className="site-cta" onClick={() => go("pin")}>
          {t(`${k}.payFee`, { fee: rs(c.fee) })}
        </button>
      </div>
    );
  if (step === "pin") return <UpiPin ad={ad} amount={c.fee} heading={t(`${k}.feeHeading`)} note={t(`${k}.feeNote`)} onPaid={() => go("sms", "fee")} />;
  return (
    <Sms
      items={[
        { when: t("arcade.ads.now"), text: t(`${k}.sms1`) },
        { when: t(`${k}.day`, { n: 3 }), text: t(`${k}.sms2`) },
        { when: t(`${k}.day`, { n: 4 }), text: t(`${k}.sms3`) },
      ]}
      onDone={() => go("end")}
    />
  );
}

function CoinsSite({ ad, step, go }) {
  const { t } = useT();
  const k = "arcade.ads.coins";
  const [otp, setOtp] = useState("");
  if (step === "land")
    return (
      <div className="site site-coins">
        <p className="site-confetti big" aria-hidden="true">
          🪙
        </p>
        <h3>{t(`${k}.landTitle`)}</h3>
        <p>{t(`${k}.landText`)}</p>
        <button className="site-cta" onClick={() => go("login")}>
          {t(`${k}.claim`)}
        </button>
        <p className="site-small">
          {t("arcade.ads.offerEnds")} <Countdown from={179} />
        </p>
      </div>
    );
  if (step === "login")
    return (
      <form
        key="login"
        className="site site-bank"
        onSubmit={(e) => {
          e.preventDefault();
          go("otp", "login");
        }}
      >
        <div className="bank-head">
          <b>GramBank</b> <small>NetBanking</small>
        </div>
        <p className="site-small">{t(`${k}.loginNote`)}</p>
        <label>
          {t(`${k}.customerId`)}
          <input defaultValue="44170912" />
        </label>
        <label>
          {t(`${k}.password`)}
          <input type="password" defaultValue="lakshyam" />
        </label>
        <button className="site-cta blue" type="submit">
          {t(`${k}.login`)}
        </button>
      </form>
    );
  return (
    <form
      key="otp"
      className="site site-bank"
      onSubmit={(e) => {
        e.preventDefault();
        go("end", "otp");
      }}
    >
      <p className="sms otp-sms">
        <small>{t("arcade.ads.bankSender")}</small>
        {t(`${k}.otpSms`, { amount: rs(COSTS.coins.transfer) })}
      </p>
      <div className="bank-head">
        <b>GramBank</b> <small>NetBanking</small>
      </div>
      <label>
        {t(`${k}.otpLabel`)}
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="••••••" autoFocus />
      </label>
      <button className="site-cta blue" type="submit" disabled={otp.length < 4}>
        {t(`${k}.verify`)}
      </button>
    </form>
  );
}

function GiveawaySite({ ad, step, go }) {
  const { t, playerName } = useT();
  const k = "arcade.ads.giveaway";
  const c = COSTS.giveaway;
  if (step === "land")
    return (
      <div className="site site-gift">
        <p className="site-confetti" aria-hidden="true">
          🏆 📱 🏆
        </p>
        <h3>{t(`${k}.landTitle`)}</h3>
        <p className="gift-rank">{t(`${k}.rank`, { n: 37 })}</p>
        <p>{t(`${k}.landText`)}</p>
        <button className="site-cta" onClick={() => go("address")}>
          {t(`${k}.claim`)}
        </button>
        <p className="site-small">
          {t(`${k}.left`, { n: 3 })} · {t("arcade.ads.offerEnds")} <Countdown from={239} />
        </p>
      </div>
    );
  if (step === "address")
    return (
      <form
        className="site site-bank gift-form"
        onSubmit={(e) => {
          e.preventDefault();
          go("payDelivery");
        }}
      >
        <h4>{t(`${k}.addressTitle`)}</h4>
        <label>
          {t(`${k}.name`)}
          <input defaultValue={playerName} />
        </label>
        <label>
          {t(`${k}.village`)}
          <input defaultValue="Ramapuram" />
        </label>
        <p className="gift-fee">{t(`${k}.deliveryFee`, { fee: rs(c.delivery) })}</p>
        <button className="site-cta" type="submit">
          {t(`${k}.pay`, { fee: rs(c.delivery) })}
        </button>
      </form>
    );
  if (step === "payDelivery") return <UpiPin ad={ad} amount={c.delivery} heading={t(`${k}.deliveryHeading`)} note={t(`${k}.payNote`)} onPaid={() => go("customs", "delivery")} />;
  if (step === "customs")
    return (
      <div className="site site-gift">
        <p className="site-confetti big" aria-hidden="true">
          📦
        </p>
        <h3>{t(`${k}.customsTitle`)}</h3>
        <p>{t(`${k}.customsText`, { fee: rs(c.customs) })}</p>
        <button className="site-cta" onClick={() => go("payCustoms")}>
          {t(`${k}.pay`, { fee: rs(c.customs) })}
        </button>
      </div>
    );
  if (step === "payCustoms") return <UpiPin ad={ad} amount={c.customs} heading={t(`${k}.customsHeading`)} note={t(`${k}.payNote`)} onPaid={() => go("gone", "customs")} />;
  return (
    <div className="site site-gift">
      <p className="site-confetti big" aria-hidden="true">
        🚫
      </p>
      <h3>{t(`${k}.goneTitle`)}</h3>
      <p>{t(`${k}.goneText`)}</p>
      <button className="site-cta" onClick={() => go("end")}>
        {t(`${k}.track`)}
      </button>
    </div>
  );
}

const SITES = { spin: SpinSite, task: TaskSite, autopay: AutopaySite, loan: LoanSite, coins: CoinsSite, giveaway: GiveawaySite };
const APP_STEPS = new Set(["pin", "payJoin", "payVip", "mandate", "sms", "payDelivery", "payCustoms"]);

// The fake site, then the reveal. Closing it at any point ends the scam where it stands.
export function ScamSite({ adId, onClose }) {
  const { t } = useT();
  const ad = adById[adId];
  const [step, setStep] = useState("land");
  const [paid, setPaid] = useState([]);
  const [done, setDone] = useState(false);
  const closeRef = useRef(null);
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    bumpAdStat("clicked");
  }, []);
  const lost = lostIn(adId, paid);
  const finish = () => {
    setDone(true);
    const scammed = lostIn(adId, paid) > 0;
    (scammed ? sounds.gotcha : sounds.chime)?.();
    bumpAdStat(scammed ? "scammed" : "escaped");
  };
  const go = (next, paidStep) => {
    if (paidStep) setPaid((p) => (p.includes(paidStep) ? p : [...p, paidStep]));
    if (next === "end") finish();
    else setStep(next);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (done) onClose();
        else finish();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  useEffect(() => closeRef.current?.focus(), [done]);
  const Site = SITES[adId];
  // On the page itself, not inside the game window (whose animation would clip a fixed layer).
  return createPortal(
    <div className="scam-overlay" role="dialog" aria-modal="true" aria-label={ad.brand}>
      {!done ? (
        <Phone url={ad.domain} app={step === "perms" ? ad.brand : APP_STEPS.has(step) ? t("arcade.ads.upi.app") : null} onClose={finish}>
          <Site ad={ad} step={step} go={go} />
        </Phone>
      ) : (
        <ScamReveal ad={ad} lost={lost} onClose={onClose} closeRef={closeRef} />
      )}
    </div>,
    document.body,
  );
}

function ScamReveal({ ad, lost, onClose, closeRef }) {
  const { t } = useT();
  const k = `arcade.ads.${ad.id}`;
  const stats = loadAdStats();
  const scammed = lost > 0;
  return (
    <div className={`scam-reveal ${scammed ? "lost" : "escaped"}`}>
      <span className="reveal-icon" aria-hidden="true">
        {scammed ? "🎣" : "🏃"}
      </span>
      <h3>{scammed ? t("arcade.ads.scammedTitle") : t("arcade.ads.escapedTitle")}</h3>
      <p className="reveal-amount">{scammed ? t("arcade.ads.lost", { amount: rs(lost) }) : t("arcade.ads.nothingLost")}</p>
      <p className="reveal-what">{t(`${k}.what`)}</p>
      <ul className="reveal-flags">
        {[0, 1, 2].map((i) => (
          <li key={i} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
            <Flag size={14} aria-hidden="true" /> {t(`${k}.flags.${i}`)}
          </li>
        ))}
      </ul>
      <p className="reveal-help">{t(`${k}.help`)}</p>
      <p className="reveal-stats">{t("arcade.ads.stats", { clicked: stats.clicked ?? 0, reported: stats.reported ?? 0 })}</p>
      <button ref={closeRef} className="primary-button big" onClick={onClose}>
        {t("arcade.ads.back")}
      </button>
    </div>
  );
}
