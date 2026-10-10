// Chapters and map locations (chapter mode).
//
// In chapter mode a life is five chapters, one per stage. Each chapter's events wait at places
// on the village map; the player walks there to live them. Content can pin a card to a place
// with `location`; otherwise the place comes from the card's lesson or kind.

import { STAGES } from "./curriculum.js";

export const CHAPTERS = STAGES.map((s) => ({ id: s.id, from: s.from, to: s.to }));

export const LOCATIONS = [
  "home",
  "school",
  "bank",
  "hospital",
  "shop",
  "sahukar",
  "post",
  "work",
  "panchayat",
  "square",
  "field",
  "phone",
];

// Places that only open from a stage onward (the workplace needs a job; the phone needs a phone).
export const LOCATION_FROM_STAGE = { work: "teen" };

// Where each lesson is lived.
export const LESSON_LOCATION = {
  L01: "shop",
  L02: "home",
  L03: "shop",
  L04: "bank",
  L05: "school",
  L06: "home",
  L07: "shop",
  L08: "work",
  L09: "phone",
  L10: "school",
  L11: "square",
  L12: "work",
  L13: "bank",
  L14: "sahukar",
  L15: "square",
  L16: "hospital",
  L17: "bank",
  L18: "home",
  L19: "phone",
  L20: "hospital",
  L21: "bank",
  L22: "square",
  L23: "panchayat",
  L24: "post",
};

const SHOCK_LOCATION = { health: "hospital", hospital: "hospital", accident: "hospital", flood: "field", drought: "field", crop: "field" };

function firstShockKind(card) {
  for (const c of card.choices ?? []) {
    const shocks = c.effects?.shock;
    const s = Array.isArray(shocks) ? shocks[0] : shocks;
    if (s?.kind) return s.kind;
  }
  return null;
}

// The place where a card happens. Phone-only places fall back when there is no phone yet.
export function locationOf(card, { hasPhone = false } = {}) {
  let loc = card.location;
  if (!loc) {
    if (card.kind === "crisis" || card.kind === "windfall") loc = "home";
    else if (card.kind === "teachback") loc = "school";
    else if (card.kind === "scam") loc = "phone";
    else if (card.kind === "calamity") loc = SHOCK_LOCATION[firstShockKind(card)] ?? "field";
    else loc = LESSON_LOCATION[card.lesson] ?? "square";
  }
  if (!LOCATIONS.includes(loc)) loc = "square";
  if (loc === "phone" && !hasPhone) loc = card.lesson === "L09" ? "shop" : card.lesson === "L19" ? "bank" : "square";
  return loc;
}
