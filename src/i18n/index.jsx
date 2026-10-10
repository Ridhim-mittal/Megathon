import React, { createContext, useContext, useMemo } from "react";
import en from "./en.json";
import hi from "./hi.json";
import te from "./te.json";
import { ClarityPhrase, GlossaryChip } from "../ui/RichText.jsx";

export const LANGS = ["en", "hi", "te"];
const DICTS = { en, hi, te };

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

export function useT() {
  const ctx = useContext(I18nContext);
  return useMemo(() => {
    const lang = ctx?.lang ?? "en";
    const cast = ctx?.cast ?? {};
    const glossary = ctx?.glossary ?? {};
    const playerName = ctx?.playerName || "Kanna";

    const t = (key, vars) => {
      const value = lookup(DICTS[lang], key) ?? lookup(en, key);
      if (value == null) return key;
      if (typeof value === "string") return fill(value, vars);
      return value;
    };

    // A content string { en, hi, te } in the current language, falling back to English.
    const langOf = (obj) => (obj && typeof obj === "object" && typeof obj[lang] === "string" ? lang : "en");
    const pick = (obj) => {
      if (obj == null) return "";
      if (typeof obj === "string") return obj;
      return obj[lang] ?? obj.en ?? "";
    };
    const castName = (id) => pick(cast[id]?.name) || id;
    const termName = (id) => pick(glossary[id]?.name) || id;

    // Plain text with tokens resolved (for labels and aria).
    const plain = (obj, vars) =>
      fill(pick(obj), vars).replace(TOKEN, (all, castId, term) =>
        all === "{player}" ? playerName : castId ? castName(castId) : termName(term),
      );

    function tokens(text, prefix) {
      const out = [];
      let last = 0;
      let i = 0;
      for (const m of text.matchAll(TOKEN)) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const key = `${prefix}-${i++}`;
        if (m[0] === "{player}") out.push(<b key={key} className="rt-player">{playerName}</b>);
        else if (m[1]) out.push(<b key={key} className="rt-cast">{castName(m[1])}</b>);
        else out.push(<GlossaryChip key={key} term={m[2]} name={termName(m[2])} short={pick(glossary[m[2]]?.short)} onOpen={ctx?.onGlossary} />);
        last = m.index + m[0].length;
      }
      if (last < text.length) out.push(text.slice(last));
      return out;
    }

    // Rich text: tokens become names and glossary chips; clarity phrases become ClarityPhrase.
    // phrases: [{ phrase: {en,…}, truth, revealed, free }]
    function rich(obj, { phrases = [], vars } = {}) {
      const useLang = langOf(obj);
      const text = fill(typeof obj === "string" ? obj : obj?.[useLang] ?? "", vars);
      const marks = phrases
        .map((p, idx) => ({ ...p, idx, text: p.phrase?.[useLang] }))
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
          <ClarityPhrase key={`c${n}`} revealed={first.revealed} free={first.free} truth={first.truth ? pick(first.truth) : null}>
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
