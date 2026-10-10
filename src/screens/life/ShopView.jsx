import React, { useEffect, useRef } from "react";
import { ArrowRight, Check, Heart, ShoppingBag, Waves } from "lucide-react";
import { useT } from "../../i18n/index.jsx";
import { select } from "../../ui/gameAdapter.js";
import { Money } from "../../ui/Money.jsx";

export function ShopView({ life, dispatch }) {
  const { t, pick, money } = useT();
  const items = select.shopItems(life);
  const hud = select.hud(life);
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="view shop-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">{t("shop.eyebrow", { age: life.age })}</span>
          <h2 ref={heading} tabIndex={-1}>
            {t("shop.title")}
          </h2>
          <p>{t("shop.subtitle")}</p>
        </div>
        <div className="available-pill has-money" role="status">
          <Heart size={18} />
          <div>
            <strong>
              <Money value={hud.wallet} />
            </strong>
            <span>{t("shop.wallet")}</span>
          </div>
        </div>
      </div>
      {items.length ? (
        <ul className="shop-grid">
          {items.map((item) => (
            <li key={item.id} className={`shop-item ${item.bought ? "bought" : ""}`}>
              <span className="shop-icon" aria-hidden="true">
                <ShoppingBag size={22} />
              </span>
              <strong>{pick(item.title)}</strong>
              <span className="shop-meta">
                <b>{money(item.price)}</b>
                <span className="joy-tag">{t("shop.joy", { n: item.joy })}</span>
              </span>
              {item.echo && (
                <span className="echo-line quiet" title={pick(item.echo.hint)}>
                  <Waves size={13} aria-hidden="true" /> {pick(item.echo.hint)}
                </span>
              )}
              <button
                className="secondary-button"
                disabled={!item.affordable}
                onClick={() => dispatch({ type: "BUY_WANT", itemId: item.id })}
                aria-label={`${t("shop.buy")}: ${pick(item.title)}, ${money(item.price)}`}
              >
                {item.bought ? (
                  <>
                    <Check size={14} /> {t("shop.bought")}
                  </>
                ) : item.affordable ? (
                  t("shop.buy")
                ) : (
                  t("shop.cantAfford")
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sheet-note">{t("shop.empty")}</p>
      )}
      <div className="action-row">
        <p>{t("shop.leftover")}</p>
        <button className="primary-button big" onClick={() => dispatch({ type: "SKIP_SHOP" })}>
          {t("shop.done")} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
