import React from "react";
import { Brain, Heart, Home, Landmark, Smartphone, Smile, TrendingDown, Users, Wallet } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { TopControls } from "../../ui/Hud.jsx";
import { Meter, Money } from "../../ui/Money.jsx";

const METER_ICONS = { joy: Smile, health: Heart, family: Users, gyaan: Brain };

// The top bar over the map: chapter and age, money, meters, dream, phone and controls.
export function MapHud({ hud, chapter, goalTitle, settings, phone, onPhone, onAsk, onHelp, onMenu }) {
  const { t, money } = useT();
  return (
    <header className="map-hud">
      <div className="hud-panel hud-chapter">
        <span className="hud-chapter-no">{chapter ? chapter.number : ""}</span>
        <div>
          <strong>{chapter ? t(`chapter.names.${chapter.id}`) : ""}</strong>
          <span>
            {t("common.age", { age: hud.age })}
            {chapter ? ` · ${t("chapter.ages", { from: chapter.from, to: chapter.to })}` : ""}
          </span>
        </div>
      </div>
      <div className="hud-panel hud-cash" aria-live="polite">
        <span className="chip">
          <Wallet size={15} aria-hidden="true" />
          <small>{t("hud.cash")}</small>
          <Money value={hud.cash + hud.wallet} />
        </span>
        <span className="chip">
          <Landmark size={15} aria-hidden="true" />
          <small>{t("hud.savings")}</small>
          <Money value={hud.savings - hud.cash - hud.wallet + hud.investments} />
        </span>
        <span className={`chip ${hud.debt > 0 ? "debt" : ""}`}>
          <TrendingDown size={15} aria-hidden="true" />
          <small>{t("hud.debt")}</small>
          <Money value={hud.debt} />
        </span>
      </div>
      <div className="hud-panel hud-meters" aria-label={t("hud.meters")}>
        {["joy", "health", "family", "gyaan"].map((m) => (
          <Meter key={m} id={m} label={t(`meter.${m}`)} value={hud.meters[m]} icon={METER_ICONS[m]} />
        ))}
      </div>
      <div className="hud-panel hud-dream" title={`${money(hud.dream.saved)} / ${money(hud.dream.target)}`}>
        <Home size={15} aria-hidden="true" />
        <div>
          <small>{t("hud.dream")}</small>
          <strong>{goalTitle}</strong>
          <span className="dream-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.dream.pct} aria-label={t("hud.dream")}>
            <i style={{ width: `${hud.dream.pct}%` }} />
          </span>
        </div>
        <b>{hud.dream.reached ? "✓" : `${hud.dream.pct}%`}</b>
      </div>
      <div className="hud-right">
        <button
          className={`hud-button phone-button ${phone.unlocked ? "" : "locked"}`}
          onClick={onPhone}
          disabled={!phone.unlocked}
          aria-label={phone.unlocked ? `${t("phone.open")} (P)` : t("phone.locked")}
          title={phone.unlocked ? `${t("phone.open")} (P)` : t("phone.locked")}
        >
          <Smartphone size={19} />
          {phone.notifications.length > 0 && <b className="badge">{phone.notifications.length}</b>}
        </button>
        <TopControls settings={settings} onAsk={onAsk} onHelp={onHelp} onMenu={onMenu} />
      </div>
    </header>
  );
}
