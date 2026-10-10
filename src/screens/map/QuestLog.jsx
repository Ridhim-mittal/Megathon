import React, { useState } from "react";
import { ChevronDown, ChevronUp, Home, MapPin, Sparkles } from "lucide-react";
import { useT } from "../../i18n/index.jsx";

// The chapter's to-do list: which places have events, and when to go home.
export function QuestLog({ chapter, onGo }) {
  const { t, plain } = useT();
  const [open, setOpen] = useState(true);
  if (!chapter) return null;
  const pending = chapter.slots.filter((s) => !s.done);
  const byPlace = {};
  for (const s of pending) (byPlace[s.location] ??= []).push(s);
  const places = Object.entries(byPlace).sort(([, a], [, b]) => Number(b.some((x) => x.required)) - Number(a.some((x) => x.required)));
  return (
    <aside className={`quest-log ${open ? "open" : ""}`} aria-label={t("quest.title")}>
      <button className="quest-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <MapPin size={15} aria-hidden="true" />
        <span>
          <strong>{t("quest.title")}</strong>
          <small>
            {chapter.requiredLeft ? t("quest.left", { n: chapter.requiredLeft }) : t("quest.done")}
            {chapter.optionalLeft ? ` ${t("quest.optional", { n: chapter.optionalLeft })}` : ""}
          </small>
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>
      <span className="quest-bar" aria-hidden="true">
        <i style={{ width: `${Math.round(chapter.progress * 100)}%` }} />
      </span>
      {open && (
        <ul>
          {places.map(([loc, list]) => (
            <li key={loc} className={list.some((x) => x.required) ? "required" : "optional"}>
              <button className="quest-go" data-place={loc} onClick={() => onGo(loc)} title={t("quest.goThere")}>
                <span className="quest-mark" aria-hidden="true">
                  {list.some((x) => x.type === "minigame") ? <Sparkles size={12} /> : "!"}
                </span>
                <span>
                  <b>{t(`places.${loc}`)}</b>
                  <small>{list.map((x) => (x.title ? plain(x.title) : t(`places.${loc}`))).slice(0, 2).join(" · ")}</small>
                </span>
              </button>
            </li>
          ))}
          {chapter.requiredLeft === 0 && (
            <li className="home-ready">
              <span className="quest-mark" aria-hidden="true">
                <Home size={12} />
              </span>
              <span>
                <b>{t("quest.goHome")}</b>
                <button className="secondary-button small quest-finish" onClick={() => onGo("home")}>
                  {t("quest.finish")}
                </button>
              </span>
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
