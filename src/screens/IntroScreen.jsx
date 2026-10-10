import React, { useEffect, useState } from "react";
import { ArrowRight, FastForward } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { storyline } from "../ui/gameAdapter.js";
import { Portrait } from "../ui/Portrait.jsx";
import { ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

// Short illustrated panels: the family, the village, and a hint about who is telling the story.
export function IntroScreen({ settings, storylineId, onDone, onMenu }) {
  const { t, rich, castName, pick } = useT();
  const sl = storyline(storylineId);
  const panels = sl?.intro ?? [];
  const [i, setI] = useState(0);
  const panel = panels[i];
  const last = i >= panels.length - 1;
  const castIds = Object.keys(sl?.cast ?? {});
  const next = () => (last ? onDone() : setI(i + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" && !e.target.closest("input,select,textarea")) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!panel) onDone();
  }, [panel, onDone]);
  if (!panel) return null;
  const speaker = panel.speaker ?? "narrator";
  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <main className="intro">
        <div className="intro-family" aria-label={t("intro.eyebrow")}>
          {castIds.slice(0, 7).map((id) => (
            <figure key={id} className={`intro-member ${speaker === id ? "speaking" : ""}`}>
              <Portrait role={id} />
              <figcaption>{castName(id)}</figcaption>
            </figure>
          ))}
        </div>
        <article className="intro-panel" key={i} aria-live="polite">
          <span className="eyebrow">{t("intro.eyebrow")}</span>
          <div className="intro-speaker">
            <Portrait role={speaker} />
            <strong>{speaker === "narrator" ? t("intro.storyteller") : castName(speaker)}</strong>
          </div>
          <p className="intro-text">{rich(panel.text)}</p>
          <div className="intro-nav">
            <span className="intro-dots" aria-label={t("intro.panel", { n: i + 1, total: panels.length })}>
              {panels.map((_, n) => (
                <i key={n} className={n === i ? "on" : n < i ? "done" : ""} />
              ))}
            </span>
            <button className="text-button" onClick={onDone}>
              <FastForward size={15} /> {t("intro.skip")}
            </button>
            <button className="primary-button" onClick={next} autoFocus>
              {last ? t("intro.begin") : t("common.next")} <ArrowRight size={17} />
            </button>
          </div>
          {sl?.persona && i === 0 && <p className="intro-persona">{pick(sl.persona)}</p>}
        </article>
      </main>
    </>
  );
}
