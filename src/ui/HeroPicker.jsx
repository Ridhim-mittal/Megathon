import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useT } from "../i18n/index.jsx";
import { PixelPortrait } from "./PixelPortrait.jsx";

const WALK = [1, 0, 2, 0];

// "Who are you?": pick a look and a name right on the title screen. The chosen one walks in place.
export function HeroPicker({ initialAvatar = "boy", initialName = "", onDone, onClose }) {
  const { t } = useT();
  const [avatar, setAvatar] = useState(initialAvatar);
  const [name, setName] = useState(initialName);
  const [tick, setTick] = useState(0);
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const id = setInterval(() => setTick((n) => n + 1), 220);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const shown = name.trim() || t("dream.namePlaceholder");
  const submit = (e) => {
    e.preventDefault();
    onDone({ avatar, playerName: name.trim() });
  };

  return (
    <div className="hero-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="hero-card" role="dialog" aria-modal="true" aria-labelledby="hero-title" onSubmit={submit}>
        <button type="button" className="hero-close" aria-label={t("common.back")} onClick={onClose}>
          <X size={18} />
        </button>
        <span className="hero-ribbon">{t("hero.ribbon")}</span>
        <h2 id="hero-title">{t("hero.title")}</h2>

        <div className="hero-looks" role="radiogroup" aria-label={t("avatar.label")}>
          {["boy", "girl"].map((a, i) => {
            const on = avatar === a;
            return (
              <button
                key={a}
                ref={i === 0 ? first : undefined}
                type="button"
                role="radio"
                aria-checked={on}
                className={`hero-look look-${a} ${on ? "selected" : ""}`}
                onClick={() => setAvatar(a)}
              >
                <span className="hero-look-glow" aria-hidden="true" />
                <PixelPortrait role="player" avatar={a} stage="child" frame={on ? WALK[tick % 4] : 0} />
                <span className="hero-look-shadow" aria-hidden="true" />
                {on && (
                  <span className="vn-sparkles" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                <b>{t(`avatar.${a}`)}</b>
              </button>
            );
          })}
        </div>

        <label className="hero-name">
          <span>{t("dream.nameLabel")}</span>
          <input value={name} maxLength={20} placeholder={t("dream.namePlaceholder")} onChange={(e) => setName(e.target.value)} />
        </label>

        <p className="hero-greet" aria-live="polite">
          <PixelPortrait role="mentor" className="hero-granny" />
          <span key={shown}>{t("hero.greet", { name: shown })}</span>
        </p>

        <button type="submit" className="primary-button big hero-go">
          {t("hero.start")} <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
