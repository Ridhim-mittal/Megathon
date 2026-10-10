import cards from "../data/cards.json" with { type: "json" };
import messages from "../data/messages.json" with { type: "json" };
import crossroads from "../data/crossroads.json" with { type: "json" };
import endings from "../data/endings.json" with { type: "json" };
import lessons from "../data/lessons.json" with { type: "json" };
import finance from "../data/finance.json" with { type: "json" };

export { cards, messages, crossroads, endings, lessons };
export const CFG = finance;
export const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
export const msgById = Object.fromEntries(messages.map((m) => [m.id, m]));
export const crossById = Object.fromEntries(crossroads.map((c) => [c.id, c]));
export const endingById = Object.fromEntries(endings.map((e) => [e.id, e]));
export const METERS = ["health", "family", "peace", "gyaan"];
