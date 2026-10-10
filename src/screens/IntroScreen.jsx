import React, { useEffect, useState } from "react";
import { ArrowRight, Ban, BookOpen, Bus, CloudRain, Coins, Droplet, FastForward, House, Landmark, NotebookText, Sprout, Store, TreePine, Waves } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { storyline } from "../ui/gameAdapter.js";
import { PixelPortrait as Portrait } from "../ui/PixelPortrait.jsx";
import { ScreenBar } from "../ui/Sheet.jsx";
import { TopControls } from "../ui/Hud.jsx";

// Each intro panel names a scene (content: intro[].scene). A scene sets the sky, the props and any
// extra people; the people named in the text ({cast:…}) and the speaker always step in too.
const SCENES = {
  village: {
    sky: "day",
    props: [
      { icon: TreePine, x: 8, y: 46, tone: "leaf" },
      { icon: Store, x: 24, y: 30 },
      { icon: House, x: 42, y: 44 },
      { icon: House, x: 58, y: 30 },
      { icon: Waves, x: 80, y: 34, tone: "water" },
      { icon: Bus, drive: true },
    ],
  },
  field: { sky: "day", sun: true, props: [{ icon: Sprout, x: 12, y: 18, tone: "leaf" }, { icon: Sprout, x: 84, y: 22, tone: "leaf" }, { icon: Sprout, x: 72, y: 8, tone: "leaf" }] },
  khata: { sky: "day", cast: ["shopkeeper"], props: [{ icon: Landmark, x: 16, y: 34, ban: true }, { icon: NotebookText, x: 80, y: 30, tone: "paper" }] },
  secret: { sky: "dusk", rain: true, quiet: "mentor", props: [{ icon: CloudRain, x: 20, y: 62, tone: "cloud" }, { icon: Sprout, x: 82, y: 10, tone: "dry" }] },
  you: { sky: "day", you: true, cast: ["sibling", "friend"], props: [{ icon: Coins, x: 80, y: 40, tone: "gold", label: "₹50" }] },
  mentor: { sky: "day", props: [{ icon: Droplet, x: 18, y: 50, tone: "water" }, { icon: Droplet, x: 82, y: 40, tone: "water" }, { icon: Coins, x: 32, y: 12, tone: "gold" }] },
  storyteller: { sky: "night", props: [{ icon: BookOpen, x: 50, y: 40, tone: "glow" }] },
};

const castIn = (text) => [...(text ?? "").matchAll(/\{cast:([^}]+)\}/g)].map((m) => m[1]);

function Scene({ scene, people, speaker, castName, youLabel }) {
  return (
    <div className={`story-scene sky-${scene.sky}`} aria-hidden="true">
      <span className="scene-sun" />
      <span className="scene-cloud c1" />
      <span className="scene-cloud c2" />
      {scene.sky === "night" && (
        <span className="scene-stars">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 60}%`, animationDelay: `${(i % 5) * 0.4}s` }} />
          ))}
        </span>
      )}
      {scene.rain && (
        <span className="scene-rain">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.17}s` }} />
          ))}
        </span>
      )}
      <span className="scene-hills" />
      <span className="scene-ground" />
      {scene.props.map((p, i) => {
        const Icon = p.icon;
        if (p.drive)
          return (
            <span key={i} className="scene-bus">
              <Icon size={34} strokeWidth={2.2} />
            </span>
          );
        return (
          <span key={i} className={`scene-prop tone-${p.tone ?? "wood"}`} style={{ left: `${p.x}%`, bottom: `${p.y}px`, animationDelay: `${0.25 + i * 0.12}s` }}>
            <Icon size={30} strokeWidth={2} />
            {p.ban && <Ban className="prop-ban" size={44} strokeWidth={2.6} />}
            {p.label && <b>{p.label}</b>}
          </span>
        );
      })}
      <div className="scene-people">
        {people.map((id, i) => (
          <figure key={id} className={`scene-person ${id === speaker ? "is-speaking" : ""}`} style={{ animationDelay: `${0.15 + i * 0.14}s` }}>
            {id === speaker && <span className="talk-dots"><i /><i /><i /></span>}
            {id === scene.quiet && <span className="quiet-dots">…</span>}
            <Portrait role={id} />
            <figcaption>{castName(id)}</figcaption>
          </figure>
        ))}
        {scene.you && (
          <figure className="scene-person is-you" style={{ animationDelay: `${0.15 + people.length * 0.14}s` }}>
            <span className="you-mark">?</span>
            <Portrait role="player" avatar="girl" />
            <figcaption>{youLabel}</figcaption>
          </figure>
        )}
      </div>
      {scene.sky === "night" && (
        <span className="scene-sparkles">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}

// A storybook: one illustrated scene and a few lines per page.
export function IntroScreen({ settings, storylineId, onDone, onMenu }) {
  const { t, rich, castName, pick } = useT();
  const sl = storyline(storylineId);
  const panels = sl?.intro ?? [];
  const [i, setI] = useState(0);
  const panel = panels[i];
  const last = i >= panels.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input,select,textarea,button")) return;
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!panel) onDone();
  }, [panel, onDone]);
  if (!panel) return null;
  const speaker = panel.speaker ?? "narrator";
  const scene = SCENES[panel.scene] ?? SCENES.village;
  const people = [...new Set([...(speaker !== "narrator" ? [speaker] : []), ...castIn(pick(panel.text)), ...(scene.cast ?? []), ...(scene.quiet ? [scene.quiet] : [])])].filter(
    (id) => sl?.cast?.[id],
  );
  const speakerName = speaker === "narrator" ? t("intro.storyteller") : castName(speaker);

  return (
    <>
      <ScreenBar>
        <TopControls settings={settings} onMenu={onMenu} />
      </ScreenBar>
      <main className="intro storybook">
        <article className="story-page" key={i} aria-live="polite">
          <span className="eyebrow story-ribbon">{t("intro.eyebrow")}</span>
          <div className="story-stage" onClick={next}>
            <Scene scene={scene} people={people} speaker={speaker} castName={castName} youLabel={t("intro.you")} />
          </div>
          <div className="story-words">
            <span className={`story-speaker ${speaker === "narrator" ? "is-narrator" : ""}`}>
              {speaker === "narrator" ? <BookOpen size={15} aria-hidden="true" /> : <Portrait role={speaker} className="story-speaker-face" />}
              {speakerName}
            </span>
            <p className="intro-text">{rich(panel.text)}</p>
          </div>
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
        </article>
      </main>
    </>
  );
}
