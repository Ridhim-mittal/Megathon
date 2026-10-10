import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { I18nProvider } from "../i18n/index.jsx";
import { MapCanvas } from "../ui/map/MapCanvas.jsx";
import { createLife, glossary, select, step, storyline } from "../ui/gameAdapter.js";
import { loadEndings, loadLife, loadSettings, recordEnding, saveLife, saveSettings } from "../ui/persist.js";
import { setSoundEnabled, sounds } from "../ui/sound.js";
import { HelpDialog } from "./HelpDialog.jsx";
import { TitleScreen } from "./TitleScreen.jsx";
import { LanguageScreen } from "./LanguageScreen.jsx";
import { StorylineScreen } from "./StorylineScreen.jsx";
import { IntroScreen } from "./IntroScreen.jsx";
import { DreamScreen } from "./DreamScreen.jsx";
import { MapScreen } from "./MapScreen.jsx";
import { StoryScreen } from "./StoryScreen.jsx";
import { EndingScreen } from "./EndingScreen.jsx";
import { ReportScreen } from "./ReportScreen.jsx";
import { ParallelScreen } from "./ParallelScreen.jsx";
import { GalleryScreen } from "./GalleryScreen.jsx";

// ?seed=demo gives a fixed, rehearsed life (spec section 9).
const urlSeed = () => {
  try {
    return new URLSearchParams(window.location.search).get("seed");
  } catch {
    return null;
  }
};

const BACKDROP_SPAWN = { x: 15, y: 14, dir: "down" };

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const saved = useMemo(loadLife, []);
  const [route, setRoute] = useState("title");
  const [setup, setSetup] = useState({ storylineId: "village", goalId: null, playerName: "" });
  const [life, setLife] = useState(null);
  const [parallel, setParallel] = useState(null);
  const [endings, setEndings] = useState(loadEndings);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
    document.documentElement.lang = settings.lang;
  }, [settings]);

  useEffect(() => {
    if (life) saveLife({ route: ["life", "ending", "report", "parallel"].includes(route) ? route : "life", life });
  }, [life, route]);

  const go = useCallback((r) => {
    sounds.page();
    setRoute(r);
  }, []);

  // Every engine action goes through here.
  const lifeRef = useRef(life);
  lifeRef.current = life;
  const dispatch = useCallback((action) => {
    const current = lifeRef.current;
    if (!current) return null;
    const next = step(current, action);
    if (next.error) {
      setToast(next.error.message);
      return next.error;
    }
    setToast(null);
    if (action.type === "CHOOSE") {
      const out = select.lastOutcome(next);
      if (out?.money.movements.some((m) => m.type === "shock")) sounds.thud();
      else if (out?.money.netWorthChange > 0) sounds.coin();
      else if (out?.money.netWorthChange < 0) sounds.spend();
      if (out?.lesson?.to === "applied" && out.lesson.from !== "applied") setTimeout(sounds.chime, 250);
    } else if (action.type === "BUY_WANT") sounds.coin();
    else sounds.tap();
    lifeRef.current = next;
    setLife(next);
    return null;
  }, []);

  useEffect(() => {
    if (life?.phase === "ending" && route === "life") {
      setEndings(recordEnding({ id: life.ending.id, goalId: life.goalId, storylineId: life.storylineId }));
      setRoute("ending");
    }
  }, [life, route]);

  function startLife({ goalId, playerName, avatar }) {
    const seed = urlSeed() ?? `${Date.now()}`;
    let s = createLife({ storylineId: setup.storylineId, goalId, seed, playerName: playerName || "", mode: "story", avatar: avatar ?? "boy" });
    s = step(s, { type: "ADVANCE" });
    setSetup((x) => ({ ...x, goalId, playerName }));
    setLife(s);
    setParallel(null);
    go("life");
  }

  function continueLife() {
    if (!saved) return;
    setLife(saved.life);
    setSetup({ storylineId: saved.life.storylineId, goalId: saved.life.goalId, playerName: saved.life.playerName });
    go(saved.route ?? "life");
  }

  function newLife() {
    saveLife(null);
    setLife(null);
    setParallel(null);
    go("language");
  }

  const storylineId = life?.storylineId ?? setup.storylineId;
  const sl = storyline(storylineId);
  const i18n = useMemo(
    () => ({
      lang: settings.lang,
      setLang: (lang) => setSettings((s) => ({ ...s, lang })),
      playerName: life?.playerName || setup.playerName,
      cast: sl?.cast ?? {},
      glossary: glossary(),
      onGlossary: (termId) => {
        if (route === "life") dispatch({ type: "USED_GLOSSARY", termId });
      },
    }),
    [settings.lang, life?.playerName, setup.playerName, sl, route, dispatch],
  );
  const settingsApi = {
    ...settings,
    setLang: i18n.setLang,
    setSound: (sound) => setSettings((s) => ({ ...s, sound })),
  };

  const hud = life ? select.hud(life) : null;
  const worldMode = route === "title" ? "title" : route === "life" ? "life" : "scene";
  const common = { settings: settingsApi, onHelp: () => setHelp(true), onMenu: () => go("title") };

  return (
    <I18nProvider value={i18n}>
      <div className={`game-shell route-${route} lang-${settings.lang}`}>
        {route !== "life" && (
          <div className={`backdrop backdrop-${worldMode}`} aria-hidden="true">
            <MapCanvas active={false} avatar={life?.avatar ?? "boy"} stage={life?.stage ?? "child"} spawn={BACKDROP_SPAWN} labels={{}} markers={{}} />
          </div>
        )}
        {route === "title" && (
          <TitleScreen
            canContinue={Boolean(saved || life)}
            onPlay={() => (saved || life ? (life ? go("life") : continueLife()) : go("language"))}
            onNew={newLife}
            onHelp={() => setHelp(true)}
            settings={settingsApi}
          />
        )}
        {route === "language" && <LanguageScreen {...common} onPick={(lang) => (i18n.setLang(lang), go("storyline"))} />}
        {route === "storyline" && (
          <StorylineScreen {...common} onBack={() => go("language")} onPick={(id) => (setSetup((x) => ({ ...x, storylineId: id })), go("intro"))} />
        )}
        {route === "intro" && <IntroScreen {...common} storylineId={setup.storylineId} onDone={() => go("dream")} />}
        {route === "dream" && <DreamScreen {...common} initialName={setup.playerName} onBack={() => go("intro")} onStart={startLife} />}
        {route === "life" && life && life.mode === "story" && <StoryScreen {...common} life={life} dispatch={dispatch} toast={toast} onToast={setToast} />}
        {route === "life" && life && life.mode !== "story" && <MapScreen {...common} life={life} dispatch={dispatch} toast={toast} onToast={setToast} />}
        {route === "ending" && life && <EndingScreen {...common} life={life} onNext={() => go("report")} />}
        {route === "report" && life && <ReportScreen {...common} life={life} onNext={() => go("parallel")} />}
        {route === "parallel" && life && (
          <ParallelScreen {...common} life={life} parallel={parallel} onParallel={setParallel} onGallery={() => go("gallery")} />
        )}
        {route === "gallery" && <GalleryScreen {...common} endings={endings} onPlayAgain={newLife} />}
        {help && <HelpDialog onClose={() => setHelp(false)} />}
      </div>
    </I18nProvider>
  );
}
