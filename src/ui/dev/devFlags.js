// Dev switches the game checks while it runs (no timers, auto-win mini-games, no ads, …).
// Remembered in localStorage. Reading a flag is safe everywhere, also in tests and when the dev
// menu is off: every flag is false unless the menu turned it on.

import { useSyncExternalStore } from "react";

const KEY = "lakshyam.dev";

export const DEV_FLAGS = {
  freezeTimers: "Freeze timers (rush + decide-fast)",
  autoWin: "Auto-win story mini-games",
  skipSceneGames: "Read played scenes (no Rat Guard)",
  noAds: "No arcade ads",
  noHints: "No one-time tips",
};

function load() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

let state = typeof window === "undefined" ? {} : load();
const listeners = new Set();

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

// The menu's own settings (enabled, open, tab, …) live here too, under `ui`.
export const devState = () => state;
export const devFlag = (name) => Boolean(state.flags?.[name]);

export function setDev(patch) {
  state = { ...state, ...patch };
  save();
  listeners.forEach((fn) => fn());
}
export const setDevFlag = (name, on) => setDev({ flags: { ...state.flags, [name]: on } });

const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const useDevState = () => useSyncExternalStore(subscribe, devState, devState);
export const useDevFlag = (name) => Boolean(useDevState().flags?.[name]);
