import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { DEFAULT_BUDGET, emiReserve, needsFloor } from "../engine/engine.js";
import { useI18n, rupees } from "../i18n.js";

const KEYS = ["needs", "wants", "savings", "goal"];
const COINS = 20; // one coin = 5%
const POT_COLOR = { needs: "#e9a53b", wants: "#d9607a", savings: "#3d7a4a", goal: "#2b3a67" };

export function ClayPot({ pct, color, size = 64, animate = false }) {
  const level = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 60 64" width={size} height={size} aria-hidden>
      <defs>
        <clipPath id={`pot-${color.slice(1)}`}>
          <path d="M14 14h32c0 6 10 12 10 26 0 14-11 22-26 22S4 54 4 40c0-14 10-20 10-26z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#pot-${color.slice(1)})`}>
        <rect width="60" height="64" fill="#e8c9a0" />
        <rect className={animate ? "pot-fill" : ""} x="0" y={62 - (level / 100) * 48} width="60" height={(level / 100) * 48 + 2} fill={color} style={{ transition: "y .3s, height .3s" }} />
      </g>
      <path d="M14 14h32c0 6 10 12 10 26 0 14-11 22-26 22S4 54 4 40c0-14 10-20 10-26z" fill="none" stroke="#241510" strokeWidth="2.5" />
      <rect x="11" y="8" width="38" height="7" rx="2" fill="#b5652d" stroke="#241510" strokeWidth="2" />
      <path d="M12 34 q18 6 36 0" stroke="#241510" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
    </svg>
  );
}

const Coin = ({ onPointerDown, label }) => (
  <button
    type="button"
    onPointerDown={onPointerDown}
    aria-label={label}
    className="h-6 w-6 touch-none rounded-full border-2 border-ink bg-gold text-[10px] font-black shadow-[1px_1px_0_#241510]"
  >
    ₹
  </button>
);

// Four clay pots. Drag a coin between pots (or the tray), or use the sliders/±.
export function Pots({ life, onSeal }) {
  const { t } = useI18n();
  const start = life.budget || DEFAULT_BUDGET;
  const [coins, setCoins] = useState(() => Object.fromEntries(KEYS.map((k) => [k, start[k] / 5])));
  const [autoRepay, setAutoRepay] = useState(life.autoRepay);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const loose = COINS - KEYS.reduce((a, k) => a + coins[k], 0);
  const reserved = emiReserve(life);
  const spendable = life.income - reserved;
  const floor = needsFloor(life);

  const move = (from, to) => {
    if (from === to) return;
    setCoins((c) => {
      const next = { ...c };
      if (from !== "tray") {
        if (next[from] <= 0) return c;
        next[from] -= 1;
      } else if (COINS - KEYS.reduce((a, k) => a + c[k], 0) <= 0) return c;
      if (to !== "tray") next[to] += 1;
      return next;
    });
  };
  const setPot = (k, n) =>
    setCoins((c) => {
      const others = KEYS.filter((x) => x !== k).reduce((a, x) => a + c[x], 0);
      return { ...c, [k]: Math.max(0, Math.min(COINS - others, n)) };
    });

  const beginDrag = (from) => (e) => {
    e.preventDefault();
    const d = { from, x: e.clientX, y: e.clientY };
    dragRef.current = d;
    setDrag(d);
    const onMove = (ev) => {
      dragRef.current = { ...dragRef.current, x: ev.clientX, y: ev.clientY };
      setDrag(dragRef.current);
    };
    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-pot]");
      const moved = Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 8;
      if (el && moved) move(from, el.dataset.pot);
      else if (!moved && from === "tray") move("tray", KEYS.find((k) => coins[k] === Math.min(...KEYS.map((x) => coins[x]))));
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const budget = Object.fromEntries(KEYS.map((k) => [k, coins[k] * 5]));
  return (
    <div className="mt-2" data-testid="pots">
      <h4 className="text-base font-black">{t("pots.title")}</h4>
      <p className="text-[12px]">{t("pots.help")}</p>
      {reserved > 0 && <p className="mt-1 text-[12px] font-bold text-debt">{t("pots.emi", { amount: rupees(reserved) })}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {KEYS.map((k) => (
          <div key={k} data-pot={k} className="rounded-lg border-2 border-ink bg-white/70 p-1.5 text-center" data-testid={`pot-${k}`}>
            <div className="flex items-center justify-center gap-1">
              <ClayPot pct={(coins[k] / COINS) * 100 * 2} color={POT_COLOR[k]} size={52} />
              <div className="text-left">
                <div className="text-[13px] font-black leading-tight">{t(`pots.${k}`)}</div>
                <div className="text-[10px] leading-tight opacity-80">{t(`pots.${k}.d`)}</div>
                <output className="block text-sm font-black" data-testid={`pot-${k}-pct`}>
                  {coins[k] * 5}%
                </output>
                <div className="text-[10px] font-bold">{rupees((spendable * coins[k] * 5) / 100)}</div>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <button type="button" className="btn bg-cream p-0.5" onClick={() => move(k, "tray")} disabled={coins[k] === 0} aria-label={t("pots.less", { pot: t(`pots.${k}`) })}>
                <Minus size={14} />
              </button>
              <input
                type="range"
                min="0"
                max={COINS}
                value={coins[k]}
                onChange={(e) => setPot(k, Number(e.target.value))}
                aria-label={t(`pots.${k}`)}
                className="h-2 w-full min-w-0 flex-1 accent-[#241510]"
              />
              <button type="button" className="btn bg-cream p-0.5" onClick={() => move("tray", k)} disabled={loose === 0} aria-label={t("pots.more", { pot: t(`pots.${k}`) })}>
                <Plus size={14} />
              </button>
            </div>
            {coins[k] > 0 && (
              <div className="mt-1 flex justify-center">
                <Coin onPointerDown={beginDrag(k)} label={`${t("pots.drag")} · ${t(`pots.${k}`)}`} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div data-pot="tray" className="mt-2 flex min-h-9 flex-wrap items-center gap-1 rounded-lg border-2 border-dashed border-ink bg-ochre/30 p-1.5" data-testid="coin-tray">
        <span className="mr-1 text-[12px] font-bold">{t("pots.tray", { n: loose })}</span>
        {Array.from({ length: Math.min(loose, 10) }, (_, i) => (
          <Coin key={i} onPointerDown={beginDrag("tray")} label={t("pots.drag")} />
        ))}
      </div>
      {budget.needs < floor && <p className="mt-1 text-[12px] font-bold text-debt">⚠ {t("pots.floor", { floor })}</p>}
      {life.age >= 21 && (
        <label className="mt-2 flex items-start gap-2 text-[12px] font-bold">
          <input type="checkbox" checked={autoRepay} onChange={(e) => setAutoRepay(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#241510]" />
          {t("pots.autoRepay")}
        </label>
      )}
      <button
        type="button"
        className="btn mt-2 w-full bg-leaf py-2 text-cream"
        disabled={loose !== 0}
        onClick={() => onSeal({ type: "budget", budget, autoRepay })}
      >
        {loose ? t("pots.left") : t("pots.confirm")}
      </button>
      {drag && (
        <span className="pointer-events-none fixed z-[60] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-gold text-center text-xs font-black leading-6" style={{ left: drag.x, top: drag.y }}>
          ₹
        </span>
      )}
    </div>
  );
}

export function AutoSplit({ split }) {
  const { t } = useI18n();
  const total = KEYS.reduce((a, k) => a + split[k], 0) || 1;
  return (
    <div className="mt-2 rounded-lg border-2 border-ink bg-white/60 p-2" data-testid="auto-split">
      <p className="text-[12px] font-bold">{t("pots.auto")}</p>
      <div className="mt-1 grid grid-cols-4 gap-1 text-center">
        {KEYS.map((k) => (
          <div key={k}>
            <div className="flex justify-center">
              <ClayPot pct={(split[k] / total) * 200} color={POT_COLOR[k]} size={40} animate />
            </div>
            <div className="text-[10px] font-black">{t(`pots.${k}`)}</div>
            <div className="text-[10px]">{rupees(split[k])}</div>
          </div>
        ))}
      </div>
      {split.reserved > 0 && <p className="mt-1 text-[11px] font-bold text-debt">{t("year.emiReserved", { amount: rupees(split.reserved) })}</p>}
    </div>
  );
}
