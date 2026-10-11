import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Rat, TriangleAlert, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { content, goals, select } from "../ui/gameAdapter.js";
import { AskAmmamma } from "../ui/AskAmmamma.jsx";
import { GyaanLite } from "../ui/GyaanLite.jsx";
import { MapCanvas } from "../ui/map/MapCanvas.jsx";
import { mapForMission } from "../ui/map/maps.js";
import { PhoneLite as Phone } from "../ui/PhoneLite.jsx";
import { StockExchange } from "../ui/exchange/StockExchange.jsx";
import { ArcadeGame, ArcadeMenu, GAME_ICON } from "../ui/arcade/Arcade.jsx";
import { gameAtPlace } from "../ui/arcade/games.js";
import { loadDiscovered, recordDiscovered, seenOnce } from "../ui/persist.js";
import { PhoneTour } from "../ui/PhoneTour.jsx";
import { BreakingNews } from "./story/BreakingNews.jsx";
import { PauseCard } from "../ui/PauseCard.jsx";
import { sounds } from "../ui/sound.js";
import { GAME_COMPONENTS, PRE_GAMES, SCENE_GAMES } from "../ui/games/choiceGames.js";
import { PreGameCard } from "./story/PreGame.jsx";
import { RatGuard } from "../ui/games/RatGuard.jsx";
import { SaveFirst } from "./life/SaveFirst.jsx";
import { JarDock, SurprisePop } from "../ui/MoneyMoments.jsx";
import { ShopView } from "./life/ShopView.jsx";
import { CardView } from "./life/CardView.jsx";
import { OutcomeView } from "./life/OutcomeView.jsx";
import { MapHud } from "./map/MapHud.jsx";
import { Flowchart } from "./story/Flowchart.jsx";
import { MissionEnd } from "./story/MissionEnd.jsx";
import { EvidenceFile, MissionIntro, ObjectiveTracker, TimerBar, WarningFlash } from "./story/StoryParts.jsx";

// Story mode: one mission per chapter. The objective says where to go and a trail leads there;
// each place plays the next scene; some scenes race the clock; very bad choices flash a STOP.
export function StoryScreen({ life, dispatch, settings, onHelp, onMenu, toast, onToast }) {
  const { t, pick } = useT();
  const hud = select.hud(life);
  const chapter = select.chapter(life);
  const story = select.story(life);
  const phone = select.phone(life);
  const goal = goals().find((g) => g.id === life.goalId);
  const avatar = life.avatar ?? "boy";
  const phase = life.phase;
  const objective = story?.objective ?? null;

  const [overlay, setOverlay] = useState(null); // { type: info|shop|phone|gyaan|ask|flow|evidence, ... }
  const [introDone, setIntroDone] = useState(null);
  const [goTo, setGoTo] = useState(null);
  const [warning, setWarning] = useState(null);
  const [discovered, setDiscovered] = useState(loadDiscovered);
  const map = mapForMission(story?.mission.id);
  const [spawn, setSpawn] = useState(() => ({ ...map.START, dir: "down", key: story?.mission.id }));

  // Every scene and choice this life touches is remembered for the flowcharts.
  useEffect(() => setDiscovered(recordDiscovered(life)), [life.story?.visited.length, life.story?.path.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new chapter starts in front of home.
  useEffect(() => {
    setSpawn({ ...map.START, dir: "down", key: story?.mission.id });
  }, [story?.mission.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => onToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast, onToast]);

  const placeName = useCallback((id) => (story?.mission.placeNames?.[id] ? pick(story.mission.placeNames[id]) : t(`places.${id}`)), [story, pick, t]);
  // In the prologue, home is where Rat Guard can be played again.
  const ratsAtHome = story?.mission.id === "prologue";
  const labels = useMemo(
    () => Object.fromEntries(Object.keys(map.placeById).map((id) => [id, gameAtPlace(id) || (ratsAtHome && id === "home") ? `${placeName(id)} 🎮` : placeName(id)])),
    [placeName, map, ratsAtHome],
  );

  const showIntro = phase === "budget" && story && introDone !== story.mission.id;
  const engineDialog = ["budget", "card", "outcome", "minigame", "chapterEnd"].includes(phase);
  const [phoneTour, setPhoneTour] = useState(false);
  // T (or the pause button) freezes the map, the rush clock and any scene countdown.
  const [paused, setPaused] = useState(false);
  const busy = Boolean(engineDialog || overlay || showIntro || warning || phoneTour || paused);
  // The first time the phone is in hand on the map, show what it can do (once per life).
  useEffect(() => {
    if (phone.unlocked && phase === "map" && !busy && seenOnce(`phoneTour:${life.seed}`)) setPhoneTour(true);
  }, [phone.unlocked, phase, busy, life.seed]);
  const markers = useMemo(() => (phase === "map" && objective && objective.location !== "phone" ? { [objective.location]: objective.rush ? "special" : "required" } : {}), [phase, objective]);

  // ---------- the race against time (rush scenes) ----------
  const [rushLeft, setRushLeft] = useState(null);
  const rushKey = phase === "map" && objective?.rush ? objective.node : null;
  const rushRef = useRef({ key: null, left: 0 });
  useEffect(() => {
    if (!rushKey) {
      setRushLeft(null);
      return undefined;
    }
    if (rushRef.current.key !== rushKey) rushRef.current = { key: rushKey, left: objective.rush.seconds };
    setRushLeft(rushRef.current.left);
    if (overlay || paused) return undefined;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      rushRef.current.left = Math.max(0, rushRef.current.left - (now - last) / 1000);
      last = now;
      setRushLeft(rushRef.current.left);
      if (rushRef.current.left <= 0) {
        clearInterval(id);
        sounds.thud();
        dispatch({ type: "STORY_TIMEOUT" });
      }
    }, 200);
    return () => clearInterval(id);
  }, [rushKey, overlay, paused, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // The one pop-up the story keeps: Black Monday's breaking news (once per life).
  const [news, setNews] = useState(false);
  useEffect(() => {
    if (phase === "map" && objective?.node === "m2_crash" && !busy && seenOnce(`crashNews:${life.seed}`)) setNews(true);
  }, [phase, objective?.node, busy, life.seed]);

  // After a timeout, say what being late cost.
  const lastLate = story?.lastLate;
  useEffect(() => {
    if (lastLate) onToast(lastLate.note ? pick(lastLate.note) : t("story.tooLate"));
  }, [lastLate?.node]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- choices: locks and STOP warnings ----------
  const card = select.currentCard(life);
  // The lesson of the scene being played, or of the scene the objective leads to.
  const lessonId =
    phase === "card" || phase === "outcome"
      ? card?.lesson ?? null
      : phase === "map" && objective?.node
        ? (content.story?.missions ?? []).flatMap((m) => m.nodes ?? []).find((n) => n.id === objective.node)?.lesson ?? null
        : null;
  const [game, setGame] = useState(null); // the scene's mini-game, while it is being played
  const [played, setPlayed] = useState(() => new Set()); // scenes whose mini-game is done
  const markPlayed = (cardId) => {
    setGame(null);
    setPlayed((s) => new Set(s).add(cardId));
  };
  const gameOpen = useRef(false);
  gameOpen.current = Boolean(game);
  const storyDispatch = useCallback(
    (action) => {
      // While a mini-game is open its own keys (1–3) must not pick a card choice.
      if (action.type === "CHOOSE" && gameOpen.current && !action.wonGame) return null;
      if (action.type === "CHOOSE" && !action.ignoredWarning) {
        const c = select.currentCard(life)?.choices.find((x) => x.id === action.choiceId);
        if (c?.locked) {
          onToast(c.lockedHint ? pick(c.lockedHint) : t("story.locked"));
          return null;
        }
        if (c?.warn) {
          setWarning(c);
          return null;
        }
      }
      return dispatch(action);
    },
    [life, dispatch, onToast, pick, t],
  );

  const enter = useCallback(
    (placeId) => {
      if (busy) return;
      if (objective && objective.location === placeId) {
        const err = dispatch({ type: "VISIT", location: placeId });
        if (!err) return;
      }
      setOverlay({ type: placeId === "shop" ? "shop" : "info", place: placeId });
    },
    [busy, objective, dispatch],
  );

  function goObjective() {
    if (!objective) return;
    if (objective.location === "phone") setOverlay({ type: "phone", app: "messages" });
    else setGoTo({ place: objective.location, key: Date.now() });
  }

  // T pauses and resumes; Esc also resumes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input,textarea,select")) return;
      if (e.key === "t" || e.key === "T") setPaused((p) => !p);
      else if (e.key === "Escape" && paused) setPaused(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused]);

  // P opens the phone.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "p" || e.key === "P") && !busy && phone.unlocked && !e.target.closest?.("input,textarea,select"))
        setOverlay({ type: "phone", app: objective?.location === "phone" ? "messages" : null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, phone.unlocked, objective?.location]);

  const flowFor = (missionId) => select.flowchart(life, missionId, discovered);
  const previous = story && story.mission.index > 0 ? story.missions[story.mission.index - 1]?.outcome : null;

  let dialog = null;
  let windowType = phase;
  if (showIntro) {
    // MissionIntro brings its own full-screen layer.
  } else if (phase === "budget") {
    dialog = <SaveFirst key={`budget-${life.age}`} life={life} dispatch={dispatch} avatar={avatar} />;
  } else if (phase === "card" && PRE_GAMES[card?.id] && !played.has(card.id)) {
    // This scene starts with its mini-game; the question and choices come after it.
    windowType = "pregame";
    dialog = (
      <PreGameCard
        kind={PRE_GAMES[card.id]}
        lessonId={card.lesson}
        sceneTitle={card.title ? pick(card.title) : null}
        onStart={() => setGame({ kind: PRE_GAMES[card.id], cardId: card.id })}
        onSkip={() => markPlayed(card.id)}
      />
    );
  } else if (phase === "card" && SCENE_GAMES[card?.id]) {
    // This scene is played, not read: the game brings its own full-screen layer (below).
  } else if (phase === "card") {
    dialog = (
      <>
        {card?.timer && (
          <TimerBar
            key={`timer-${card.id}`}
            seconds={card.timer.seconds}
            paused={Boolean(warning || game || paused)}
            label={t("story.decideFast")}
            onTimeout={() => {
              setWarning(null);
              sounds.thud();
              dispatch({ type: "CHOOSE", choiceId: card.timer.choice });
            }}
          />
        )}
        <CardView key={card?.id} life={life} dispatch={storyDispatch} />
      </>
    );
  } else if (phase === "outcome") {
    dialog = <OutcomeView key={`o-${card?.id}`} life={life} dispatch={dispatch} onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })} />;
  } else if (phase === "chapterEnd") {
    dialog = (
      <MissionEnd
        summary={chapter?.summary}
        chart={flowFor(chapter?.summary?.story?.mission)}
        placeName={placeName}
        last={story.mission.index === story.mission.total - 1}
        onNext={() => dispatch({ type: "ADVANCE" })}
      />
    );
  } else if (overlay?.type === "exchange") {
    windowType = "exchange";
    dialog = <StockExchange onClose={() => setOverlay({ type: "phone" })} onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })} />;
  } else if (overlay?.type === "arcade") {
    windowType = "arcade";
    dialog = overlay.game ? (
      <ArcadeGame
        key={overlay.game}
        gameId={overlay.game}
        onClose={() => setOverlay(null)}
        onBack={overlay.fromPhone ? () => setOverlay({ type: "arcade", fromPhone: true }) : undefined}
      />
    ) : (
      <ArcadeMenu onPick={(game) => setOverlay({ type: "arcade", game, fromPhone: true })} onClose={() => setOverlay(null)} avatar={life.avatar ?? "boy"} />
    );
  } else if (overlay?.type === "shop") {
    windowType = "shop";
    dialog = <ShopView life={life} dispatch={dispatch} onDone={() => setOverlay(null)} />;
  } else if (overlay?.type === "info") {
    windowType = "info";
    dialog = (
      <div className="view place-info">
        <span className="eyebrow">{placeName(overlay.place)}</span>
        <h2>{placeName(overlay.place)}</h2>
        <p>{t(`placeInfo.${overlay.place}`)}</p>
        {gameAtPlace(overlay.place) && <GameInvite gameId={gameAtPlace(overlay.place).id} onPlay={(game) => setOverlay({ type: "arcade", game })} />}
        {ratsAtHome && overlay.place === "home" && (
          <button className="game-invite game-ratGuard" onClick={() => setOverlay({ type: "ratguard" })}>
            <span className="arcade-icon" aria-hidden="true">
              <Rat size={30} />
            </span>
            <span>
              <small>{t("arcade.invite")}</small>
              <b>{t("ratguard.title")}</b>
              <em>{t("ratguard.tag")}</em>
            </span>
            <strong>
              {t("arcade.here")} <ArrowRight size={16} />
            </strong>
          </button>
        )}
        {objective && <p className="quiet">{t("story.notHere", { place: placeName(objective.location) })}</p>}
        <div className="action-row">
          <button className="text-button" onClick={() => setOverlay(null)}>
            {t("map.close")}
          </button>
          {objective && (
            <button
              className="primary-button big"
              onClick={() => {
                setOverlay(null);
                goObjective();
              }}
            >
              {objective.location === "phone" ? t("story.openPhone") : t("story.walkTo", { place: placeName(objective.location) })} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  } else if (overlay?.type === "flow") {
    windowType = "flow";
    dialog = (
      <div className="view flow-view">
        <div className="flow-view-head">
          <span className="eyebrow">{pick(story.mission.part)}</span>
          <h2>{pick(story.mission.title)}</h2>
          <button className="panel-close" onClick={() => setOverlay(null)} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>
        <Flowchart chart={flowFor(story.mission.id)} placeName={placeName} />
      </div>
    );
  } else if (overlay?.type === "evidence") {
    windowType = "info";
    dialog = <EvidenceFile story={story} onClose={() => setOverlay(null)} />;
  }

  return (
    <div className={`mapgame storygame phase-${phase} ${busy ? "is-busy" : ""} ${objective?.rush && phase === "map" ? "rushing" : ""}`}>
      <MapCanvas
        map={map}
        avatar={avatar}
        stage={hud.stage}
        markers={markers}
        labels={labels}
        active={!busy && !news}
        spawn={spawn}
        goTo={goTo}
        guide={phase === "map" && objective && objective.location !== "phone" ? { place: objective.location, urgent: Boolean(objective.rush) } : null}
        onEnter={enter}
        onGranny={() => setOverlay({ type: "ask" })}
        ariaLabel={t("map.label")}
      />
      <MapHud
        hud={hud}
        chapter={chapter}
        goalTitle={pick(goal?.title)}
        settings={settings}
        phone={phone}
        onPhone={() => setOverlay({ type: "phone", app: objective?.location === "phone" ? "messages" : null })}
        onAsk={() => setOverlay({ type: "ask" })}
        onHelp={onHelp}
        onMenu={onMenu}
        onPause={() => setPaused(true)}
        lessonId={showIntro ? null : lessonId}
      />
      {paused && <PauseCard settings={settings} onResume={() => setPaused(false)} onMenu={onMenu} onHelp={onHelp} />}
      {phase === "map" && !overlay && story && (
        <ObjectiveTracker
          story={story}
          placeName={placeName}
          rushLeft={rushLeft}
          onGo={goObjective}
        />
      )}
      {phase === "map" && !overlay && story?.danger && (
        <p className={`danger-banner danger-${story.danger}`} role="alert">
          <TriangleAlert size={16} aria-hidden="true" /> {t(`story.danger.${story.danger}`)}
        </p>
      )}
      {news && (
        <BreakingNews
          onClose={() => setNews(false)}
          onOpen={() => {
            setNews(false);
            setOverlay({ type: "phone", app: "messages" });
          }}
        />
      )}
      {phase === "map" && !overlay && !showIntro && <JarDock hud={hud} />}
      <SurprisePop surprises={hud.surprises ?? []} active={phase === "map" && !overlay && !showIntro} />
      {showIntro && <MissionIntro story={story} avatar={avatar} stage={hud.stage} previous={previous} onBegin={() => setIntroDone(story.mission.id)} />}
      {dialog && (
        <div className="dialog-layer">
          <section className={`game-window window-${windowType}`} key={`${phase}-${card?.id ?? ""}-${overlay?.type ?? ""}`}>
            {dialog}
          </section>
        </div>
      )}
      {phase === "card" && !showIntro && SCENE_GAMES[card?.id] &&
        React.createElement(SCENE_GAMES[card.id], {
          key: card.id,
          avatar: life.avatar ?? "boy",
          onDone: (choiceId) => {
            if (!dispatch({ type: "CHOOSE", choiceId })) dispatch({ type: "ADVANCE" });
          },
        })}
      {overlay?.type === "ratguard" && <RatGuard mode="practice" onClose={() => setOverlay(null)} />}
      {game && GAME_COMPONENTS[game.kind] &&
        React.createElement(GAME_COMPONENTS[game.kind], {
          // Played before the question, win or lose: every ending leads on to the choices.
          mode: "practice",
          avatar: life.avatar ?? "boy",
          onClose: () => markPlayed(game.cardId),
          onGiveUp: () => markPlayed(game.cardId),
          onWin: () => markPlayed(game.cardId),
        })}
      {warning && (
        <WarningFlash
          choice={warning}
          onHeed={() => {
            dispatch({ type: "HEED_WARNING", choiceId: warning.id });
            setWarning(null);
            onToast(t("story.heeded"));
          }}
          onIgnore={() => {
            const c = warning;
            setWarning(null);
            dispatch({ type: "CHOOSE", choiceId: c.id, ignoredWarning: true });
          }}
        />
      )}
      {overlay?.type === "phone" && (
        <Phone
          life={life}
          dispatch={dispatch}
          initialApp={overlay.app}
          onClose={() => setOverlay(null)}
          onNotification={() => {
            setOverlay(null);
            dispatch({ type: "VISIT", location: "phone" });
          }}
          onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })}
          onExchange={() => setOverlay({ type: "exchange" })}
          onArcade={() => setOverlay({ type: "arcade", fromPhone: true })}
        />
      )}
      {phoneTour && (
        <PhoneTour
          onClose={() => setPhoneTour(false)}
          onOpen={() => {
            setPhoneTour(false);
            setOverlay({ type: "phone" });
          }}
        />
      )}
      {overlay?.type === "gyaan" && <GyaanLite life={life} lessonId={overlay.lesson} onClose={() => setOverlay(null)} />}
      {overlay?.type === "ask" && (
        <AskAmmamma state={life} lesson={card?.lesson} onClose={() => setOverlay(null)} onAsked={() => dispatch({ type: "ASKED_MENTOR" })} />
      )}
      {toast && (
        <p className="toast" role="alert">
          {toast}
        </p>
      )}
    </div>
  );
}

// A place's mini-game, offered when you walk in.
function GameInvite({ gameId, onPlay }) {
  const { t } = useT();
  const Icon = GAME_ICON[gameId];
  return (
    <button className={`game-invite game-${gameId}`} onClick={() => onPlay(gameId)}>
      <span className="arcade-icon" aria-hidden="true">
        <Icon size={30} />
      </span>
      <span>
        <small>{t("arcade.invite")}</small>
        <b>{t(`arcade.games.${gameId}.name`)}</b>
        <em>{t(`arcade.games.${gameId}.tag`)}</em>
      </span>
      <strong>
        {t("arcade.here")} <ArrowRight size={16} />
      </strong>
    </button>
  );
}
