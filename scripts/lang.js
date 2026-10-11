#!/usr/bin/env node
// Translating the game, without touching code. See docs/SCALABILITY.md.
//
//   npm run lang:status                         how much of each language is done
//   npm run lang:export -- ta                   translations/ta.csv: every line still missing in Tamil
//   npm run lang:export -- ta --all             every line, with today's translation (to review)
//   npm run lang:import -- ta translations/ta.csv   put the translated lines into the game
//
// The CSV opens in Excel or Google Sheets: columns key, english, <code>, note. Translators fill the
// <code> column only. Keep {placeholders} and [[glossary]] words exactly as they are; the import
// skips lines where they changed and says which. A new language also needs an entry in
// src/languages.js. Lines not translated yet show in English in the game.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_LANG, LANG_CODES, LANGUAGES } from "../src/languages.js";
import { contentFiles } from "./lang-packs.js";
import {
  lookupKey,
  orderLike,
  parseCsv,
  placeholderProblem,
  setKey,
  textEntries,
  toCsv,
  uiEntries,
  writeTexts,
} from "../src/i18n/translate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "src", "content");
const i18nDir = join(root, "src", "i18n");
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
const keyOf = (file) => relative(contentDir, file).split(sep).join("/");
const en = readJson(join(i18nDir, `${BASE_LANG}.json`));
const ui = (code) => readJson(join(i18nDir, `${code}.json`), {});

// Every line to translate: { key, english, current, note }.
function lines(code) {
  const out = [];
  const dict = ui(code);
  for (const { key, value } of uiEntries(en)) {
    const current = lookupKey(dict, key);
    out.push({ key: `ui:${key}`, english: value, current: typeof current === "string" ? current : "", area: "ui" });
  }
  for (const file of contentFiles(contentDir)) {
    for (const { path, obj } of textEntries(readJson(file))) {
      out.push({ key: `${keyOf(file)}:${path.join(".")}`, english: obj.en, current: typeof obj[code] === "string" ? obj[code] : "", area: "content" });
    }
  }
  return out;
}

const NOTE = "Keep {…} and [[…]] exactly; **bold** may move.";

function status() {
  const rows = [];
  for (const { code, name } of LANGUAGES) {
    if (code === BASE_LANG) continue;
    const all = lines(code);
    const done = (area) => all.filter((l) => l.area === area && l.current).length;
    const total = (area) => all.filter((l) => l.area === area).length;
    const pct = (a, b) => `${b ? Math.floor((100 * a) / b) : 100}%`;
    rows.push([code, name, `${done("ui")}/${total("ui")}`, `${done("content")}/${total("content")}`, pct(done("ui") + done("content"), all.length)]);
  }
  const head = ["code", "language", "screens", "story & lessons", "done"];
  const width = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  for (const r of [head, ...rows]) console.log(r.map((c, i) => String(c).padEnd(width[i])).join("  "));
  console.log(`\n${LANGUAGES.length} languages. Untranslated lines show in English. Add one: see docs/SCALABILITY.md.`);
}

function exportSheet(code, all) {
  if (!code || code === BASE_LANG) throw new Error("Usage: npm run lang:export -- <code> [--all]");
  const rows = lines(code).filter((l) => all || !l.current);
  const file = join(root, "translations", `${code}.csv`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, toCsv([["key", "english", code, "note"], ...rows.map((l) => [l.key, l.english, l.current, /[{[]/.test(l.english) ? NOTE : ""])]));
  console.log(`${relative(root, file)}: ${rows.length} lines to ${all ? "review" : "translate"}.`);
  if (!LANG_CODES.includes(code)) console.log(`"${code}" is not in src/languages.js yet: add it there so players can pick it.`);
}

function importSheet(code, file) {
  if (!code || code === BASE_LANG || !file) throw new Error("Usage: npm run lang:import -- <code> <file.csv>");
  const [head, ...rows] = parseCsv(readFileSync(resolve(file), "utf8"));
  const col = (name) => head.indexOf(name);
  const [kc, ec, tc] = [col("key"), col("english"), col(code)];
  if (kc < 0 || ec < 0 || tc < 0) throw new Error(`The sheet needs the columns key, english and ${code}.`);

  const dict = ui(code);
  const edits = {}; // content file → [{ path, code, value }]
  const skipped = [];
  let uiCount = 0;
  for (const r of rows) {
    const [key, english, value] = [r[kc], r[ec], (r[tc] ?? "").trim()];
    if (!key || !value) continue;
    const problem = placeholderProblem(english, value);
    if (problem) {
      skipped.push(`${key}: ${problem}`);
      continue;
    }
    if (key.startsWith("ui:")) {
      const k = key.slice(3);
      if (lookupKey(en, k) !== english) {
        skipped.push(`${key}: the English changed since the export`);
        continue;
      }
      setKey(dict, k, value, en);
      uiCount++;
      continue;
    }
    const at = key.indexOf(":");
    const [fileKey, path] = [key.slice(0, at), key.slice(at + 1).split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p))];
    const target = join(contentDir, ...fileKey.split("/"));
    const obj = existsSync(target) ? path.reduce((n, p) => n?.[p], readJson(target)) : null;
    if (obj?.en !== english) {
      skipped.push(`${key}: the English changed since the export`);
      continue;
    }
    (edits[target] ??= []).push({ path, code, value });
  }

  if (uiCount) writeFileSync(join(i18nDir, `${code}.json`), `${JSON.stringify(orderLike(en, dict), null, 2)}\n`);
  let contentCount = 0;
  for (const [target, list] of Object.entries(edits)) {
    writeFileSync(target, writeTexts(readFileSync(target, "utf8"), list));
    contentCount += list.length;
  }
  console.log(`${code}: ${uiCount} screen lines and ${contentCount} story lines imported.`);
  if (skipped.length) console.log(`Skipped ${skipped.length}:\n  ${skipped.join("\n  ")}`);
  if (!LANG_CODES.includes(code)) console.log(`Add "${code}" to src/languages.js so players can pick it.`);
  console.log("Next: npm run validate:content && npm test");
}

const [cmd, code, ...rest] = process.argv.slice(2);
try {
  if (cmd === "status") status();
  else if (cmd === "export") exportSheet(code, rest.includes("--all"));
  else if (cmd === "import") importSheet(code, rest[0]);
  else throw new Error("Usage: node scripts/lang.js status | export <code> [--all] | import <code> <file.csv>");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
