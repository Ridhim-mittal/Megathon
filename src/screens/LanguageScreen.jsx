import React from "react";
import { LANGS, useT } from "../i18n/index.jsx";
import { Sheet, ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

const SAMPLE = { en: "Hello, kanna!", hi: "नमस्ते, कन्ना!", te: "నమస్తే, కన్నా!" };

export function LanguageScreen({ settings, onPick, onMenu }) {
  const { t } = useT();
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
              onClick={() => onPick(l)}
              aria-pressed={settings.lang === l}
            >
              <strong>{t(`lang.${l}`)}</strong>
              <span>{SAMPLE[l]}</span>
            </button>
          ))}
        </div>
        {settings.lang !== "en" && <p className="sheet-note">{t("lang.contentNote")}</p>}
      </Sheet>
    </>
  );
}
