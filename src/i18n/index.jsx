import React, { createContext, useContext, useMemo } from "react";
import en from "./en.json";
import { LANGUAGES, LANG_CODES, languageOf } from "../languages.js";
import { translationOf, uiStrings } from "./packs.js";
import { ClarityPhrase, GlossaryChip } from "../ui/RichText.jsx";

// The languages come from src/languages.js; each one's strings arrive as a pack (./packs.js).
export const LANGS = LANG_CODES;
const dictOf = (lang) => (lang === "en" ? en : uiStrings(lang));
// A content string in one language: from the object, or (for copied text) from the pack.
const textIn = (obj, lang) => (obj && typeof obj === "object" ? (typeof obj[lang] === "string" ? obj[lang] : translationOf(obj, lang)) : undefined);
const escape = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const I18nContext = createContext(null);

// lang, setLang, playerName, cast (roleId → { name }), glossary, onGlossary(termId)
export function I18nProvider({ value, children }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

function fill(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (all, name) => (vars[name] == null ? all : String(vars[name])));
}

// A language's name: from the UI strings, else as the language calls itself (src/languages.js).
export function langName(t, code) {
  const name = t(`lang.${code}`);
  return name === `lang.${code}` ? languageOf(code).name : name;
}

export function formatMoney(n) {
  const value = Math.round(Number(n) || 0);
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN")}`;
}

export function signedMoney(n) {
  const value = Math.round(Number(n) || 0);
  return value > 0 ? `+${formatMoney(value)}` : formatMoney(value);
}

const TOKEN = /\{player\}|\{cast:([^}]+)\}|\[\[([^\]]+)\]\]/g;
// Words to skim: **marked** text, rupee amounts (₹12,000, ₹4 lakh) and percentages (36%).
const BIG = LANGUAGES.flatMap((l) => l.bigNumbers ?? []).map(escape).join("|");
const STRONG = new RegExp(`\\*\\*([^*]+)\\*\\*|₹\\s?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:\\s?(?:${BIG}))?|\\d+(?:\\.\\d+)?\\s?%`, "g");
function strong(text, prefix) {
  const out = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(STRONG)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <strong key={`${prefix}-s${i++}`} className="rt-key">
        {m[1] ?? m[0]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
const unmark = (text) => (typeof text === "string" ? text.replace(/\*\*([^*]+)\*\*/g, "$1") : text);

// Ammamma's pet name for the player ("kanna", in every language). Once the player has a name,
// she uses that instead.
export const PET_NAME = new RegExp(
  LANGUAGES.map(({ petName: p }) => (/^[a-z]/i.test(p) ? `\\b[${p[0].toUpperCase()}${p[0].toLowerCase()}]${escape(p.slice(1))}\\b` : escape(p))).join("|"),
  "g",
);
export const withName = (text, name) => (name && typeof text === "string" ? text.replace(PET_NAME, name) : text);

export function useT() {
  const ctx = useContext(I18nContext);
  return useMemo(() => {
    const lang = ctx?.lang ?? "en";
    const cast = ctx?.cast ?? {};
    const glossary = ctx?.glossary ?? {};
    const playerName = ctx?.playerName || "Kanna";
    const named = (text) => withName(text, ctx?.playerName);

    const t = (key, vars) => {
      const value = lookup(dictOf(lang), key) ?? lookup(en, key);
      if (value == null) return key;
      if (typeof value === "string") return named(fill(value, vars));
      // Lists (chips, steps) come back as they are; a group of keys is never text.
      return Array.isArray(value) ? value : key;
    };

    // A content string { en, hi, te } in the current language, falling back to English.
    const langOf = (obj) => (typeof textIn(obj, lang) === "string" ? lang : "en");
    const pick = (obj) => {
      if (obj == null) return "";
      if (typeof obj === "string") return named(obj);
      return named(textIn(obj, lang) ?? obj.en ?? "");
    };
    const castName = (id) => pick(cast[id]?.name) || id;
    const termName = (id) => pick(glossary[id]?.name) || id;

    // Plain text with tokens resolved (for labels and aria).
    const plain = (obj, vars) =>
      unmark(named(fill(pick(obj), vars))).replace(TOKEN, (all, castId, term) =>
        all === "{player}" ? playerName : castId ? castName(castId) : termName(term),
      );

    function tokens(text, prefix) {
      const out = [];
      let last = 0;
      let i = 0;
      for (const m of text.matchAll(TOKEN)) {
        if (m.index > last) out.push(...strong(text.slice(last, m.index), `${prefix}-${i}`));
        const key = `${prefix}-${i++}`;
        if (m[0] === "{player}") out.push(<b key={key} className="rt-player">{playerName}</b>);
        else if (m[1]) out.push(<b key={key} className="rt-cast">{castName(m[1])}</b>);
        else out.push(<GlossaryChip key={key} term={m[2]} name={termName(m[2])} short={pick(glossary[m[2]]?.short)} onOpen={ctx?.onGlossary} />);
        last = m.index + m[0].length;
      }
      if (last < text.length) out.push(...strong(text.slice(last), `${prefix}-e`));
      return out;
    }

    // Rich text: tokens become names and glossary chips; clarity phrases become ClarityPhrase.
    // phrases: [{ phrase: {en,…}, truth, revealed, free }]
    function rich(obj, { phrases = [], vars } = {}) {
      const useLang = langOf(obj);
      const text = named(fill(typeof obj === "string" ? obj : textIn(obj, useLang) ?? "", vars));
      const marks = phrases
        .map((p, idx) => ({ ...p, idx, text: named(textIn(p.phrase, useLang)) }))
        .filter((p) => p.text && text.includes(p.text));
      if (!marks.length) return tokens(text, "t");
      const out = [];
      let rest = text;
      let n = 0;
      while (rest.length) {
        let first = null;
        for (const p of marks) {
          const at = rest.indexOf(p.text);
          if (at >= 0 && (first == null || at < first.at)) first = { ...p, at };
        }
        if (!first) {
          out.push(...tokens(rest, `r${n}`));
          break;
        }
        if (first.at > 0) out.push(...tokens(rest.slice(0, first.at), `r${n}`));
        out.push(
          <ClarityPhrase key={`c${n}`} revealed={first.revealed} free={first.free} truth={first.truth ? plain(first.truth) : null}>
            {tokens(first.text, `p${n}`)}
          </ClarityPhrase>,
        );
        rest = rest.slice(first.at + first.text.length);
        n += 1;
      }
      return out;
    }

    return { lang, setLang: ctx?.setLang, t, pick, plain, rich, castName, money: formatMoney, signed: signedMoney, playerName };
  }, [ctx]);
}
