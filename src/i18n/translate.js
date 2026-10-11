// The translation workflow's pure parts (scripts/lang.js does the files): list every English line,
// read and write the translators' spreadsheet (CSV), check that placeholders survived, and write a
// translation into a content JSON file without reformatting it (teammates edit the same files).

import { textObjects } from "../languages.js";

// ---------- what there is to translate ----------

// UI strings: [{ key: "flood.title", value }] for every string in a dictionary (arrays by index).
export function uiEntries(node, prefix = "") {
  if (typeof node === "string") return [{ key: prefix, value: node }];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([k, v]) => uiEntries(v, prefix ? `${prefix}.${k}` : k));
}

export function lookupKey(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

// Puts value at key, building the same shape as the English dictionary (objects or arrays).
export function setKey(dict, key, value, en) {
  const parts = key.split(".");
  let node = dict;
  let model = en;
  parts.forEach((part, i) => {
    model = model?.[part];
    if (i === parts.length - 1) node[part] = value;
    else {
      node[part] ??= Array.isArray(model) ? [] : {};
      node = node[part];
    }
  });
  return dict;
}

// Orders a translated dictionary like the English one (extra keys go last), so diffs stay small.
export function orderLike(en, dict) {
  if (Array.isArray(en) && Array.isArray(dict)) return dict.map((v, i) => orderLike(en[i], v));
  if (!en || typeof en !== "object" || !dict || typeof dict !== "object" || Array.isArray(dict)) return dict;
  const out = {};
  for (const k of Object.keys(en)) if (k in dict) out[k] = orderLike(en[k], dict[k]);
  for (const k of Object.keys(dict)) if (!(k in out)) out[k] = dict[k];
  return out;
}

// Content text: [{ path: ["nodes", 3, "text"], obj }] in the order textObjects uses.
export function textEntries(node, path = [], out = []) {
  if (Array.isArray(node)) node.forEach((x, i) => textEntries(x, [...path, i], out));
  else if (node && typeof node === "object") {
    if (typeof node.en === "string") out.push({ path, obj: node });
    else for (const [k, v] of Object.entries(node)) textEntries(v, [...path, k], out);
  }
  return out;
}
export const textCount = (data) => textObjects(data).length;

// ---------- placeholders that must come through unchanged ----------
// {player}, {cast:friend}, {amount}, [[emi]] (a glossary chip). **bold** may move but must stay.
const TOKEN = /\{[^}]+\}|\[\[[^\]]+\]\]/g;
export function tokensOf(text) {
  return (text.match(TOKEN) ?? []).sort();
}
export function placeholderProblem(english, translated) {
  const a = tokensOf(english).join(" ");
  const b = tokensOf(translated).join(" ");
  if (a !== b) return `placeholders differ: English has [${a}], translation has [${b}]`;
  const bold = (s) => (s.match(/\*\*/g) ?? []).length;
  if (bold(english) && bold(translated) % 2) return "unbalanced ** marks";
  return null;
}

// ---------- the spreadsheet ----------
// UTF-8 with a BOM, so Excel and Google Sheets show Hindi, Telugu or Tamil correctly.
export function toCsv(rows) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.some((x) => x !== ""));
}

// ---------- writing into a content file without reformatting it ----------
// A small JSON parser that remembers where every value starts and ends.
function parseWithPositions(text) {
  let i = 0;
  const ws = () => {
    while (/\s/.test(text[i])) i++;
  };
  const string = () => {
    const start = i++;
    while (text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    i++;
    return { type: "string", start, end: i, value: JSON.parse(text.slice(start, i)) };
  };
  function value() {
    ws();
    const start = i;
    if (text[i] === "{") {
      i++;
      const props = [];
      ws();
      if (text[i] === "}") return i++, { type: "object", start, end: i, props };
      for (;;) {
        ws();
        const key = string();
        ws();
        i++; // :
        const v = value();
        props.push({ key: key.value, keyStart: key.start, value: v });
        ws();
        if (text[i++] === "}") return { type: "object", start, end: i, props };
      }
    }
    if (text[i] === "[") {
      i++;
      const items = [];
      ws();
      if (text[i] === "]") return i++, { type: "array", start, end: i, items };
      for (;;) {
        items.push(value());
        ws();
        if (text[i++] === "]") return { type: "array", start, end: i, items };
      }
    }
    if (text[i] === '"') return string();
    const m = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
    i += m[0].length;
    return { type: "literal", start, end: i };
  }
  return value();
}

function nodeAt(root, path) {
  let node = root;
  for (const part of path) {
    if (node?.type === "array") node = node.items[part];
    else if (node?.type === "object") node = node.props.find((p) => p.key === String(part))?.value;
    else return null;
  }
  return node;
}

// edits: [{ path, code, value }]. Replaces an existing translation or adds "code": "value" after
// the object's last field, on the same line or a new line to match how that object is written.
export function writeTexts(text, edits) {
  const root = parseWithPositions(text);
  const patches = [];
  for (const { path, code, value } of edits) {
    const obj = nodeAt(root, path);
    if (obj?.type !== "object") throw new Error(`No text object at ${path.join(".")}`);
    const quoted = JSON.stringify(value);
    const have = obj.props.find((p) => p.key === code);
    if (have) {
      patches.push({ at: have.value.start, end: have.value.end, insert: quoted });
      continue;
    }
    const last = obj.props[obj.props.length - 1];
    const lineStart = text.lastIndexOf("\n", last.keyStart) + 1;
    const multiline = text.slice(obj.start, obj.end).includes("\n");
    const indent = text.slice(lineStart, last.keyStart);
    const sep = multiline ? `,\n${indent}` : ", ";
    patches.push({ at: last.value.end, end: last.value.end, insert: `${sep}${JSON.stringify(code)}: ${quoted}` });
  }
  patches.sort((a, b) => b.at - a.at);
  let out = text;
  for (const p of patches) out = out.slice(0, p.at) + p.insert + out.slice(p.end);
  JSON.parse(out); // never write a broken file
  return out;
}
