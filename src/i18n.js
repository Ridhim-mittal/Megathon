import { createContext, useContext } from "react";
import strings from "./data/strings.json";
import regions from "./data/regions.json";

export const LANGS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "te", label: "తెలుగు" },
];
export const REGIONS = Object.keys(regions);

export const rupees = (n) => `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
export const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(Math.round(n)).toLocaleString("en-IN");

// t(key) reads strings.json; tx(obj) reads any {en,hi,te} object from the data files.
// Both fill {tokens} from params first, then from the region pack (mentor, festival, …).
export function makeT(lang, region) {
  const pack = regions[region] || regions.telangana;
  const tokens = Object.fromEntries(Object.entries(pack.tokens).map(([k, v]) => [k, v[lang] || v.en]));
  const fill = (text, params = {}) =>
    String(text).replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : k in tokens ? tokens[k] : m));
  const t = (key, params) => fill(strings[key]?.[lang] ?? strings[key]?.en ?? key, params);
  const tx = (obj, params) => (obj ? fill(obj[lang] ?? obj.en, params) : "");
  return { t, tx, lang, region, tokens, regionName: (id) => regions[id].name[lang] || regions[id].name.en };
}

export const I18n = createContext(makeT("en", "telangana"));
export const useI18n = () => useContext(I18n);
