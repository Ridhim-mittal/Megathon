import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n/index.jsx";
import { goals, select } from "../ui/gameAdapter.js";
import { AskAmmamma } from "../ui/AskAmmamma.jsx";
import { GyaanLite } from "../ui/GyaanLite.jsx";
import { MapCanvas } from "../ui/map/MapCanvas.jsx";
import { START, placeById } from "../ui/map/village.js";
import { PhoneLite as Phone } from "../ui/PhoneLite.jsx";
import { NotificationTray } from "../ui/Notifications.jsx";
import { StockExchange } from "../ui/exchange/StockExchange.jsx";
import { BudgetView } from "./life/BudgetView.jsx";
import { ShopView } from "./life/ShopView.jsx";
import { CardView } from "./life/CardView.jsx";
import { OutcomeView } from "./life/OutcomeView.jsx";
import { MinigameView } from "./life/MinigameView.jsx";
import { MapHud } from "./map/MapHud.jsx";
import { QuestLog } from "./map/QuestLog.jsx";
import { ChapterEnd, ChapterIntro, PlaceInfo } from "./map/ChapterViews.jsx";

// The game: walk the village, step into places to live this chapter's events.
export function MapScreen({ life, dispatch, settings, onHelp, onMenu, toast, onToast }) {
  const { t, pick, castName } = useT();
  const hud = select.hud(life);
  const chapter = select.chapter(life);
  const locs = select.locations(life);
  const phone = select.phone(life);
  const goal = goals().find((g) => g.id === life.goalId);
  const avatar = life.avatar ?? "boy";

  const [overlay, setOverlay] = useState(null); // { type: info|shop|phone|gyaan|ask, place?, lesson? }
  const [introDone, setIntroDone] = useState(null);
  const [goTo, setGoTo] = useState(null);
  const finishing = useRef(false); // walking home to finish the chapter
  const [spawn, setSpawn] = useState(() => ({ ...START, dir: "down", key: life.chapter?.id }));

  // A new chapter starts in front of home.
  useEffect(() => {
    setSpawn({ ...START, dir: "down", key: chapter?.id });
  }, [chapter?.id]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => onToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast, onToast]);

  const phase = life.phase;
  const showIntro = phase === "budget" && chapter && introDone !== chapter.id;
  const engineDialog = ["budget", "card", "outcome", "minigame", "chapterEnd"].includes(phase);
  const busy = Boolean(engineDialog || overlay || showIntro);

  const markers = useMemo(() => {
    const m = {};
    for (const l of locs) {
      if (!l.pending) continue;
      m[l.id] = l.required ? "required" : l.special ? "special" : "optional";
    }
    if (chapter?.canEnd && !m.home) m.home = "home";
    return m;
  }, [locs, chapter?.canEnd]);
  const labels = useMemo(() => Object.fromEntries(Object.keys(placeById).map((id) => [id, t(`places.${id}`)])), [t]);

  const enter = useCallback(
    (placeId) => {
      if (busy) return;
      const loc = locs.find((l) => l.id === placeId);
      const finish = finishing.current && placeId === "home";
      finishing.current = false;
      if (loc?.pending && !finish) {
        const err = dispatch({ type: "VISIT", location: placeId });
        if (!err) return;
      }
      setOverlay({ type: placeId === "shop" ? "shop" : "info", place: placeId });
    },
    [busy, locs, dispatch],
  );

  // P opens the phone.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "p" || e.key === "P") && !busy && phone.unlocked && !e.target.closest?.("input,textarea,select")) setOverlay({ type: "phone" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, phone.unlocked]);

  // Quest log: walk to a place and go in (the phone just opens).
  function go(place, { finish = false } = {}) {
    finishing.current = finish;
    if (place === "phone") setOverlay({ type: "phone", app: "messages" });
    else setGoTo({ place, key: Date.now() });
  }

  const card = select.currentCard(life);
  let dialog = null;
  if (showIntro) {
    // ChapterIntro brings its own full-screen layer.
  } else if (phase === "budget") {
    dialog = <BudgetView key={`budget-${life.age}`} life={life} dispatch={dispatch} repeats />;
  } else if (phase === "card") dialog = <CardView key={card?.id} life={life} dispatch={dispatch} />;
  else if (phase === "outcome")
    dialog = <OutcomeView key={`o-${card?.id}`} life={life} dispatch={dispatch} onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })} />;
  else if (phase === "minigame") dialog = <MinigameView life={life} dispatch={dispatch} />;
  else if (phase === "chapterEnd")
    dialog = <ChapterEnd chapter={chapter} castName={castName} last={chapter?.id === "settle"} onNext={() => dispatch({ type: "ADVANCE" })} />;
  else if (overlay?.type === "exchange")
    dialog = <StockExchange onClose={() => setOverlay({ type: "phone" })} onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })} />;
  else if (overlay?.type === "shop") dialog = <ShopView life={life} dispatch={dispatch} onDone={() => setOverlay(null)} />;
  else if (overlay?.type === "info")
    dialog = (
      <PlaceInfo
        placeId={overlay.place}
        waiting={locs.filter((l) => l.required).map((l) => l.id)}
        requiredLeft={chapter?.requiredLeft ?? 0}
        canFinish={Boolean(chapter?.canEnd)}
        onClose={() => setOverlay(null)}
        onShop={() => setOverlay({ type: "shop", place: "shop" })}
        onFinish={() => {
          setOverlay(null);
          dispatch({ type: "END_CHAPTER" });
        }}
      />
    );

  return (
    <div className={`mapgame phase-${phase} ${busy ? "is-busy" : ""}`}>
      <MapCanvas
        avatar={avatar}
        stage={hud.stage}
        markers={markers}
        labels={labels}
        active={!busy}
        spawn={spawn}
        goTo={goTo}
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
        onPhone={() => setOverlay({ type: "phone" })}
        onAsk={() => setOverlay({ type: "ask" })}
        onHelp={onHelp}
        onMenu={onMenu}
      />
      {phase === "map" && !overlay && <QuestLog chapter={chapter} onGo={go} onFinish={() => go("home", { finish: true })} />}
      <NotificationTray
        messages={phone.messages}
        phoneEvents={phone.unlocked ? phone.notifications : []}
        canFinish={Boolean(chapter?.canEnd)}
        active={phase === "map" && !overlay && !showIntro}
        onOpenPhoneEvent={() => dispatch({ type: "VISIT", location: "phone" })}
        onGoHome={() => go("home", { finish: true })}
        onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })}
      />
      {showIntro && <ChapterIntro chapter={chapter} avatar={avatar} phoneGift={chapter.phoneGift} onStart={() => setIntroDone(chapter.id)} />}
      {dialog && (
        <div className="dialog-layer">
          <section className={`game-window window-${phase === "map" ? overlay?.type : phase}`} key={`${phase}-${card?.id ?? ""}-${overlay?.type ?? ""}`}>
            {dialog}
          </section>
        </div>
      )}
      {overlay?.type === "phone" && (
        <Phone
          life={life}
          initialApp={overlay.app}
          dispatch={dispatch}
          onClose={() => setOverlay(null)}
          onNotification={() => {
            setOverlay(null);
            dispatch({ type: "VISIT", location: "phone" });
          }}
          onLearn={(lesson) => setOverlay({ type: "gyaan", lesson })}
          onExchange={() => setOverlay({ type: "exchange" })}
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
