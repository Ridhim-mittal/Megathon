import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { I18nProvider } from "../i18n/index.jsx";
import { MapCanvas } from "../ui/map/MapCanvas.jsx";
import { createLife, glossary, goals, select, step, storyline } from "../ui/gameAdapter.js";
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
import { DevMenu } from "../ui/dev/DevMenu.jsx";

// ?seed=demo gives a fixed, rehearsed life (spec section 9).
const urlSeed = () => {
  try {
    return new URLSearchParams(window.location.search).get("seed");
  } catch {
    return null;
  }
};

const BACKDROP_SPAWN = { x: 15, y: 14, dir: "down" };
const ROUTES = ["title", "language", "storyline", "intro", "dream", "life", "ending", "report", "parallel", "gallery"];

export function App() {
  const [settings, setSettings] = useState(loadSettings);
  const saved = useMemo(loadLife, []);
  const [route, setRoute] = useState("title");
  const [setup, setSetup] = useState({ storylineId: "village", goalId: null, playerName: "", avatar: "boy" });
  const [picking, setPicking] = useState(false);
  const [life, setLife] = useState(null);
  const [parallel, setParallel] = useState(null);
  const [visit, setVisit] = useState(false); // a jump straight to the town: not saved over your real life
  const [endings, setEndings] = useState(loadEndings);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState(null);
  const [devKey, setDevKey] = useState(0); // the dev menu swapped the life: start the screen fresh

  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
    document.documentElement.lang = settings.lang;
  }, [settings]);

  useEffect(() => {
    if (life && !visit) saveLife({ route: ["life", "ending", "report", "parallel"].includes(route) ? route : "life", life });
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
      if (out?.lesson?.to === "applied" && out.lesson.from !== "applied") setTimeout(sounds.levelUp, 300);
    } else if (action.type === "BUY_WANT") sounds.spend();
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

  function startLife({ goalId, playerName = setup.playerName, avatar = setup.avatar }) {
    const seed = urlSeed() ?? `${Date.now()}`;
    let s = createLife({ storylineId: setup.storylineId, goalId, seed, playerName: playerName || "", mode: "story", avatar: avatar ?? "boy" });
    s = step(s, { type: "ADVANCE" });
    setVisit(false);
    setSetup((x) => ({ ...x, goalId, playerName }));
    setLife(s);
    setParallel(null);
    go("life");
  }

  // From the title: jump straight to the First Job chapter in the town (a visit; your saved life stays).
  function visitTown() {
    const hero = life ?? saved?.life;
    let s = createLife({ storylineId: "village", goalId: hero?.goalId ?? "house", seed: urlSeed() ?? `${Date.now()}`, playerName: hero?.playerName || setup.playerName || "", mode: "story", avatar: hero?.avatar ?? setup.avatar ?? "boy" });
    for (let n = 0; n < 3000 && !(s.phase === "budget" && select.story(s)?.mission.id === "job"); n++) {
      let a = { type: "ADVANCE" };
      if (s.phase === "map") a = { type: "VISIT", location: select.story(s).objective.location };
      else if (s.phase === "card") {
        const open = select.currentCard(s).choices.filter((c) => !c.locked);
        const c = open.find((x) => x.default) ?? open[0];
        a = { type: "CHOOSE", choiceId: c.id, ignoredWarning: true };
      }
      const next = step(s, a);
      if (next.error) break;
      s = next;
    }
    setVisit(true);
    setLife(s);
    setParallel(null);
    go("life");
  }

  function continueLife() {
    // Read the save fresh: a town visit is never saved, so this is always the real life.
    const real = loadLife() ?? saved;
    if (!real) return life ? go("life") : go("language");
    setVisit(false);
    setLife(real.life);
    setSetup({ storylineId: real.life.storylineId, goalId: real.life.goalId, playerName: real.life.playerName, avatar: real.life.avatar ?? "boy" });
    go(real.route ?? "life");
  }

  // The title screen's "Who are you?" card hands over the look and name; then language and story.
  function newLife({ avatar, playerName }) {
    saveLife(null);
    setLife(null);
    setParallel(null);
    setSetup((x) => ({ ...x, goalId: null, playerName, avatar }));
    setPicking(false);
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

  // The dev menu (src/ui/dev): jumps hand over a whole new life; cheats edit the current one.
  const devApi = {
    life,
    route,
    routes: ROUTES,
    go,
    setLang: i18n.setLang,
    setLife: (next, show = false) => {
      lifeRef.current = next;
      setVisit(false);
      setLife(next);
      if (!show) return;
      setParallel(null);
      setDevKey((k) => k + 1);
      setRoute("life");
    },
    makeLife: () => {
      const hero = life ?? saved?.life;
      const s = createLife({
        storylineId: hero?.storylineId ?? "village",
        goalId: hero?.goalId ?? setup.goalId ?? goals()[0]?.id ?? "house",
        seed: urlSeed() ?? `${Date.now()}`,
        playerName: hero?.playerName || setup.playerName || "",
        mode: "story",
        avatar: hero?.avatar ?? setup.avatar ?? "boy",
      });
      return step(s, { type: "ADVANCE" });
    },
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
            onPlay={() => (saved || life ? (life && !visit ? go("life") : continueLife()) : go("language"))}
            onNew={newLife}
            onTown={visitTown}
            onHelp={() => setHelp(true)}
            settings={settingsApi}
            picking={picking}
            onPicking={setPicking}
            hero={{
              avatar: (life ?? saved?.life)?.avatar ?? "boy",
              stage: (life ?? saved?.life)?.stage ?? "child",
              name: (life ?? saved?.life)?.playerName,
              pickAvatar: setup.avatar,
              pickName: setup.playerName,
            }}
          />
        )}
        {route === "language" && <LanguageScreen {...common} onPick={(lang) => (i18n.setLang(lang), go("storyline"))} />}
        {route === "storyline" && (
          <StorylineScreen {...common} avatar={setup.avatar} onBack={() => go("language")} onPick={(id) => (setSetup((x) => ({ ...x, storylineId: id })), go("intro"))} />
        )}
        {route === "intro" && <IntroScreen {...common} storylineId={setup.storylineId} avatar={setup.avatar} onDone={() => go("dream")} />}
        {route === "dream" && <DreamScreen {...common} avatar={setup.avatar} playerName={setup.playerName} onBack={() => go("intro")} onStart={startLife} />}
        {route === "life" && life && life.mode === "story" && <StoryScreen key={devKey} {...common} life={life} dispatch={dispatch} toast={toast} onToast={setToast} />}
        {route === "life" && life && life.mode !== "story" && <MapScreen key={devKey} {...common} life={life} dispatch={dispatch} toast={toast} onToast={setToast} />}
        {route === "ending" && life && <EndingScreen {...common} life={life} onNext={() => go("report")} />}
        {route === "report" && life && <ReportScreen {...common} life={life} onNext={() => go("parallel")} />}
        {route === "parallel" && life && (
          <ParallelScreen {...common} life={life} parallel={parallel} onParallel={setParallel} onGallery={() => go("gallery")} />
        )}
        {route === "gallery" && <GalleryScreen {...common} endings={endings} onPlayAgain={() => (setPicking(true), go("title"))} />}
        {help && <HelpDialog onClose={() => setHelp(false)} />}
        <DevMenu api={devApi} />
      </div>
    </I18nProvider>
  );
}
