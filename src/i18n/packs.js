// Language packs: each player downloads only the language they play in (scripts/lang-packs.js
// builds the packs). English is always there; loadLanguage(code) fetches a pack once and puts its
// strings back into the very content objects the game already holds, so the rest of the code reads
// { en, hi, te } text as before.
import loaders from "virtual:lang-packs";
import { BASE_LANG, textObjects } from "../languages.js";

const files = {}; // content file → its text objects, in the order the pack lists them
const packs = {}; // code → { ui, content }
const byEnglish = {}; // code → Map(English text → translation)
const pending = {};

function apply(code, key) {
  const objs = files[key];
  const list = packs[code]?.content[key];
  if (!objs || !list) return;
  for (let i = 0; i < list.length; i++) {
    if (list[i] == null || !objs[i]) continue;
    objs[i][code] = list[i];
    if (!byEnglish[code].has(objs[i].en)) byEnglish[code].set(objs[i].en, list[i]);
  }
}

// Called by each content JSON module as it loads.
export function register(key, data) {
  files[key] = textObjects(data);
  for (const code in packs) apply(code, key);
}

export const isLoaded = (code) => code === BASE_LANG || Boolean(packs[code]);
export const canLoad = (code) => code === BASE_LANG || Boolean(loaders[code]);
export const uiStrings = (code) => packs[code]?.ui;

export function loadLanguage(code) {
  if (isLoaded(code) || !loaders[code]) return Promise.resolve();
  pending[code] ??= loaders[code]()
    .then(({ default: pack }) => {
      packs[code] = pack;
      byEnglish[code] = new Map();
      for (const key in files) apply(code, key);
    })
    .finally(() => delete pending[code]);
  return pending[code];
}

// Content text that was copied (not the original object) still finds its translation.
export const translationOf = (obj, code) => byEnglish[code]?.get(obj.en);
