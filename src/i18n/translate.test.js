import test from "node:test";
import assert from "node:assert/strict";
import { textObjects } from "../languages.js";
import { orderLike, parseCsv, placeholderProblem, setKey, textEntries, toCsv, uiEntries, writeTexts } from "./translate.js";

test("the spreadsheet round-trips commas, quotes, new lines and Indic text", () => {
  const rows = [
    ["key", "english", "te"],
    ["ui:a", 'He said "save", then left.\nNext line', "అతను \"దాచు\" అన్నాడు, వెళ్ళాడు."],
    ["ui:b", "plain", ""],
  ];
  const csv = toCsv(rows);
  assert.ok(csv.startsWith("﻿"));
  assert.deepEqual(parseCsv(csv), rows.map((r) => r.map(String)));
});

test("placeholders and glossary words must survive translation", () => {
  assert.equal(placeholderProblem("Hi {player}, see [[emi]]", "नमस्ते {player}, [[emi]] देखो"), null);
  assert.match(placeholderProblem("Hi {player}", "नमस्ते"), /placeholders differ/);
  assert.match(placeholderProblem("Read [[emi]]", "Read EMI"), /placeholders differ/);
  assert.match(placeholderProblem("**Save** first", "**पहले बचत"), /unbalanced/);
});

test("a translation is written into a content file without reformatting it", () => {
  const text = `{
  "name": { "en": "budget", "hi": "बजट" },
  "short": {
    "en": "A plan.",
    "hi": "प्लान।"
  },
  "list": [ { "en": "One", "hi": "एक" } ]
}
`;
  const out = writeTexts(text, [
    { path: ["name"], code: "ta", value: "வரவு செலவு" },
    { path: ["short"], code: "ta", value: "ஒரு திட்டம்." },
    { path: ["list", 0], code: "hi", value: "एक!" },
  ]);
  assert.equal(
    out,
    `{
  "name": { "en": "budget", "hi": "बजट", "ta": "வரவு செலவு" },
  "short": {
    "en": "A plan.",
    "hi": "प्लान।",
    "ta": "ஒரு திட்டம்."
  },
  "list": [ { "en": "One", "hi": "एक!" } ]
}
`,
  );
});

test("content paths follow the same order as the language packs", () => {
  const data = { a: { en: "x" }, b: [{ en: "y", hi: "य" }, { c: { en: "z" } }] };
  const entries = textEntries(data);
  assert.deepEqual(entries.map((e) => e.path), [["a"], ["b", 0], ["b", 1, "c"]]);
  assert.deepEqual(entries.map((e) => e.obj), textObjects(data));
});

test("UI strings: listed by key, set in the English shape, ordered like English", () => {
  const en = { a: "A", g: { b: "B", list: ["x", "y"] } };
  assert.deepEqual(uiEntries(en).map((e) => e.key), ["a", "g.b", "g.list.0", "g.list.1"]);
  const dict = setKey(setKey({}, "g.list.1", "Y", en), "a", "अ", en);
  assert.ok(Array.isArray(dict.g.list));
  assert.deepEqual(Object.keys(orderLike(en, { g: {}, a: "अ" })), ["a", "g"]);
});
