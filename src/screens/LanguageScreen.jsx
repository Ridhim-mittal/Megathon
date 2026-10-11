import React, { useEffect } from "react";
import { LANGS, langName, useT, withName } from "../i18n/index.jsx";
import { loadLanguage } from "../i18n/packs.js";
import { languageOf } from "../languages.js";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

export function LanguageScreen({ settings, onPick, onMenu }) {
  const { t, playerName } = useT();
  // Fetch the phone's own languages early, so picking one is instant.
  useEffect(() => {
    for (const code of navigator.languages ?? []) if (LANGS.includes(code.slice(0, 2))) loadLanguage(code.slice(0, 2)).catch(() => {});
  }, []);
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <Sheet eyebrow={t("lang.eyebrow")} title={t("lang.title")} subtitle={t("lang.subtitle")} className="lang-sheet">
        <div className="lang-grid">
          {LANGS.map((l) => (
            <button
              key={l}
              className={`lang-card ${settings.lang === l ? "selected" : ""}`}
              lang={l}
              onPointerDown={() => loadLanguage(l).catch(() => {})}
              onClick={() => onPick(l)}
              aria-pressed={settings.lang === l}
            >
              <strong>{langName(t, l)}</strong>
              <span>{withName(languageOf(l).hello, playerName === "Kanna" ? "" : playerName)}</span>
            </button>
          ))}
        </div>
        {settings.lang !== "en" && <p className="sheet-note">{t("lang.contentNote")}</p>}
      </Sheet>
    </>
  );
}
