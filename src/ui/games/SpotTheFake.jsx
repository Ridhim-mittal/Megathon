import React, { useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock, MousePointerClick, ScanSearch, ShieldX } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { MiniShell, useCountdown } from "./MiniShell.jsx";

// Spot the Fake: a real SEBI adviser certificate on the left, Lucky Prakash's on the right. Tap
// the lines on his that give him away. A wrong tap costs 3 seconds. Win: 4 of the 5 red flags.
const SECONDS = 35;
const NEED = 4;
// Each line: [key, red flag?]. The text for both certificates comes from i18n (fake.real.*, fake.fake.*).
const LINES = [
  ["gov", true],
  ["name", false],
  ["reg", true],
  ["promise", true],
  ["address", true],
  ["fees", true],
  ["valid", false],
];

function Certificate({ kind, found, wrong, onTap }) {
  const { t } = useT();
  return (
    <div className={`sf-cert ${kind}`}>
      <span className="sf-seal" aria-hidden="true">
        {kind === "real" ? <BadgeCheck size={22} /> : <ShieldX size={22} />}
      </span>
      <b className="sf-head">{t(`fake.${kind}.head`)}</b>
      <ul>
        {LINES.map(([key]) => {
          const text = t(`fake.${kind}.${key}`);
          if (kind === "real") return <li key={key}>{text}</li>;
          return (
            <li key={key}>
              <button className={`${found.includes(key) ? "found" : ""} ${wrong === key ? "wrong" : ""}`} onClick={() => onTap(key)} disabled={found.includes(key)}>
                {text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Play({ onFinish }) {
  const { t } = useT();
  const [found, setFound] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [penalty, setPenalty] = useState(0);
  const done = useRef(false);
  const foundRef = useRef([]);
  const flags = LINES.filter(([, f]) => f).length;
  const end = (list) => {
    if (done.current) return;
    done.current = true;
    setTimeout(() => onFinish(list.length >= NEED, t("fake.score", { n: list.length, total: flags })), 600);
  };
  const raw = useCountdown(SECONDS, () => end(foundRef.current));
  const left = Math.max(0, raw - penalty);
  useEffect(() => {
    if (left <= 0) end(foundRef.current);
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function tap(key) {
    if (done.current) return;
    const isFlag = LINES.find(([k]) => k === key)?.[1];
    if (isFlag) {
      const next = [...foundRef.current, key];
      foundRef.current = next;
      setFound(next);
      sounds.coin?.();
      if (next.length >= NEED) end(next);
    } else {
      setWrong(key);
      setPenalty((p) => p + 3);
      sounds.thud?.();
      setTimeout(() => setWrong(null), 500);
    }
  }

  return (
    <div className="sf-play">
      <div className="sf-top">
        <span className="sf-found">
          <ScanSearch size={18} aria-hidden="true" /> {t("fake.found", { n: found.length, total: flags })}
        </span>
        <span className={`sf-clock ${left <= 8 ? "hurry" : ""}`}>
          <Clock size={15} aria-hidden="true" /> {Math.ceil(left)}
        </span>
      </div>
      <div className="sf-certs">
        <Certificate kind="real" found={[]} />
        <Certificate kind="fake" found={found} wrong={wrong} onTap={tap} />
      </div>
    </div>
  );
}

export function SpotTheFake({ mode = "story", avatar, onWin, onClose, onGiveUp }) {
  const { t } = useT();
  return (
    <MiniShell
      id="fake"
      icon={ScanSearch}
      ribbon={t("fake.ribbon")}
      title={t("fake.title")}
      lead={t("fake.lead")}
      mentor="friend"
      avatar={avatar}
      mode={mode}
      steps={[
        { art: <BadgeCheck size={28} />, text: t("fake.step1") },
        { art: <MousePointerClick size={28} />, text: t("fake.step2") },
        { art: <Clock size={28} />, text: t("fake.step3") },
      ]}
      rule={t("fake.rule", { need: NEED })}
      wonText={t("fake.wonText")}
      lostText={t("fake.lostText")}
      play={(p) => <Play {...p} />}
      onWin={onWin}
      onClose={onClose}
      onGiveUp={onGiveUp}
    />
  );
}
