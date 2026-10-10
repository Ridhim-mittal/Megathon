// Dev preview for the phone: `npm run dev`, then open /phone-preview.html (?lang=hi|te, ?age=24).
// Plays a real chapters-mode life forward with default choices, then opens the phone over a
// stand-in map. Tapping a message runs VISIT "phone" and shows the card here.
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-telugu";
import { I18nProvider, LANGS } from "../../i18n/index.jsx";
import { content, createLife, select, step } from "../gameAdapter.js";
import { Phone } from "./Phone.jsx";

const params = new URLSearchParams(window.location.search);
const TARGET_AGE = Number(params.get("age")) || 19;

// Advance with default choices until the map at TARGET_AGE (or later) in a phone-owning stage.
function grownLife() {
  let s = createLife({ storylineId: "village", goalId: "house", seed: "demo", mode: "chapters", playerName: "Test" });
  for (let i = 0; i < 2000; i++) {
    if (s.phase === "map" && s.age >= TARGET_AGE && select.phone(s).unlocked) break;
    if (s.phase === "ending") break;
    let action;
    if (s.phase === "map") {
      const ch = select.chapter(s);
      const places = select.locations(s).filter((l) => l.unlocked && l.pending > 0);
      const next = places.find((l) => l.required > 0) ?? places.find((l) => l.id !== "sahukar" && l.id !== "phone");
      action = ch.canEnd && (!next || ch.to < TARGET_AGE) ? { type: "END_CHAPTER" } : next ? { type: "VISIT", location: next.id } : { type: "END_CHAPTER" };
    } else if (s.phase === "card") {
      const card = select.currentCard(s);
      action = { type: "CHOOSE", choiceId: (card.choices.find((c) => c.default) ?? card.choices[0]).id };
    } else action = { type: "ADVANCE" };
    const next = step(s, action);
    if (next.error && action.type !== "VISIT") break;
    s = next.error ? { ...s, error: null } : next;
  }
  return s;
}

function Preview() {
  const [lang, setLang] = useState(LANGS.includes(params.get("lang")) ? params.get("lang") : "en");
  const [life, setLife] = useState(grownLife);
  const [open, setOpen] = useState(true);
  const i18n = useMemo(() => ({ lang, setLang, playerName: "Test", glossary: content.glossary ?? {} }), [lang]);

  const dispatch = useCallback(
    (action) => {
      const next = step(life, action);
      if (next.error) return next.error;
      setLife(next);
      return null;
    },
    [life],
  );

  const card = life.phase === "card" ? select.currentCard(life) : null;
  const pick = (o) => (o == null ? "" : typeof o === "string" ? o : o[lang] ?? o.en);
  const hud = select.hud(life);

  return (
    <I18nProvider value={i18n}>
      <div className="pv-map">
        <header className="pv-bar">
          <b>Phone preview</b>
          <span>
            Age {hud.age} · {life.stage} · phase {life.phase}
          </span>
          <span className="pv-langs">
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={l === lang} onClick={() => setLang(l)}>
                {l}
              </button>
            ))}
          </span>
          <button type="button" onClick={() => setOpen(true)} disabled={open}>
            Open phone
          </button>
        </header>

        {card && (
          <section className="pv-card" aria-label="Card">
            <h2>{pick(card.title)}</h2>
            <p>{pick(card.text)}</p>
            {card.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const chosen = step(life, { type: "CHOOSE", choiceId: c.id });
                  setLife(step(chosen, { type: "ADVANCE" }));
                  setOpen(true);
                }}
              >
                {pick(c.label)}
              </button>
            ))}
          </section>
        )}

        {open && !card && (
          <Phone
            life={life}
            dispatch={dispatch}
            onClose={() => setOpen(false)}
            onNotification={() => {
              const err = dispatch({ type: "VISIT", location: "phone" });
              if (!err) setOpen(false);
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}

createRoot(document.getElementById("root")).render(<Preview />);
