import React, { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Gift, Home, PiggyBank, Wallet } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { MiniShell } from "./MiniShell.jsx";

// Salary Split: payday drops ₹15,000 as fifteen ₹1,000 coins, one at a time. Tap a jar (or press
// 1–3) before each coin falls: money you don't give a job lands in Wants. Win: Save ≥ ₹3,000 and
// Needs ≥ ₹9,000.
const COINS = 15;
const COIN_MS = 1500;
const TARGET = { save: 3, needs: 9 };
const JARS = [
  { id: "save", icon: PiggyBank },
  { id: "needs", icon: Home },
  { id: "wants", icon: Gift },
];

function Play({ onFinish }) {
  const { t, money } = useT();
  const [jars, setJars] = useState({ save: 0, needs: 0, wants: 0 });
  const [n, setN] = useState(0); // coins handled
  const [drop, setDrop] = useState(null); // last jar a coin went into, for the animation
  const jarsRef = useRef(jars);
  const nRef = useRef(0);

  const put = useCallback(
    (jar, auto = false) => {
      if (nRef.current >= COINS) return;
      const next = { ...jarsRef.current, [jar]: jarsRef.current[jar] + 1 };
      jarsRef.current = next;
      nRef.current += 1;
      setJars(next);
      setN(nRef.current);
      setDrop({ jar, key: nRef.current, auto });
      if (auto) sounds.thud?.();
      else sounds.coin?.();
      if (nRef.current >= COINS) {
        const won = next.save >= TARGET.save && next.needs >= TARGET.needs;
        setTimeout(() => onFinish(won, `${t("salary.jar.save")} ${money(next.save * 1000)} · ${t("salary.jar.needs")} ${money(next.needs * 1000)} · ${t("salary.jar.wants")} ${money(next.wants * 1000)}`), 500);
      }
    },
    [onFinish, money, t],
  );

  // Each coin waits a moment, then drops into Wants on its own.
  useEffect(() => {
    if (n >= COINS) return undefined;
    const id = setTimeout(() => put("wants", true), COIN_MS);
    return () => clearTimeout(id);
  }, [n, put]);

  useEffect(() => {
    const onKey = (e) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) put(JARS[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [put]);

  return (
    <div className="ss-play">
      <div className="ss-top">
        <Wallet size={18} aria-hidden="true" />
        <span className="ss-left">{money((COINS - n) * 1000)}</span>
        <span className="ss-dots" aria-hidden="true">
          {Array.from({ length: COINS }, (_, i) => (
            <i key={i} className={i < n ? "used" : ""} />
          ))}
        </span>
      </div>
      <div className="ss-chute" aria-live="polite">
        {n < COINS && (
          <span className="ss-coin" key={n} style={{ animationDuration: `${COIN_MS}ms` }}>
            <Coins size={22} /> ₹1,000
          </span>
        )}
      </div>
      <div className="ss-jars">
        {JARS.map((j, i) => {
          const target = TARGET[j.id];
          const ok = target ? jars[j.id] >= target : true;
          return (
            <button key={j.id} className={`ss-jar jar-${j.id} ${ok ? "ok" : ""} ${drop?.jar === j.id ? "bump" : ""}`} onClick={() => put(j.id)}>
              <kbd>{i + 1}</kbd>
              <j.icon size={26} aria-hidden="true" />
              <b>{t(`salary.jar.${j.id}`)}</b>
              <span className="ss-fill" aria-hidden="true">
                <i style={{ height: `${Math.min(100, (jars[j.id] / (target ?? 6)) * 100)}%` }} />
              </span>
              <small>
                {money(jars[j.id] * 1000)}
                {target ? ` / ${money(target * 1000)}` : ""}
              </small>
              {drop?.jar === j.id && <span className={`ss-plus ${drop.auto ? "auto" : ""}`} key={drop.key}>+₹1,000</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SalarySplit({ mode = "story", avatar, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  return (
    <MiniShell
      id="salary"
      icon={Wallet}
      ribbon={t("salary.ribbon")}
      title={t("salary.title")}
      lead={t("salary.lead")}
      mentor="banker"
      avatar={avatar}
      mode={mode}
      steps={[
        { art: <Coins size={28} />, text: t("salary.step1") },
        { art: <PiggyBank size={28} />, text: t("salary.step2") },
        { art: <Gift size={28} />, text: t("salary.step3") },
      ]}
      rule={t("salary.rule")}
      wonText={t("salary.wonText")}
      lostText={t("salary.lostText")}
      play={(p) => <Play {...p} />}
      onWin={onWin}
      onClose={onClose}
      onGiveUp={onGiveUp}
    />
  );
}
