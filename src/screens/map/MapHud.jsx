import React from "react";
import { Home, Landmark, Pause, Smartphone, TrendingDown, Wallet } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { TopControls } from "../../ui/Hud.jsx";
import { Money } from "../../ui/Money.jsx";
import { LessonBadge } from "../../ui/LessonBadge.jsx";

// The top bar over the map: chapter and age, money, dream, the current lesson, pause, phone and controls.
export function MapHud({ hud, chapter, goalTitle, settings, phone, lessonId, onPhone, onPause, onAsk }) {
  const { t, money } = useT();
  return (
    <header className="map-hud">
      <div className="hud-panel hud-chapter">
        <span className="hud-chapter-no">{chapter ? chapter.number : ""}</span>
        <div>
          <strong>{chapter ? t(`chapter.names.${chapter.id}`) : ""}</strong>
          <span>
            {t("common.age", { age: hud.age })}
          </span>
        </div>
      </div>
      <div className="hud-panel hud-cash" aria-live="polite">
        <span className="chip" title={t("hud.cash")}>
          <Wallet size={15} aria-hidden="true" />
          <small>{t("hud.cash")}</small>
          <Money value={hud.cash + hud.wallet} />
        </span>
        <span className="chip" title={t("hud.savings")}>
          <Landmark size={15} aria-hidden="true" />
          <small>{t("hud.savings")}</small>
          <Money value={hud.savings - hud.cash - hud.wallet + hud.investments} />
        </span>
        <span className={`chip ${hud.debt > 0 ? "debt" : "no-debt"}`} title={t("hud.debt")}>
          <TrendingDown size={15} aria-hidden="true" />
          <small>{t("hud.debt")}</small>
          <Money value={hud.debt} />
        </span>
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
        <LessonBadge lessonId={lessonId} />
        {onPause && (
          <button className="hud-button pause-button" onClick={onPause} aria-label={`${t("pause.pause")} (T)`} title={`${t("pause.pause")} (T)`}>
            <Pause size={19} />
          </button>
        )}
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
        {/* Sound and How to play live in the pause menu. */}
        <TopControls settings={settings} onAsk={onAsk} sound={false} />
      </div>
    </header>
  );
}
