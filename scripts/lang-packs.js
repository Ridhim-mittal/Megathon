// Vite plugin: one download per language.
//
// Content text lives in the JSON as { "en": …, "hi": …, "te": … }, and the UI strings in
// src/i18n/<code>.json. Shipped as they are, every player would download every language, and each
// new language would make the game heavier for everyone. So:
//   - each content JSON is served with only its English text (and registers its text objects with
//     src/i18n/packs.js);
//   - every other language becomes its own pack, virtual:lang-pack/<code>: that language's UI
//     strings plus "string n of file f" for the content. The game loads the pack when the player
//     picks the language (src/i18n/packs.js puts the strings back into the same objects).
// Node (tests, npm run validate:content, the translation scripts) reads the JSON files as they are.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { BASE_LANG, LANG_CODES, textObjects } from "../src/languages.js";

const LOADERS = "virtual:lang-packs";
const PACK = "virtual:lang-pack/";
const CONTENT = "\0lang-content:";

export function contentFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...contentFiles(path));
    else if (name.endsWith(".json")) out.push(path);
  }
  return out;
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const others = () => LANG_CODES.filter((c) => c !== BASE_LANG);

export function langPacks(root) {
  const contentDir = resolve(root, "src/content");
  const i18nDir = resolve(root, "src/i18n");
  const keyOf = (file) => relative(contentDir, file).split(sep).join("/");

  return {
    name: "lakshyam-lang-packs",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source === LOADERS) return `\0${LOADERS}`;
      if (source.startsWith(PACK)) return `\0${source}`;
      if (!importer || !source.endsWith(".json") || importer.startsWith("\0")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const file = resolved?.id.split("?")[0];
      if (!file || !file.startsWith(contentDir + sep)) return null;
      return `${CONTENT}${file}.js`;
    },
    load(id) {
      if (id === `\0${LOADERS}`) {
        const entries = others().map((code) => `  ${JSON.stringify(code)}: () => import(${JSON.stringify(PACK + code)}),`);
        return `export default {\n${entries.join("\n")}\n};\n`;
      }
      if (id.startsWith(`\0${PACK}`)) {
        const code = id.slice(PACK.length + 1);
        const uiFile = join(i18nDir, `${code}.json`);
        const ui = existsSync(uiFile) ? readJson(uiFile) : {};
        if (existsSync(uiFile)) this.addWatchFile(uiFile);
        const content = {};
        for (const file of contentFiles(contentDir)) {
          this.addWatchFile(file);
          const list = textObjects(readJson(file)).map((o) => (typeof o[code] === "string" ? o[code] : null));
          while (list.length && list[list.length - 1] == null) list.pop();
          if (list.length) content[keyOf(file)] = list;
        }
        return `export default JSON.parse(${JSON.stringify(JSON.stringify({ ui, content }))});\n`;
      }
      if (id.startsWith(CONTENT)) {
        const file = id.slice(CONTENT.length, -3);
        this.addWatchFile(file);
        const data = readJson(file);
        for (const o of textObjects(data)) for (const code of others()) delete o[code];
        return [
          `import { register } from "/src/i18n/packs.js";`,
          `const data = JSON.parse(${JSON.stringify(JSON.stringify(data))});`,
          `register(${JSON.stringify(keyOf(file))}, data);`,
          `export default data;`,
          "",
        ].join("\n");
      }
      return null;
    },
  };
}
