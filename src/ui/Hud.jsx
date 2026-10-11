import React from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Glasses,
  Heart,
  Home,
  Landmark,
  MessageCircle,
  Smile,
  Sprout,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  TrendingDown,
} from "lucide-react";
import { LANGS, langName, useT } from "../i18n/index.jsx";
import { Meter, Money } from "./Money.jsx";

export function LangSelect({ lang, onChange }) {
  const { t } = useT();
  return (
    <label className="hud-lang">
      <span className="sr-only">{t("lang.label")}</span>
      <select value={lang} onChange={(e) => onChange(e.target.value)} aria-label={t("lang.label")}>
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {langName(t, l)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TopControls({ settings, onAsk, onHelp, onMenu, sound = true }) {
  const { t } = useT();
  return (
    <div className="hud-controls">
      <LangSelect lang={settings.lang} onChange={settings.setLang} />
      {sound && (
        <button
          className="hud-button"
          aria-pressed={settings.sound}
          aria-label={settings.sound ? t("hud.soundOn") : t("hud.soundOff")}
          title={settings.sound ? t("hud.soundOn") : t("hud.soundOff")}
          onClick={() => settings.setSound(!settings.sound)}
        >
          {settings.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      )}
      {onAsk && (
        <button className="hud-button ask-button" aria-label={t("hud.ask")} title={t("hud.ask")} onClick={onAsk}>
          <MessageCircle size={19} />
        </button>
      )}
      {onHelp && (
        <button className="hud-button" aria-label={t("hud.help")} title={t("hud.help")} onClick={onHelp}>
          <BookOpen size={19} />
        </button>
      )}
      {onMenu && (
        <button className="hud-button" aria-label={t("common.menu")} title={t("common.menu")} onClick={onMenu}>
          <ArrowLeft size={19} />
        </button>
      )}
    </div>
  );
}

// The life HUD: age and stage, money, and the controls.
export function LifeTopBar({ hud, settings, onAsk, onHelp, onMenu }) {
  const { t } = useT();
  const year = hud.age - 10;
  return (
    <header className="life-topbar">
      <div className="hud-age">
        <span className="hud-sprout">
          <Sprout size={22} />
        </span>
        <div>
          <strong>{t("common.age", { age: hud.age })}</strong>
          <span>
            {t(`stage.${hud.stage}`)} · {t("hud.year", { n: year })}
          </span>
        </div>
        <span className="year-track" aria-hidden="true">
          <i style={{ width: `${(year / 26) * 100}%` }} />
        </span>
      </div>
      <div className="hud-money" aria-live="polite">
        <div className="money-chip cash">
          <Wallet size={16} aria-hidden="true" />
          <small>{t("hud.cash")}</small>
          <Money value={hud.cash + hud.wallet} />
        </div>
        <div className="money-chip savings">
          <Landmark size={16} aria-hidden="true" />
          <small>{t("hud.savings")}</small>
          <Money value={hud.savings - hud.cash - hud.wallet + hud.investments} />
        </div>
        <div className={`money-chip debt ${hud.debt > 0 ? "has-debt" : ""}`}>
          <TrendingDown size={16} aria-hidden="true" />
          <small>{t("hud.debt")}</small>
          <Money value={hud.debt} />
        </div>
      </div>
      <TopControls settings={settings} onAsk={onAsk} onHelp={onHelp} onMenu={onMenu} />
    </header>
  );
}

const METER_ICONS = { joy: Smile, health: Heart, family: Users, gyaan: Brain };

export function MetersCard({ meters, glasses }) {
  const { t } = useT();
  return (
    <section className="side-card meters-card" aria-label={t("hud.meters")}>
      {["joy", "health", "family", "gyaan"].map((m) => (
        <Meter key={m} id={m} label={t(`meter.${m}`)} value={meters[m]} icon={METER_ICONS[m]} />
      ))}
      <div className="glasses-count" title={t("card.glassesHelp")}>
        <Glasses size={15} aria-hidden="true" />
        <span>{t("hud.glasses", { n: glasses })}</span>
        <span className="lens-row" aria-hidden="true">
          {Array.from({ length: Math.min(glasses, 8) }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </div>
    </section>
  );
}

export function DreamCard({ dream, goalTitle }) {
  const { t, money } = useT();
  return (
    <section className={`side-card dream-card ${dream.reached ? "reached" : ""}`} aria-label={t("hud.dream")}>
      <div className="dream-card-head">
        <Home size={17} aria-hidden="true" />
        <div>
          <span>{t("hud.dream")}</span>
          <strong>{goalTitle}</strong>
        </div>
        <b>{dream.reached ? t("hud.reached") : `${dream.pct}%`}</b>
      </div>
      <div className="dream-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dream.pct} aria-label={t("hud.dream")}>
        <i style={{ width: `${dream.pct}%` }} />
      </div>
      <small>
        {money(dream.saved)} / {money(dream.target)}
      </small>
    </section>
  );
}
