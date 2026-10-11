// Checks content against the spec (docs/GAME_SPEC.md sections 4–7). Pure: takes the content
// object, returns { errors, warnings }. Each item is { where, message }.
// Missing Hindi or Telugu text is a warning; everything else that breaks the contract is an error.

import { ASSUMPTIONS } from "./assumptions.js";
import {
  CARD_KINDS,
  CURRICULUM,
  EFFECT_KEYS,
  ENDINGS,
  EXPLAINED_KINDS,
  GOALS,
  LANGS,
  LESSON_STATUSES,
  LOAN_SOURCES,
  METERS,
  PILLARS,
  PRODUCTS,
  QUALITIES,
  STAGE_IDS,
  START_AGE,
  END_AGE,
  lessonById,
} from "./curriculum.js";
import { groupOf } from "./deck.js";
import { validateStory } from "./story.js";

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const isLocalized = (x) => isObj(x) && typeof x.en === "string";

export function validateContent(content, { assumptions = ASSUMPTIONS } = {}) {
  const errors = [];
  const warnings = [];
  const err = (where, message) => errors.push({ where, message });
  const warn = (where, message, kind = "contract") => warnings.push({ where, message, kind });

  if (!isObj(content)) {
    err("content", "Content must be an object.");
    return { errors, warnings };
  }

  const glossary = isObj(content.glossary) ? content.glossary : {};
  const documents = Array.isArray(content.documents) ? content.documents : [];
  const docIds = new Set(documents.map((d) => d.id));
  const storylines = isObj(content.storylines) ? content.storylines : {};
  const allCards = [];
  for (const [slId, sl] of Object.entries(storylines)) for (const c of sl.cards ?? []) allCards.push({ slId, card: c });
  const cardIds = new Set(allCards.map((x) => x.card.id));

  // ---------- localized text and tokens ----------

  function checkText(where, value, { required = true, castOf = null } = {}) {
    if (value == null) {
      if (required) err(where, "Missing text.");
      return;
    }
    if (!isLocalized(value)) {
      err(where, 'Text must be { "en": "...", "hi": "...", "te": "..." }.');
      return;
    }
    for (const lang of LANGS) {
      if (lang !== "en" && typeof value[lang] !== "string") warn(where, `Missing ${lang} translation.`, `translation:${lang}`);
    }
    for (const [lang, text] of Object.entries(value)) {
      if (typeof text !== "string") continue;
      for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g))
        if (!glossary[m[1]]) err(where, `Glossary term [[${m[1]}]] (${lang}) is not in glossary.json.`);
      for (const m of text.matchAll(/\{cast:([^}]+)\}/g)) {
        for (const cast of castOf ?? []) if (!cast[m[1]]) err(where, `{cast:${m[1]}} (${lang}) is not in the storyline's cast.`);
      }
    }
  }

  // ---------- effects ----------

  function checkEffects(where, effects) {
    if (effects == null) return;
    if (!isObj(effects)) return err(where, "effects must be an object.");
    for (const [key, v] of Object.entries(effects)) {
      const at = `${where}.${key}`;
      if (!EFFECT_KEYS.includes(key)) {
        err(at, `"${key}" is not in the effects vocabulary.`);
        continue;
      }
      switch (key) {
        case "cash":
        case "gyaan":
        case "glasses":
          if (!Number.isFinite(v)) err(at, "Must be a number.");
          break;
        case "jar":
          if (!isObj(v)) err(at, "Must be { jar: amount }.");
          else for (const [j, x] of Object.entries(v)) {
            if (!["emergency", "goal", "wants"].includes(j)) err(at, `Unknown jar "${j}" (emergency, goal or wants).`);
            if (!Number.isFinite(x)) err(at, `${j} must be a number.`);
          }
          break;
        case "meters":
          if (!isObj(v)) err(at, "Must be { meter: change }.");
          else for (const [m, x] of Object.entries(v)) {
            if (!METERS.includes(m)) err(at, `Unknown meter "${m}".`);
            if (!Number.isFinite(x)) err(at, `${m} must be a number.`);
          }
          break;
        case "flags":
          if (!isObj(v)) err(at, 'Must be { "add": [], "remove": [] }.');
          else for (const k of Object.keys(v)) if (!["add", "remove"].includes(k)) err(at, `Unknown flags key "${k}".`);
          break;
        case "open":
        case "close":
          for (const o of list(v)) {
            if (!PRODUCTS.includes(o?.product)) err(at, `Unknown product "${o?.product}".`);
            if (key === "open" && o?.amount != null && !Number.isFinite(o.amount)) err(at, "amount must be a number.");
          }
          break;
        case "loan":
          for (const o of list(v)) {
            if (!LOAN_SOURCES.includes(o?.source)) err(at, `Unknown loan source "${o?.source}".`);
            if (!(o?.principal > 0)) err(at, "principal must be a positive number.");
            for (const k of Object.keys(o ?? {}))
              if (!["source", "principal", "months", "rateYearly", "emi", "fee", "disburse"].includes(k)) err(at, `Unknown loan field "${k}".`);
            if (o?.disburse != null && !["cash", "direct"].includes(o.disburse)) err(at, 'disburse must be "cash" or "direct".');
          }
          break;
        case "repay":
          for (const o of list(v)) {
            if (!LOAN_SOURCES.includes(o?.loan)) err(at, `Unknown loan source "${o?.loan}".`);
            if (o?.amount != null && o.amount !== "all" && !Number.isFinite(o.amount)) err(at, 'amount must be a number or "all".');
          }
          break;
        case "shock":
          for (const o of list(v)) {
            if (!(o?.cost >= 0)) err(at, "cost must be a number ≥ 0.");
            if (typeof o?.kind !== "string") err(at, "kind is required.");
            else if (!assumptions.shockCover[o.kind] && !["theft", "fire", "repair", "other", "legal", "job_loss"].includes(o.kind))
              warn(at, `Shock kind "${o.kind}" has no insurance cover in assumptions.`);
          }
          break;
        case "income":
          if (!isObj(v) || !Number.isFinite(v.monthly) || v.monthly < 0) err(at, "Must be { monthly: ₹ ≥ 0, source }.");
          break;
        case "schedule":
          for (const o of list(v)) {
            if (!cardIds.has(o?.card)) err(at, `Scheduled card "${o?.card}" does not exist.`);
            if (o?.inYears != null && !(Number.isInteger(o.inYears) && o.inYears >= 0)) err(at, "inYears must be a whole number ≥ 0.");
          }
          break;
        case "lesson":
          if (!LESSON_STATUSES.includes(v)) err(at, `Unknown lesson status "${v}".`);
          break;
        default:
      }
    }
  }

  // ---------- lessons ----------

  const lessons = Array.isArray(content.lessons) ? content.lessons : [];
  if (!Array.isArray(content.lessons)) err("lessons.json", "Missing or not an array.");
  const seenLessons = new Set();
  for (const l of lessons) {
    const where = `lessons.json:${l.id}`;
    if (seenLessons.has(l.id)) err(where, "Duplicate lesson id.");
    seenLessons.add(l.id);
    const spec = lessonById[l.id];
    if (!spec) {
      err(where, "Not a lesson in the curriculum (spec section 4).");
      continue;
    }
    if (l.pillar !== spec.pillar) err(where, `Pillar must be ${spec.pillar}.`);
    if (!Array.isArray(l.ages) || l.ages[0] !== spec.ages[0] || l.ages[1] !== spec.ages[1])
      err(where, `Ages must be [${spec.ages.join(", ")}].`);
    checkText(`${where}.title`, l.title);
    checkText(`${where}.summary`, l.summary, { required: false });
    checkText(`${where}.keyNumber`, l.keyNumber, { required: false });
  }
  for (const l of CURRICULUM) if (lessons.length && !seenLessons.has(l.id)) err("lessons.json", `Lesson ${l.id} is missing.`);

  // ---------- glossary ----------

  for (const [id, g] of Object.entries(glossary)) {
    checkText(`glossary.json:${id}.name`, g?.name);
    checkText(`glossary.json:${id}.short`, g?.short);
  }

  // ---------- goals ----------

  const goals = Array.isArray(content.goals) ? content.goals : [];
  for (const g of goals) {
    if (!GOALS.includes(g.id)) err(`goals.json:${g.id}`, "Not a goal in the spec.");
    checkText(`goals.json:${g.id}.title`, g.title);
    checkText(`goals.json:${g.id}.description`, g.description, { required: false });
  }
  for (const id of GOALS) if (goals.length && !goals.some((g) => g.id === id)) err("goals.json", `Goal ${id} is missing.`);

  // ---------- wants ----------

  const wantIds = new Set();
  for (const w of content.wants ?? []) {
    const where = `wants.json:${w.id}`;
    if (wantIds.has(w.id)) err(where, "Duplicate want id.");
    wantIds.add(w.id);
    if (!STAGE_IDS.includes(w.stage)) err(where, `Unknown stage "${w.stage}".`);
    if (!(w.price > 0)) err(where, "price must be a positive number.");
    if (w.joy != null && !Number.isFinite(w.joy)) err(where, "joy must be a number.");
    checkText(`${where}.title`, w.title);
    if (w.echo) checkText(`${where}.echo.hint`, w.echo.hint);
    checkEffects(`${where}.effects`, w.effects);
  }

  // ---------- documents ----------

  const seenDocs = new Set();
  for (const d of documents) {
    const where = `documents.json:${d.id}`;
    if (seenDocs.has(d.id)) err(where, "Duplicate document id.");
    seenDocs.add(d.id);
    checkText(`${where}.title`, d.title);
    if (d.verify) {
      if (!(d.verify.cost >= 0)) err(`${where}.verify`, "cost must be a number ≥ 0.");
      checkText(`${where}.verify.label`, d.verify.label);
    }
    if (!Array.isArray(d.variants) || !d.variants.length) err(where, "Needs at least one variant.");
    const variantIds = new Set();
    for (const v of d.variants ?? []) {
      const vw = `${where}.${v.id}`;
      if (variantIds.has(v.id)) err(vw, "Duplicate variant id.");
      variantIds.add(v.id);
      if (v.weight != null && !(v.weight >= 0)) err(vw, "weight must be ≥ 0.");
      const lineIds = new Set();
      for (const line of v.lines ?? []) {
        if (lineIds.has(line.id)) err(`${vw}.${line.id}`, "Duplicate line id.");
        lineIds.add(line.id);
        checkText(`${vw}.${line.id}.text`, line.text);
        if (line.redFlag) checkText(`${vw}.${line.id}.explain`, line.explain);
      }
      if (v.consequence && !cardIds.has(v.consequence.card)) err(`${vw}.consequence`, `Card "${v.consequence.card}" does not exist.`);
    }
  }

  // ---------- storylines and cards ----------

  const idsSeen = new Map();
  const playable = Object.entries(storylines).filter(([, sl]) => sl.playable);
  if (!playable.length) err("storylines", "No playable storyline.");
  const casts = Object.fromEntries(Object.entries(storylines).map(([id, sl]) => [id, isObj(sl.cast) ? sl.cast : {}]));

  for (const [slId, sl] of Object.entries(storylines)) {
    const where = `storylines/${slId}`;
    if (sl.id !== slId) err(where, `storyline.json id must be "${slId}".`);
    checkText(`${where}.title`, sl.title);
    checkText(`${where}.tagline`, sl.tagline, { required: false });
    if (sl.playable) {
      for (const role of ["mentor", "friend", "tempter", "sibling", "agent"]) if (!casts[slId][role]) err(`${where}.cast`, `Missing shared role "${role}".`);
      for (const [role, c] of Object.entries(casts[slId])) checkText(`${where}.cast.${role}.name`, c?.name);
      if (sl.start != null) {
        const known = ["cash", "jars", "meters", "flags", "income", "effects"];
        for (const k of Object.keys(sl.start)) if (!known.includes(k)) warn(`${where}.start`, `Unknown start field "${k}" is ignored.`);
        if (sl.start.effects) checkEffects(`${where}.start.effects`, sl.start.effects);
      }
      const endings = sl.endings ?? {};
      for (const e of ENDINGS)
        for (const g of GOALS)
          if (!endings[e]?.[g]) err(`${where}/endings.json`, `Missing text for ${e} / ${g}.`);
          else checkText(`${where}/endings.json:${e}.${g}`, endings[e][g], { castOf: [casts[slId]] });
      if (!endings.storyteller) err(`${where}/endings.json`, "Missing storyteller text.");
      else checkText(`${where}/endings.json:storyteller`, endings.storyteller, { castOf: [casts[slId]] });
    }
  }

  for (const { slId, card: c } of allCards) {
    const where = `card:${c.id ?? "(no id)"}`;
    if (!c.id) {
      err(`storylines/${slId}`, "A card has no id.");
      continue;
    }
    if (idsSeen.has(c.id) && c.storyline !== "all") err(where, "Duplicate card id.");
    idsSeen.set(c.id, slId);
    if (String(c.id).split(".").length < 4) warn(where, "id should be <storyline>.<stage>.<slug>.<variant>.");
    if (c.storyline !== slId && c.storyline !== "all") err(where, `storyline must be "${slId}" or "all".`);
    if (!CARD_KINDS.includes(c.kind)) err(where, `Unknown kind "${c.kind}".`);
    if (!lessonById[c.lesson]) err(where, `lesson "${c.lesson}" is not a curriculum lesson.`);
    const ages = c.ages;
    if (!Array.isArray(ages) || ages.length !== 2 || !(ages[0] <= ages[1])) err(where, "ages must be [min, max].");
    else {
      if (ages[0] < START_AGE || ages[1] > END_AGE) err(where, `ages must be inside ${START_AGE}–${END_AGE}.`);
      const L = lessonById[c.lesson];
      if (c.kind === "lesson" && L && (ages[0] < L.ages[0] || ages[1] > L.ages[1]))
        err(where, `A lesson card's ages must fit ${c.lesson}'s window [${L.ages.join(", ")}].`);
    }
    if (c.weight != null && !(c.weight >= 0)) err(where, "weight must be ≥ 0.");
    const castOf = c.storyline === "all" ? playable.map(([id]) => casts[id]) : [casts[slId]];
    const speaker = c.speaker ?? "narrator";
    if (!["narrator", "headline"].includes(speaker) && castOf.some((cast) => !cast[speaker])) err(where, `Speaker "${speaker}" is not in the cast.`);
    checkText(`${where}.title`, c.title, { castOf });
    checkText(`${where}.text`, c.text, { castOf });

    const q = c.requires;
    if (q != null) {
      if (!isObj(q)) err(`${where}.requires`, "Must be an object.");
      else {
        for (const k of Object.keys(q)) if (!["flags", "notFlags", "minCash", "owns", "lessonStatus"].includes(k)) err(`${where}.requires`, `Unknown key "${k}".`);
        for (const p of q.owns ?? []) if (!PRODUCTS.includes(p)) err(`${where}.requires.owns`, `Unknown product "${p}".`);
        for (const [l, st] of Object.entries(q.lessonStatus ?? {})) {
          if (!lessonById[l]) err(`${where}.requires.lessonStatus`, `Unknown lesson "${l}".`);
          for (const x of list(st)) if (!LESSON_STATUSES.includes(x)) err(`${where}.requires.lessonStatus`, `Unknown status "${x}".`);
        }
      }
    }

    if (c.document && !docIds.has(c.document)) err(`${where}.document`, `Document "${c.document}" does not exist.`);

    // Clarity phrases must appear verbatim in that language's text.
    for (const [i, cl] of (c.clarity ?? []).entries()) {
      const at = `${where}.clarity[${i}]`;
      checkText(`${at}.phrase`, cl.phrase);
      checkText(`${at}.truth`, cl.truth);
      if (cl.lesson && !lessonById[cl.lesson]) err(at, `Unknown lesson "${cl.lesson}".`);
      if (!isLocalized(cl.phrase)) continue;
      for (const lang of LANGS) {
        const phrase = cl.phrase[lang];
        const body = [c.text?.[lang], c.title?.[lang]].filter((x) => typeof x === "string").join("\n");
        if (typeof phrase === "string") {
          if (!body) warn(at, `Phrase has ${lang} but the card has no ${lang} text.`, `translation:${lang}`);
          else if (!body.includes(phrase)) err(at, `Phrase "${phrase}" does not appear verbatim in the ${lang} text.`);
        } else if (lang !== "en" && body) warn(at, `Card has ${lang} text but the phrase has no ${lang}.`, `translation:${lang}`);
      }
    }

    // Choices.
    const choices = Array.isArray(c.choices) ? c.choices : [];
    if (choices.length < 2 || choices.length > 4) err(where, "A card needs 2–4 choices.");
    if (choices.filter((x) => x.default).length > 1) err(where, "Only one choice may be the default.");
    const choiceIds = new Set();
    for (const ch of choices) {
      const at = `${where}.${ch.id}`;
      if (!ch.id) err(where, "A choice has no id.");
      if (choiceIds.has(ch.id)) err(at, "Duplicate choice id.");
      choiceIds.add(ch.id);
      if (ch.quality != null && !QUALITIES.includes(ch.quality)) err(at, `Unknown quality "${ch.quality}".`);
      checkText(`${at}.label`, ch.label, { castOf });
      const explained = EXPLAINED_KINDS.includes(c.kind);
      checkText(`${at}.outcome`, ch.outcome, { required: explained, castOf });
      checkText(`${at}.why`, ch.why, { required: explained, castOf });
      if (ch.echo) {
        if (![1, 2, 3].includes(ch.echo.level)) err(`${at}.echo`, "level must be 1, 2 or 3.");
        checkText(`${at}.echo.hint`, ch.echo.hint, { castOf });
      }
      checkEffects(`${at}.effects`, ch.effects);
    }
  }

  // Coverage: every lesson needs a lesson card in every playable storyline, and teach-backs.
  for (const [slId] of playable) {
    const cards = allCards.filter((x) => x.slId === slId || x.card.storyline === "all").map((x) => x.card);
    for (const l of CURRICULUM) {
      if (!cards.some((c) => c.kind === "lesson" && c.lesson === l.id))
        err(`storylines/${slId}`, `No lesson card for ${l.id} (${l.name}).`);
    }
    for (const p of PILLARS) {
      if (!cards.some((c) => c.kind === "teachback" && lessonById[c.lesson]?.pillar === p))
        warn(`storylines/${slId}`, `No teach-back card for pillar ${p}.`);
    }
    const crossroads = new Set(cards.filter((c) => c.kind === "crossroads").map((c) => groupOf(c.id)));
    if (crossroads.size !== 3) warn(`storylines/${slId}`, `Expected 3 crossroads, found ${crossroads.size}.`);
    for (const key of ["joy_low", "joy_high", "family_low", "family_high"]) {
      if (!cards.some((c) => c.kind === "crisis" && (c.requires?.flags ?? []).includes(`crisis_${key}`)))
        if (!cards.some((c) => c.kind === "crisis" && !(c.requires?.flags ?? []).some((f) => f.startsWith("crisis_"))))
          warn(`storylines/${slId}`, `No crisis card for ${key} (requires.flags: ["crisis_${key}"]).`);
    }
  }

  // ---------- quiz, faq, minigames ----------

  const quiz = content.quiz;
  if (isObj(quiz)) {
    for (const k of ["pre", "post"]) if (!Array.isArray(quiz[k]) || quiz[k].length !== 5) warn("quiz.json", `${k} should have 5 questions.`);
  } else warn("quiz.json", "Missing.");
  const faqIds = new Set();
  for (const f of content.faq ?? []) {
    if (faqIds.has(f.id)) err(`faq.json:${f.id}`, "Duplicate faq id.");
    faqIds.add(f.id);
    checkText(`faq.json:${f.id}.q`, f.q);
    checkText(`faq.json:${f.id}.a`, f.a);
    if (f.lesson && !lessonById[f.lesson]) err(`faq.json:${f.id}`, `Unknown lesson "${f.lesson}".`);
  }
  if (!content.minigames?.sahukar) warn("minigames/sahukar.json", "Missing: Sahukar's chair will be skipped.");

  // ---------- story mode ----------
  if (content.story) {
    const r = validateStory(content.story, { assumptions, documents: Object.fromEntries(documents.map((d) => [d.id, d])) });
    for (const e of r.errors) errors.push({ where: `story:${e.where}`, message: e.msg });
    for (const w of r.warnings) warnings.push({ where: `story:${w.where}`, message: w.msg });
  }

  return { errors, warnings };
}

// Group translation warnings so a report stays readable.
export function summarizeWarnings(warnings, examples = 3) {
  const groups = new Map();
  const other = [];
  for (const w of warnings) {
    if (!w.kind?.startsWith("translation:")) {
      other.push(w);
      continue;
    }
    const g = groups.get(w.kind) ?? { kind: w.kind, count: 0, examples: [] };
    g.count += 1;
    if (g.examples.length < examples) g.examples.push(w.where);
    groups.set(w.kind, g);
  }
  return { translations: [...groups.values()], other };
}
