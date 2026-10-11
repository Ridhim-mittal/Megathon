// Story choices that must be won as a mini-game first. Lose, and you can try again or pick
// another choice. Keys are choice ids (unique across the story).
import { InterestRace } from "./InterestRace.jsx";
import { SalarySplit } from "./SalarySplit.jsx";
import { BasketJuggle } from "./BasketJuggle.jsx";
import { SpotTheFake } from "./SpotTheFake.jsx";
import { RatGuard } from "./RatGuard.jsx";

export const CHOICE_GAMES = {
  scholarship_job: "interest", // College: the scholarship needs the interest race
  check: "fake", // College: checking the Telegram guru = spotting the fake certificate
  pay_first: "salary", // First job: paying yourself first = splitting the salary in time
  spread: "baskets", // Family: spreading the savings = keeping eggs through the storms
};

export const GAME_COMPONENTS = { interest: InterestRace, fake: SpotTheFake, salary: SalarySplit, baskets: BasketJuggle };

// Story scenes played as a mini-game instead of read: the game picks the choice id itself
// (onDone(choiceId)) and the outcome card is skipped. Keys are card (node) ids.
export const SCENE_GAMES = { p_tin: RatGuard };
