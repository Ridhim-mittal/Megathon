// The dev menu: jump to any chapter or scene, open any mini-game, cheat, and poke at the save.
// On in `npm run dev`; in a build, open the game once with ?dev=1 (?dev=0 turns it off again).
// ` (backquote) shows or hides it. Missions, scenes and games are read from the content and the
// game registries, so new ones appear here by themselves.

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Minus, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { ArcadeGame, ArcadeMenu } from "../arcade/Arcade.jsx";
import { GAMES } from "../arcade/games.js";
import { GAME_COMPONENTS, GAME_NAME, PRE_GAMES, SCENE_GAMES } from "../games/choiceGames.js";
import { DEV_FLAGS, devState, setDev, setDevFlag, useDevState } from "./devFlags.js";
import { cheats, finishMission, jumpToMission, jumpToNode, playOne, playToEnding, storyMap, whereAmI } from "./devTools.js";

const TABS = ["story", "games", "cheats", "tools"];

// ?dev=1 turns the menu on in this browser (and opens it), ?dev=0 turns it off.
const URL_DEV = (() => {
  try {
    return new URLSearchParams(window.location.search).get("dev");
  } catch {
    return null;
  }
})();
if (URL_DEV === "1" && !devState().enabled) setDev({ enabled: true, view: "open" });
if (URL_DEV === "0" && devState().enabled) setDev({ enabled: false });

// api: { life, route, routes, go(route), setLife(life), makeLife(), setLang(lang) }
export function DevMenu({ api }) {
  const state = useDevState();
  const on = URL_DEV !== "0" && Boolean(import.meta.env?.DEV || state.enabled);
  const view = state.view ?? "pill"; // open | pill | hidden
  const [game, setGame] = useState(null); // { arcade: id } | { story: Component } | { menu: true }

  useEffect(() => {
    if (!on) return undefined;
    const onKey = (e) => {
      if (e.code !== "Backquote" || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input,textarea,select")) return;
      e.preventDefault();
      setDev({ view: view === "open" ? "hidden" : "open" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, view]);

  if (!on) return null;
  return (
    <>
      {game && <DevGame game={game} avatar={api.life?.avatar ?? "boy"} onPick={(id) => setGame({ arcade: id })} onClose={() => setGame(null)} />}
      {view === "pill" && (
        <button className="dev-pill" onClick={() => setDev({ view: "open" })} title="Dev menu ( ` )">
          DEV
        </button>
      )}
      {view === "open" && <DevPanel api={api} state={state} onGame={setGame} />}
    </>
  );
}

function DevPanel({ api, state, onGame }) {
  const tab = TABS.includes(state.tab) ? state.tab : "story";
  const [msg, setMsg] = useState(null);
  const report = (r, label) => {
    if (r.ok) {
      api.setLife(r.life, true);
      setMsg({ ok: true, text: `${label} ✓` });
    } else setMsg({ ok: false, text: r.error });
  };
  const ctx = { api, report, setMsg, onGame };
  return (
    <aside className="dev-panel" aria-label="Dev menu" onKeyDown={(e) => e.stopPropagation()}>
      <header className="dev-head">
        <b>DEV</b>
        <span className="dev-where" title={whereAmI(api.life)}>
          {api.route} · {whereAmI(api.life)}
        </span>
        <button onClick={() => setDev({ view: "pill" })} title="Shrink to a pill" aria-label="Shrink">
          <Minus size={14} />
        </button>
        <button onClick={() => setDev({ view: "hidden" })} title="Hide ( ` brings it back )" aria-label="Hide">
          <X size={14} />
        </button>
      </header>
      <nav className="dev-tabs">
        {TABS.map((id) => (
          <button key={id} className={id === tab ? "on" : ""} onClick={() => setDev({ tab: id })}>
            {id}
          </button>
        ))}
      </nav>
      <div className="dev-body">
        {tab === "story" && <StoryTab {...ctx} openMission={state.openMission} />}
        {tab === "games" && <GamesTab {...ctx} />}
        {tab === "cheats" && <CheatsTab {...ctx} flags={state.flags ?? {}} />}
        {tab === "tools" && <ToolsTab {...ctx} />}
      </div>
      {msg && (
        <p className={`dev-msg ${msg.ok ? "ok" : "bad"}`} onClick={() => setMsg(null)}>
          {msg.text}
        </p>
      )}
    </aside>
  );
}

// ---------- story: chapters and scenes ----------

function StoryTab({ api, report, openMission }) {
  const { pick } = useT();
  const [filter, setFilter] = useState("");
  const map = useMemo(storyMap, []);
  const life = api.life?.mode === "story" ? api.life : null;
  const q = filter.trim().toLowerCase();
  const match = (n) => !q || [n.id, n.lesson, n.location, pick(n.title)].some((x) => String(x ?? "").toLowerCase().includes(q));

  return (
    <>
      <div className="dev-row">
        <button disabled={!life} onClick={() => report(playOne(life), "Step")} title="Do the next thing (default choice)">
          ▶ Step
        </button>
        <button disabled={!life} onClick={() => report(finishMission(life), "Chapter done")} title="Play the rest of this chapter with default choices">
          ⏭ Chapter
        </button>
        <button disabled={!life} onClick={() => report(playToEnding(life), "Ending")} title="Play the rest of the life">
          ⏩ Ending
        </button>
      </div>
      <input className="dev-input" placeholder="Filter scenes: id, lesson, place, title…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul className="dev-tree">
        {map.map((m) => {
          const nodes = m.nodes.filter((n) => !n.outcome && match(n));
          const open = q ? nodes.length > 0 : openMission === m.id;
          const current = life?.story?.mission === m.index;
          if (q && !nodes.length) return null;
          return (
            <li key={m.id}>
              <div className={`dev-mission ${current ? "here" : ""}`}>
                <button className="dev-fold" onClick={() => setDev({ openMission: open ? null : m.id })}>
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>{pick(m.title)}</span>
                  <small>
                    {m.from}–{m.to}
                  </small>
                </button>
                <button onClick={() => report(jumpToMission(life, m.index, api.makeLife), `Start of ${m.id}`)}>start</button>
              </div>
              {open && (
                <ul>
                  {nodes.map((n) => (
                    <li key={n.id}>
                      <button className={`dev-node ${life?.story?.node === n.id ? "here" : ""}`} onClick={() => report(jumpToNode(life, n.id, api.makeLife), n.id)} title={pick(n.title)}>
                        <code>{n.id}</code>
                        <span>{pick(n.title)}</span>
                        <small>
                          {[n.lesson, n.location, n.age].filter((x) => x != null).join(" · ")}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------- games: every registered mini-game ----------

const nameOf = (C, fallback) => C?.displayName || C?.name || fallback;

function GamesTab({ api, report, onGame }) {
  const { t } = useT();
  const life = api.life?.mode === "story" ? api.life : null;
  // Story games: those a scene plays first (PRE_GAMES), then those played as a whole scene.
  const story = useMemo(() => {
    const list = Object.entries(GAME_COMPONENTS).map(([kind, Game]) => {
      const scene = Object.keys(PRE_GAMES).find((node) => PRE_GAMES[node] === kind) ?? null;
      const name = GAME_NAME[kind] ? t(GAME_NAME[kind]) : null;
      return { key: kind, Game, label: name && name !== GAME_NAME[kind] ? name : nameOf(Game, kind), gate: scene ? "plays first" : "not in the story", scene };
    });
    for (const [node, Game] of Object.entries(SCENE_GAMES)) list.push({ key: `scene-${node}`, Game, label: nameOf(Game, node), gate: "played scene", scene: node });
    return list;
  }, [t]);
  const label = (id) => {
    const name = t(`arcade.games.${id}.name`);
    return name.startsWith("arcade.") ? id : name;
  };

  return (
    <>
      <h4>Quick arcade</h4>
      <div className="dev-grid">
        {GAMES.map((g) => (
          <button key={g.id} onClick={() => onGame({ arcade: g.id })}>
            {label(g.id)}
          </button>
        ))}
        <button onClick={() => onGame({ menu: true })}>Arcade menu…</button>
      </div>
      <h4>Story mini-games</h4>
      <ul className="dev-list">
        {story.map((g) => (
          <li key={g.key}>
            <button onClick={() => onGame({ story: g.Game })} title="Practice: no money moves">
              ▶ {g.label}
            </button>
            <small>{g.gate}</small>
            {g.scene && (
              <button onClick={() => report(jumpToNode(life, g.scene, api.makeLife), `At ${g.scene}`)} title="Jump to the scene that uses it">
                → {g.scene}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function DevGame({ game, avatar, onPick, onClose }) {
  if (game.story) return React.createElement(game.story, { mode: "practice", avatar, onClose, onGiveUp: onClose, onDone: onClose });
  return (
    <div className="dialog-layer dev-game-layer">
      <section className="game-window window-arcade">
        {game.menu ? <ArcadeMenu onPick={onPick} onClose={onClose} avatar={avatar} /> : <ArcadeGame key={game.arcade} gameId={game.arcade} onClose={onClose} />}
      </section>
    </div>
  );
}

// ---------- cheats ----------

function CheatsTab({ api, flags }) {
  const life = api.life;
  const apply = (fn) => life && api.setLife(fn(life));
  const money = [
    ["+₹1k", 1000],
    ["+₹10k", 10000],
    ["+₹1L", 100000],
    ["−₹10k", -10000],
  ];
  return (
    <>
      <h4>Switches</h4>
      <div className="dev-flags">
        {Object.entries(DEV_FLAGS).map(([id, text]) => (
          <label key={id}>
            <input type="checkbox" checked={Boolean(flags[id])} onChange={(e) => setDevFlag(id, e.target.checked)} /> {text}
          </label>
        ))}
      </div>
      <h4>Money{life ? ` (cash ₹${Math.round(life.money.cash).toLocaleString("en-IN")})` : ""}</h4>
      <div className="dev-grid">
        {money.map(([text, n]) => (
          <button key={text} disabled={!life} onClick={() => apply((l) => cheats.cash(l, n))}>
            {text}
          </button>
        ))}
        <button disabled={!life} onClick={() => apply((l) => cheats.jar(l, "emergency", 20000))}>
          Emergency +₹20k
        </button>
        <button disabled={!life} onClick={() => apply((l) => cheats.jar(l, "goal", 100000))}>
          Dream jar +₹1L
        </button>
        <button disabled={!life} onClick={() => apply(cheats.clearDebt)}>
          Clear loans
        </button>
      </div>
      <h4>Life</h4>
      <div className="dev-grid">
        <button disabled={!life} onClick={() => apply((l) => cheats.meters(l, 100))}>
          Meters 100
        </button>
        <button disabled={!life} onClick={() => apply((l) => cheats.meters(l, 15))}>
          Meters 15
        </button>
        <button disabled={!life} onClick={() => apply((l) => cheats.glasses(l, 5))}>
          Glasses +5
        </button>
        <button disabled={!life} onClick={() => apply(cheats.phone)}>
          Give phone
        </button>
      </div>
      {life && <FlagEditor life={life} apply={apply} />}
    </>
  );
}

// Story flags decide many routes: add or remove any of them by hand.
function FlagEditor({ life, apply }) {
  const [name, setName] = useState("");
  return (
    <>
      <h4>Flags ({life.flags.length})</h4>
      <div className="dev-chips">
        {life.flags.map((f) => (
          <button key={f} onClick={() => apply((l) => cheats.flag(l, f, false))} title="Remove">
            {f} ×
          </button>
        ))}
      </div>
      <form
        className="dev-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) apply((l) => cheats.flag(l, name.trim()));
          setName("");
        }}
      >
        <input className="dev-input" placeholder="add a flag…" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">add</button>
      </form>
    </>
  );
}

// ---------- tools: screens, saves, storage ----------

function ToolsTab({ api, setMsg }) {
  const copy = async () => {
    const text = JSON.stringify(api.life);
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ ok: true, text: `Save copied (${Math.round(text.length / 1024)} KB)` });
    } catch {
      window.prompt("Copy this save:", text);
    }
  };
  const paste = async () => {
    let text = null;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = window.prompt("Paste a save:");
    }
    try {
      const life = JSON.parse(text);
      if (!life?.phase || !life?.money) throw new Error("not a save");
      api.setLife(life, true);
      setMsg({ ok: true, text: "Save loaded" });
    } catch (e) {
      setMsg({ ok: false, text: `Could not load: ${e.message}` });
    }
  };
  const clear = (keys, label) => {
    try {
      for (const k of keys) window.localStorage.removeItem(k);
      setMsg({ ok: true, text: `${label} cleared` });
    } catch {
      setMsg({ ok: false, text: "Storage unavailable" });
    }
  };
  const allKeys = () => {
    try {
      return Object.keys(window.localStorage).filter((k) => k.startsWith("lakshyam.") && k !== "lakshyam.dev");
    } catch {
      return [];
    }
  };

  return (
    <>
      <h4>Screens</h4>
      <div className="dev-grid">
        {api.routes.map((r) => (
          <button key={r} className={api.route === r ? "on" : ""} onClick={() => api.go(r)}>
            {r}
          </button>
        ))}
      </div>
      <h4>Life</h4>
      <div className="dev-grid">
        <button onClick={() => (api.setLife(api.makeLife(), true), setMsg({ ok: true, text: "Fresh life" }))}>New life</button>
        <button disabled={!api.life} onClick={copy}>
          Copy save
        </button>
        <button onClick={paste}>Paste save</button>
      </div>
      <h4>Language</h4>
      <div className="dev-grid">
        {["en", "hi", "te"].map((l) => (
          <button key={l} onClick={() => api.setLang(l)}>
            {l}
          </button>
        ))}
      </div>
      <h4>Storage</h4>
      <div className="dev-grid">
        <button onClick={() => clear(["lakshyam.once"], "One-time tips")}>Reset tips</button>
        <button onClick={() => clear(["lakshyam.arcade", "lakshyam.ads"], "Arcade scores")}>Reset arcade</button>
        <button onClick={() => clear(["lakshyam.discovered", "lakshyam.endings"], "Flowcharts and endings")}>Reset discovered</button>
        <button onClick={() => window.confirm("Clear every saved thing (not the dev menu)?") && (clear(allKeys(), "Everything"), window.location.reload())}>Wipe all</button>
      </div>
      <p className="dev-note">
        <kbd>`</kbd> shows/hides this menu · in a build use <code>?dev=1</code> / <code>?dev=0</code>
      </p>
    </>
  );
}
