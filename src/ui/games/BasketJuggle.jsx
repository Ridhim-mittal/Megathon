import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloudLightning, Egg, Landmark, Shield, TrendingUp } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { MiniShell } from "./MiniShell.jsx";

// Basket Juggle: twenty eggs (your savings) arrive one by one; tap a basket (or 1–3) to place
// each. Three storms hit a random basket: it loses half its eggs, and a basket holding more than
// half of all your eggs loses them all. Win: 12 eggs left at the end.
const EGGS = 20;
const EGG_MS = 1300;
const STORMS = [7, 13, 19];
const NEED = 12;
const BASKETS = [
  { id: "index", icon: TrendingUp },
  { id: "debt", icon: Shield },
  { id: "rd", icon: Landmark },
];

function Play({ onFinish }) {
  const { t } = useT();
  const [baskets, setBaskets] = useState([0, 0, 0]);
  const [n, setN] = useState(0);
  const [cracked, setCracked] = useState(0);
  const [storm, setStorm] = useState(null); // { at, lost, key }
  const ref = useRef({ baskets: [0, 0, 0], n: 0, busy: false });

  const finish = useCallback(
    (b) => {
      const kept = b.reduce((a, x) => a + x, 0);
      setTimeout(() => onFinish(kept >= NEED, t("baskets.kept", { n: kept, total: EGGS })), 900);
    },
    [onFinish, t],
  );

  const place = useCallback(
    (i) => {
      const r = ref.current;
      if (r.n >= EGGS || r.busy) return;
      const b = [...r.baskets];
      if (i >= 0) {
        b[i] += 1;
        sounds.tap?.();
      } else {
        setCracked((c) => c + 1);
        sounds.thud?.();
      }
      r.n += 1;
      // A storm after this egg?
      if (STORMS.includes(r.n)) {
        const at = Math.floor(Math.random() * 3);
        const total = b.reduce((a, x) => a + x, 0);
        const lost = b[at] * 2 > total ? b[at] : Math.ceil(b[at] / 2);
        b[at] -= lost;
        r.busy = true;
        setStorm({ at, lost, key: r.n, all: lost > 0 && b[at] === 0 && lost * 2 > total });
        sounds.thud?.();
        setTimeout(() => {
          r.busy = false;
          setStorm(null);
        }, 1300);
      }
      r.baskets = b;
      setBaskets(b);
      setN(r.n);
      if (r.n >= EGGS) finish(b);
    },
    [finish],
  );

  // An egg nobody catches cracks.
  useEffect(() => {
    if (n >= EGGS) return undefined;
    const id = setTimeout(() => place(-1), EGG_MS + (storm ? 1300 : 0));
    return () => clearTimeout(id);
  }, [n, storm, place]);

  useEffect(() => {
    const onKey = (e) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) place(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place]);

  const total = baskets.reduce((a, x) => a + x, 0);
  return (
    <div className="bj-play">
      <div className="bj-top">
        <span className="bj-count">
          <Egg size={18} aria-hidden="true" /> {total}
        </span>
        <span className="bj-storms" aria-label={t("baskets.storms")}>
          {STORMS.map((s) => (
            <CloudLightning key={s} size={18} className={n >= s ? "past" : ""} />
          ))}
        </span>
        <span className="bj-left">{EGGS - n}</span>
      </div>
      <div className="bj-chute">
        {n < EGGS && !storm && (
          <span className="bj-egg" key={n} style={{ animationDuration: `${EGG_MS}ms` }}>
            <Egg size={30} />
          </span>
        )}
        {storm && (
          <p className="bj-storm-msg" key={storm.key}>
            <CloudLightning size={22} /> {storm.all ? t("baskets.stormAll", { n: storm.lost }) : t("baskets.storm", { n: storm.lost })}
          </p>
        )}
      </div>
      <div className="bj-baskets">
        {BASKETS.map((b, i) => {
          const heavy = total > 2 && baskets[i] * 2 > total;
          return (
            <button key={b.id} className={`bj-basket ${heavy ? "heavy" : ""} ${storm?.at === i ? "hit" : ""}`} onClick={() => place(i)}>
              {storm?.at === i && <CloudLightning className="bj-bolt" size={36} />}
              <kbd>{i + 1}</kbd>
              <b.icon size={22} aria-hidden="true" />
              <b>{t(`baskets.basket.${b.id}`)}</b>
              <span className="bj-eggs" aria-label={`${baskets[i]}`}>
                {Array.from({ length: Math.min(baskets[i], 12) }, (_, k) => (
                  <i key={k} />
                ))}
                {baskets[i] > 12 && <small>+{baskets[i] - 12}</small>}
              </span>
              {heavy && <small className="bj-warn">{t("baskets.heavy")}</small>}
            </button>
          );
        })}
      </div>
      {cracked > 0 && <p className="bj-cracked">{t("baskets.cracked", { n: cracked })}</p>}
    </div>
  );
}

export function BasketJuggle({ mode = "story", avatar, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  return (
    <MiniShell
      id="baskets"
      icon={Egg}
      ribbon={t("baskets.ribbon")}
      title={t("baskets.title")}
      lead={t("baskets.lead")}
      mentor="banker"
      avatar={avatar}
      stage="adult"
      mode={mode}
      steps={[
        { art: <Egg size={28} />, text: t("baskets.step1") },
        { art: <CloudLightning size={28} />, text: t("baskets.step2") },
        { art: <Shield size={28} />, text: t("baskets.step3") },
      ]}
      rule={t("baskets.rule", { need: NEED, total: EGGS })}
      wonText={t("baskets.wonText")}
      lostText={t("baskets.lostText")}
      play={(p) => <Play {...p} />}
      onWin={onWin}
      onClose={onClose}
      onGiveUp={onGiveUp}
    />
  );
}
