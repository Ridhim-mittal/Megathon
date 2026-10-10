// The only module the engine and UI import from content (docs/GAME_SPEC.md section 7).
import lessons from "./lessons.json" with { type: "json" };
import glossary from "./glossary.json" with { type: "json" };
import goals from "./goals.json" with { type: "json" };
import wants from "./wants.json" with { type: "json" };
import documents from "./documents.json" with { type: "json" };
import quiz from "./quiz.json" with { type: "json" };
import faq from "./faq.json" with { type: "json" };
import gyaan from "./gyaan.json" with { type: "json" };
import sahukar from "./minigames/sahukar.json" with { type: "json" };

import village from "./storylines/village/storyline.json" with { type: "json" };
import villageEndings from "./storylines/village/endings.json" with { type: "json" };
import villageChild from "./storylines/village/cards/child.json" with { type: "json" };
import villageTeen from "./storylines/village/cards/teen.json" with { type: "json" };
import villageYoung from "./storylines/village/cards/young.json" with { type: "json" };
import villageAdult from "./storylines/village/cards/adult.json" with { type: "json" };
import villageSettle from "./storylines/village/cards/settle.json" with { type: "json" };
import villageCrisis from "./storylines/village/cards/crisis.json" with { type: "json" };

import city from "./storylines/city/storyline.json" with { type: "json" };

const minigames = { sahukar };

const storylines = {
  village: {
    ...village,
    cards: [
      ...villageChild,
      ...villageTeen,
      ...villageYoung,
      ...villageAdult,
      ...villageSettle,
      ...villageCrisis,
    ],
    endings: villageEndings,
  },
  // Coming soon: shown on the select screen, not playable yet.
  city: { ...city, cards: [], endings: {} },
};

export { lessons, glossary, goals, wants, documents, quiz, faq, gyaan, minigames, storylines };
