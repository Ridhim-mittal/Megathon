// Story choices that must be won as a mini-game first. Lose, and you can try again or pick
// another choice. Keys are choice ids (unique across the story).
import { InterestRace } from "./InterestRace.jsx";
import { SipGarden } from "./SipGarden.jsx";
import { FinePrintHunter } from "./FinePrintHunter.jsx";
import { RatGuard } from "./RatGuard.jsx";

export const CHOICE_GAMES = {
  scholarship_job: "interest", // College: the scholarship needs the interest race
  bank_loan: "fineprint", // First job: the bank loan over the loan app = reading both agreements
  spread: "garden", // Family: spreading the savings = holding every lane of SIP Garden
};

export const GAME_COMPONENTS = { interest: InterestRace, fineprint: FinePrintHunter, garden: SipGarden };

// Story scenes played as a mini-game instead of read: the game picks the choice id itself
// (onDone(choiceId)) and the outcome card is skipped. Keys are card (node) ids.
export const SCENE_GAMES = { p_tin: RatGuard };
