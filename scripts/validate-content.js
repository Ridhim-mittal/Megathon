#!/usr/bin/env node
// npm run validate:content — check src/content against the spec (docs/GAME_SPEC.md).
//
// Loads src/content/index.js. If Node cannot import it (e.g. JSON imports without
// `with { type: "json" }`), it assembles the same object from the files on disk, following the
// layout in spec section 7. Errors exit with code 1; missing translations are warnings only.
//
//   npm run validate:content              # the real content
//   npm run validate:content -- --fixture # the engine's fixture content
//   npm run validate:content -- --all     # list every warning instead of a summary

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { summarizeWarnings, validateContent } from "../src/engine/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "src", "content");
const args = new Set(process.argv.slice(2));

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);

function loadFromDisk() {
  const storylines = {};
  const slDir = join(contentDir, "storylines");
  if (existsSync(slDir)) {
    for (const id of readdirSync(slDir)) {
      const dir = join(slDir, id);
      if (!statSync(dir).isDirectory()) continue;
      const cardsDir = join(dir, "cards");
      const cards = existsSync(cardsDir)
        ? readdirSync(cardsDir)
            .filter((f) => f.endsWith(".json"))
            .sort()
            .flatMap((f) => readJson(join(cardsDir, f), []))
        : [];
      storylines[id] = { ...readJson(join(dir, "storyline.json"), { id }), cards, endings: readJson(join(dir, "endings.json"), {}) };
    }
  }
  const minigames = {};
  const mgDir = join(contentDir, "minigames");
  if (existsSync(mgDir)) for (const f of readdirSync(mgDir)) if (f.endsWith(".json")) minigames[f.replace(/\.json$/, "")] = readJson(join(mgDir, f), null);
  return {
    lessons: readJson(join(contentDir, "lessons.json"), []),
    glossary: readJson(join(contentDir, "glossary.json"), {}),
    goals: readJson(join(contentDir, "goals.json"), []),
    wants: readJson(join(contentDir, "wants.json"), []),
    documents: readJson(join(contentDir, "documents.json"), []),
    quiz: readJson(join(contentDir, "quiz.json"), null),
    faq: readJson(join(contentDir, "faq.json"), []),
    minigames,
    storylines,
  };
}

async function loadContent() {
  if (args.has("--fixture")) {
    const { fixtureContent } = await import("../src/engine/__fixtures__/content.js");
    return { content: fixtureContent, source: "engine fixture (src/engine/__fixtures__/content.js)" };
  }
  const index = join(contentDir, "index.js");
  if (!existsSync(index)) return { content: null, source: null };
  try {
    const mod = await import(pathToFileURL(index).href);
    return { content: mod.default ?? mod, source: "src/content/index.js" };
  } catch (e) {
    console.warn(`Could not import src/content/index.js in Node (${e.message.split("\n")[0]}).`);
    console.warn("Reading the JSON files from disk instead.\n");
    return { content: loadFromDisk(), source: "src/content/**/*.json" };
  }
}

const { content, source } = await loadContent();
if (!content) {
  console.log("src/content/index.js does not exist yet: nothing to validate.");
  console.log("Run `npm run validate:content -- --fixture` to check the engine's fixture instead.");
  process.exit(0);
}

const { errors, warnings } = validateContent(content);
console.log(`Validating ${source}\n`);

for (const e of errors) console.log(`✗ ${e.where}: ${e.message}`);
if (args.has("--all")) {
  for (const w of warnings) console.log(`! ${w.where}: ${w.message}`);
} else {
  const { translations, other } = summarizeWarnings(warnings);
  for (const w of other) console.log(`! ${w.where}: ${w.message}`);
  for (const g of translations)
    console.log(`! ${g.count} strings missing ${g.kind.split(":")[1]} (e.g. ${g.examples.join(", ")}). Use --all to list them.`);
}

console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
