// Every language the game can be played in: the one list the UI, the engine's checks and the
// translation scripts all read. To add a language (see docs/SCALABILITY.md):
//   1. add an entry here (and a font in src/main.jsx if its script needs one);
//   2. `npm run lang:export -- <code>` writes a spreadsheet of every English line to translate;
//   3. `npm run lang:import -- <code> <file.csv>` puts the translations into the game.
// Anything not translated yet shows in English, so a language can go live before it is complete.
// Each player downloads only the language they pick (see scripts/lang-packs.js).

export const BASE_LANG = "en";

export const LANGUAGES = [
  {
    code: "en",
    name: "English",
    hello: "Hello, kanna!",
    // Ammamma's pet name for the player, as written in this language (replaced by the player's name).
    petName: "kanna",
    // Words for big amounts, so "₹4 lakh" is highlighted as one number.
    bigNumbers: ["lakh", "crore"],
    // Scripts whose letters join (Indic): no letter-spacing, taller lines (src/life.css .script-complex).
    complexScript: false,
  },
  { code: "hi", name: "हिंदी", hello: "नमस्ते, कन्ना!", petName: "कन्ना", bigNumbers: ["लाख", "करोड़"], complexScript: true },
  { code: "te", name: "తెలుగు", hello: "నమస్తే, కన్నా!", petName: "కన్నా", bigNumbers: ["లక్షలు", "లక్ష", "కోట్లు", "కోటి"], complexScript: true },
];

export const LANG_CODES = LANGUAGES.map((l) => l.code);
export const languageOf = (code) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

// Content text is { en, hi, te, … }: an object with an English string. This walks content in a fixed
// order and lists every such object, so a language pack can say "string n of this file".
export function textObjects(node, out = []) {
  if (Array.isArray(node)) for (const x of node) textObjects(x, out);
  else if (node && typeof node === "object") {
    if (typeof node.en === "string") out.push(node);
    else for (const v of Object.values(node)) textObjects(v, out);
  }
  return out;
}
