import React, { useEffect, useRef } from "react";
import { ArrowRight, Smartphone, TrendingDown, X } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { sounds } from "../../ui/sound.js";

// Black Monday: one breaking-news pop-up that sends the player to the phone.
export function BreakingNews({ onOpen, onClose }) {
  const { t } = useT();
  const btn = useRef(null);
  useEffect(() => {
    sounds.thud?.();
    btn.current?.focus();
  }, []);
  return (
    <div className="news-layer" role="alertdialog" aria-modal="true" aria-labelledby="news-title">
      <div className="news-card">
        <button className="news-close" onClick={onClose} aria-label={t("common.close")}>
          <X size={16} />
        </button>
        <span className="news-tag">{t("news.tag")}</span>
        <span className="news-chart" aria-hidden="true">
          <TrendingDown size={44} />
        </span>
        <h2 id="news-title">{t("news.title")}</h2>
        <p>{t("news.text")}</p>
        <button ref={btn} className="primary-button big" onClick={onOpen}>
          <Smartphone size={17} /> {t("news.open")} <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
