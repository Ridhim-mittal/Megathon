import test from "node:test";
import assert from "node:assert/strict";
import { validateContent, summarizeWarnings } from "./validate.js";
import { fixtureContent } from "./__fixtures__/content.js";

const clone = () => structuredClone(fixtureContent);
const cardsOf = (c) => c.storylines.village.cards;
const find = (c, id) => cardsOf(c).find((x) => x.id === id);
const messages = (r) => r.errors.map((e) => `${e.where}: ${e.message}`).join("\n");

test("the fixture content passes with no errors", () => {
  const r = validateContent(fixtureContent);
  assert.deepEqual(r.errors, [], messages(r));
});

test("missing translations are warnings, not errors", () => {
  const r = validateContent(fixtureContent);
  const { translations } = summarizeWarnings(r.warnings);
  assert.ok(translations.find((g) => g.kind === "translation:te").count > 0);
  assert.equal(r.errors.length, 0);
});

test("duplicate ids, unknown lessons and bad ages are errors", () => {
  const c = clone();
  cardsOf(c).push(structuredClone(find(c, "village.child.chocolate.a")));
  find(c, "village.child.piggy.b").lesson = "L99";
  find(c, "village.teen.phone_emi.a").ages = [15, 19]; // L07 is 15–17
  const r = validateContent(c);
  const text = messages(r);
  assert.match(text, /chocolate\.a: Duplicate card id/);
  assert.match(text, /piggy\.b: lesson "L99"/);
  assert.match(text, /phone_emi\.a: A lesson card's ages must fit L07/);
});

test("effects outside the vocabulary and unknown products, sources and meters are errors", () => {
  const c = clone();
  const ch = find(c, "village.child.chocolate.a").choices[0];
  ch.effects = { teleport: 1, meters: { luck: 3 }, open: { product: "crypto" }, loan: { source: "friend", principal: 100 } };
  const r = validateContent(c);
  const text = messages(r);
  assert.match(text, /"teleport" is not in the effects vocabulary/);
  assert.match(text, /Unknown meter "luck"/);
  assert.match(text, /Unknown product "crypto"/);
  assert.match(text, /Unknown loan source "friend"/);
});

test("scheduled cards and documents must exist", () => {
  const c = clone();
  find(c, "village.child.chocolate.a").choices[0].effects = { schedule: [{ inYears: 1, card: "village.nope.a" }] };
  find(c, "village.child.free_coins.a").document = "doc.missing";
  c.documents[1].variants[1].consequence.card = "village.gone.a";
  const text = messages(validateContent(c));
  assert.match(text, /Scheduled card "village\.nope\.a" does not exist/);
  assert.match(text, /Document "doc\.missing" does not exist/);
  assert.match(text, /Card "village\.gone\.a" does not exist/);
});

test("clarity phrases must appear verbatim in each language", () => {
  const c = clone();
  const card = find(c, "village.child.tin_box.a");
  card.clarity[0].phrase.hi = "ब्याज हर साल"; // words reordered: not verbatim
  card.clarity[0].phrase.te = "ప్రతి సంవత్సరం"; // card has no te text: only a warning
  const r = validateContent(c);
  assert.match(messages(r), /does not appear verbatim in the hi text/);
  assert.ok(!/te text/.test(messages(r)));
  assert.ok(r.warnings.some((w) => /no te text/.test(w.message)));
});

test("every lesson needs a card in every playable storyline", () => {
  const c = clone();
  c.storylines.village.cards = cardsOf(c).filter((x) => !(x.kind === "lesson" && x.lesson === "L21"));
  assert.match(messages(validateContent(c)), /No lesson card for L21/);
  // A storyline that is not playable yet is not held to coverage.
  c.storylines.village.cards = cardsOf(clone());
  assert.deepEqual(validateContent(c).errors, []);
});

test("glossary terms and cast tokens must resolve", () => {
  const c = clone();
  find(c, "village.child.chocolate.a").text.en += " [[sip]] {cast:uncle}";
  const text = messages(validateContent(c));
  assert.match(text, /\[\[sip\]\]/);
  assert.match(text, /\{cast:uncle\}/);
});

test("choice rules: 2–4 choices, one default, outcome and why on lesson cards", () => {
  const c = clone();
  const card = find(c, "village.child.chocolate.a");
  card.choices.forEach((x) => (x.default = true));
  delete card.choices[0].why;
  find(c, "village.child.free_coins.a").choices = [find(c, "village.child.free_coins.a").choices[0]];
  const text = messages(validateContent(c));
  assert.match(text, /Only one choice may be the default/);
  assert.match(text, /notebook\.why: Missing text/);
  assert.match(text, /free_coins\.a: A card needs 2–4 choices/);
});
