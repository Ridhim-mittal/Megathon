#!/usr/bin/env node
// npm run size (after npm run build): the download budget, so the game stays light on a cheap phone
// with a slow connection as content and languages grow. Sizes are gzipped, as a browser receives them.
// Fails (exit 1) when a budget is broken; raise one only on purpose.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { LANG_CODES } from "../src/languages.js";

const BUDGET_KB = {
  app: 450, // the game itself, English included: everyone downloads this
  styles: 100,
  language: 200, // each language pack, downloaded only by its players
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "dist", "assets");
if (!existsSync(assets)) {
  console.error("No dist/: run npm run build first.");
  process.exit(1);
}
const kb = (file) => gzipSync(readFileSync(join(assets, file))).length / 1024;
const files = readdirSync(assets);
const isPack = (f) => LANG_CODES.some((c) => f.startsWith(`${c}-`)) && f.endsWith(".js");

const rows = [
  ...files.filter((f) => f.endsWith(".js") && !isPack(f)).map((f) => ["app", f, kb(f)]),
  ...files.filter((f) => f.endsWith(".css")).map((f) => ["styles", f, kb(f)]),
  ...files.filter(isPack).map((f) => ["language", f, kb(f)]),
];
let failed = false;
for (const [kind, file, size] of rows) {
  const over = size > BUDGET_KB[kind];
  failed ||= over;
  console.log(`${over ? "OVER" : "ok  "}  ${kind.padEnd(8)} ${size.toFixed(0).padStart(4)} KB / ${BUDGET_KB[kind]} KB  ${file}`);
}
if (failed) {
  console.error("\nA download is over budget. Split it (lazy import) or raise the budget in scripts/check-size.js on purpose.");
  process.exit(1);
}
