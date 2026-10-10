import { useCallback, useEffect, useMemo, useState } from "react";
import { dispatch, newLife } from "./engine/engine.js";
import { endings } from "./engine/data.js";
import { newSeed } from "./engine/rng.js";
import { I18n, makeT } from "./i18n.js";
import { loadLife, loadMeta, saveLife, saveMeta } from "./storage.js";
import { Game } from "./ui/Game.jsx";
import { Collection } from "./ui/Ending.jsx";
import { SettingsFields } from "./ui/Panels.jsx";
import { Modal } from "./ui/bits.jsx";

export default function App() {
  const [meta, setMeta] = useState(loadMeta);
  const [life, setLife] = useState(loadLife);
  const [screen, setScreen] = useState("title");
  const i18n = useMemo(() => makeT(meta.lang, meta.region), [meta.lang, meta.region]);

  useEffect(() => {
    document.documentElement.lang = meta.lang;
    saveMeta(meta);
  }, [meta]);
  useEffect(() => saveLife(life), [life]);
  useEffect(() => {
    if (life?.phase === "ending" && !meta.endings.includes(life.ending)) setMeta((m) => ({ ...m, endings: [...m.endings, life.ending] }));
  }, [life, meta.endings]);

  const send = useCallback((cmd) => setLife((s) => dispatch(s, cmd)), []);
  const start = (seed) => {
    setLife(newLife(Number.isFinite(seed) ? seed : newSeed()));
    setScreen("game");
    window.scrollTo(0, 0);
  };

  return (
    <I18n.Provider value={i18n}>
      {screen === "game" && life ? (
        <Game life={life} send={send} meta={meta} setMeta={setMeta} onMenu={() => setScreen("title")} onNewLife={() => start()} />
      ) : (
        <Title life={life} meta={meta} setMeta={setMeta} onStart={start} onContinue={() => setScreen("game")} />
      )}
    </I18n.Provider>
  );
}

function Title({ life, meta, setMeta, onStart, onContinue }) {
  const { t, regionName, tokens } = useMemo(() => makeT(meta.lang, meta.region), [meta.lang, meta.region]);
  const [showTales, setShowTales] = useState(false);
  const [seed, setSeed] = useState("");
  const inProgress = life && life.phase !== "ending";
  return (
    <main className="flex min-h-dvh flex-col bg-red text-cream" data-testid="title">
      <div className="ikat" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        <div className="panel mx-auto mt-2 w-full px-4 pt-7 pb-7 text-center text-ink">
          <svg viewBox="0 0 200 90" className="mx-auto w-48" aria-hidden>
            <rect x="0" y="72" width="200" height="18" fill="#a0703c" stroke="#241510" strokeWidth="2" />
            <path d="M30 72V44l25-20 25 20v28z" fill="#f7e9cb" stroke="#241510" strokeWidth="2.5" />
            <path d="M24 46 55 20l31 26" fill="none" stroke="#b5332e" strokeWidth="6" strokeLinejoin="round" />
            <rect x="48" y="52" width="14" height="20" fill="#2b3a67" stroke="#241510" strokeWidth="2" />
            <circle cx="160" cy="30" r="14" fill="#e9a53b" stroke="#241510" strokeWidth="2.5" />
            <g transform="translate(120 40)">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#3d7a4a" strokeWidth="3" />
              <path d="M14 2v24M2 14h24M5 5l18 18M23 5 5 23" stroke="#3d7a4a" strokeWidth="2" />
            </g>
          </svg>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{t("appName")}</h1>
          <p className="mt-1 text-[14px] font-bold">{t("tagline")}</p>
          <p className="mt-1 text-[12px] italic">
            {tokens.village} · {tokens.mentor} · {tokens.wheel}
          </p>
        </div>
        <div className="mt-5 space-y-2">
          {inProgress && (
            <button className="btn w-full bg-gold py-3 text-lg text-ink" onClick={onContinue} data-testid="continue">
              {t("continue", { age: life.cur?.age ?? life.age })}
            </button>
          )}
          <button className={`btn w-full py-3 text-lg ${inProgress ? "bg-cream text-ink" : "bg-gold text-ink"}`} onClick={() => onStart(seed ? Number(seed) : undefined)} data-testid="play">
            {inProgress ? t("restart") : t("play")}
          </button>
          {life?.phase === "ending" && (
            <button className="btn w-full bg-cream py-2 text-ink" onClick={onContinue}>
              📜 {t("end.review")}
            </button>
          )}
          <button className="btn w-full bg-cream py-2 text-ink" onClick={() => setShowTales(true)}>
            {t("endingsBtn", { n: meta.endings.length, total: endings.length })}
          </button>
        </div>
        <SettingsFields meta={meta} setMeta={setMeta} t={t} regionName={regionName} dark />
        <details className="mt-3 text-[12px]">
          <summary className="cursor-pointer font-bold">{t("seedLabel")}</summary>
          <input
            inputMode="numeric"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/\D/g, "").slice(0, 9))}
            className="mt-1 w-full rounded-lg border-2 border-ink bg-paper px-2 py-1 text-ink"
            aria-label={t("seedLabel")}
            data-testid="seed"
          />
        </details>
      </div>
      <div className="ikat" />
      {showTales && (
        <I18n.Provider value={makeT(meta.lang, meta.region)}>
          <Modal label={t("end.collection")} onClose={() => setShowTales(false)}>
            <Collection meta={meta} />
          </Modal>
        </I18n.Provider>
      )}
    </main>
  );
}
