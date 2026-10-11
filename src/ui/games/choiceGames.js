// Story scenes that start with a mini-game: walk in, see "Play X to understand Y", play it, and only
// then read the question and make the choice. Keys are scene (node) ids.
import React from "react";
import { InterestRace } from "./InterestRace.jsx";
import { SipGarden } from "./SipGarden.jsx";
import { FinePrintHunter } from "./FinePrintHunter.jsx";
import { RatGuard } from "./RatGuard.jsx";
import { ArcadeChoiceGame } from "../arcade/Arcade.jsx";

export const PRE_GAMES = {
  p_shop: "snake", // Prologue, L03: prices keep rising
  m1_treasurer: "snowball", // School, L05: money that grows on its own growth
  m1_chintu: "swipe", // School, L07: peer pressure and EMIs
  m2_college: "interest", // College, L10: compare offers with P × R × T ÷ 100
  m2_crash: "patang", // College, L19: a crash is a sale; don't panic-sell
  m3_insure: "rush", // First job, L16: insurance only helps while it's active
  m3_hospital: "fineprint", // First job, L14: read the loan papers
  m4_joint: "garden", // Family, L19/L21: spread your savings
  // Dream, L24 (m5_future): the chit fund / PPF game goes here when it is ready.
};

// The i18n key of each game's name.
export const GAME_NAME = {
  snake: "arcade.games.priceSnake.name",
  snowball: "arcade.games.snowball.name",
  swipe: "arcade.games.swipeBazaar.name",
  patang: "arcade.games.patangMarket.name",
  rush: "arcade.games.insuranceRush.name",
  interest: "interest.title",
  fineprint: "fineprint.title",
  garden: "garden.title",
};

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
