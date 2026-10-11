// Story choices that must be won as a mini-game first. Lose, and you can try again or pick
// another choice. Keys are "nodeId:choiceId" (or a choice id that is unique across the story).
import React from "react";
import { InterestRace } from "./InterestRace.jsx";
import { SipGarden } from "./SipGarden.jsx";
import { FinePrintHunter } from "./FinePrintHunter.jsx";
import { RatGuard } from "./RatGuard.jsx";
import { ArcadeChoiceGame } from "../arcade/Arcade.jsx";

// One or two games per chapter, each on the choice that uses its lesson.
export const CHOICE_GAMES = {
  "p_shop:to_bank": "snake", // Prologue, L03: prices keep rising, so money must not sleep in a box
  "m1_treasurer:rd": "snowball", // School, L05: an RD grows on its own growth
  "m1_chintu:help": "swipe", // School, L07: saying no to peer pressure and EMIs
  "m2_college:scholarship_job": "interest", // College, L10: the scholarship needs the interest race
  "m2_crash:hold": "patang", // College, L19: a crash is a sale; don't panic-sell
  "m3_insure:family_cover": "rush", // First job, L16: insurance only helps while it's active
  "m3_hospital:bank_loan": "fineprint", // First job, L14: read both loan agreements
  "m4_joint:spread": "garden", // Family, L19/L21: spread your savings
  // Dream, L24 (m5_future:pension): the chit fund / PPF game goes here when it is ready.
};

export const gameFor = (cardId, choiceId) => CHOICE_GAMES[`${cardId}:${choiceId}`] ?? null;

const arcade = (gameId) =>
  function StoryArcade(props) {
    return React.createElement(ArcadeChoiceGame, { gameId, ...props });
  };

export const GAME_COMPONENTS = {
  interest: InterestRace,
  fineprint: FinePrintHunter,
  garden: SipGarden,
  snake: arcade("priceSnake"),
  snowball: arcade("snowball"),
  swipe: arcade("swipeBazaar"),
  patang: arcade("patangMarket"),
  rush: arcade("insuranceRush"),
};

// Story scenes played as a mini-game instead of read: the game picks the choice id itself
// (onDone(choiceId)) and the outcome card is skipped. Keys are card (node) ids.
export const SCENE_GAMES = { p_tin: RatGuard };
