import { useEffect, useRef, useState } from "react";
import { BookOpen, Settings, Home } from "lucide-react";
import { hud, wheelState } from "../engine/engine.js";
import { useI18n, rupees, signed } from "../i18n.js";
import { METER_ICON, METERS } from "./bits.jsx";

// Payback-style sticky meters. Every change floats a delta over its meter.
export function Hud({ life, onAssumptions, onSettings, onMenu }) {
  const { t } = useI18n();
  const now = hud(life);
  const prev = useRef(now);
  const [deltas, setDeltas] = useState([]);
  const [debtPulse, setDebtPulse] = useState(0);
  useEffect(() => {
    const before = prev.current;
    prev.current = now;
    const fresh = [];
    for (const k of ["wallet", "debt", "goalPct", ...METERS]) {
      const d = now[k] - before[k];
      if (d) fresh.push({ id: `${k}${Date.now()}${Math.random()}`, k, d });
    }
    if (now.debt > before.debt) setDebtPulse((n) => n + 1);
    if (!fresh.length) return;
    setDeltas((xs) => [...xs, ...fresh]);
    setTimeout(() => setDeltas((xs) => xs.filter((x) => !fresh.includes(x))), 1700);
  }, [now.wallet, now.debt, now.goalPct, now.health, now.family, now.peace, now.gyaan]); // eslint-disable-line react-hooks/exhaustive-deps

  const floats = (k, fmt = signed) =>
    deltas
      .filter((x) => x.k === k)
      .map((x) => {
        const good = k === "debt" ? x.d < 0 : x.d > 0;
        return (
          <span key={x.id} className={`delta ${good ? "text-[#1f6b2e]" : "text-debt"}`} data-testid={`delta-${k}`}>
            {fmt(x.d)}
          </span>
        );
      });
  const age = life.cur ? life.cur.age : life.age;

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-red-deep px-2 pb-1.5 pt-1.5 text-cream shadow-[0_3px_0_#241510]">
      <div className="mx-auto flex max-w-xl items-center gap-1.5">
        <button className="btn bg-cream p-1 text-ink" onClick={onMenu} aria-label={t("menu")}>
          <Home size={16} />
        </button>
        <span className="rounded-md bg-ochre px-1.5 py-0.5 text-xs font-black text-ink" data-testid="hud-age">
          {t("age", { age })}
        </span>
        <div className="flex-1" />
        <button className="btn flex items-center gap-1 bg-cream px-1.5 py-1 text-[11px] text-ink" onClick={onAssumptions} aria-label={t("assumptionsBtn")}>
          <BookOpen size={15} />
          <span className="hidden min-[400px]:inline">{t("assumptionsBtn")}</span>
        </button>
        <button className="btn bg-cream p-1 text-ink" onClick={onSettings} aria-label={t("settings")}>
          <Settings size={16} />
        </button>
      </div>
      <div className="mx-auto mt-1.5 grid max-w-xl grid-cols-[1fr_1fr_auto_1fr] items-stretch gap-1">
        <Meter label={t("wallet")} testid="hud-wallet">
          {rupees(now.wallet)}
          {floats("wallet", (d) => `${d > 0 ? "+" : "−"}${rupees(Math.abs(d))}`)}
        </Meter>
        <Meter label={t("debt")} testid="hud-debt" debt pulseKey={debtPulse}>
          {rupees(now.debt)}
          {floats("debt", (d) => `${d > 0 ? "+" : "−"}${rupees(Math.abs(d))}`)}
        </Meter>
        <Wheel life={life} />
        <Meter label={t("goal")} testid="hud-goal">
          {now.goalPct}%{floats("goalPct", (d) => `${signed(d)}%`)}
        </Meter>
      </div>
      <div className="mx-auto mt-1 grid max-w-xl grid-cols-4 gap-1">
        {METERS.map((m) => (
          <div key={m} className="relative flex items-center justify-center gap-1 rounded-md bg-cream/95 py-0.5 text-[12px] font-extrabold text-ink" title={t(m)} data-testid={`hud-${m}`}>
            <span aria-hidden>{METER_ICON[m]}</span>
            <span className="sr-only">{t(m)}</span>
            <span>{now[m]}</span>
            <span className="h-1.5 w-6 overflow-hidden rounded bg-ink/20" aria-hidden>
              <span className={`block h-full ${now[m] < 30 ? "bg-debt" : "bg-leaf"}`} style={{ width: `${now[m]}%` }} />
            </span>
            {floats(m)}
          </div>
        ))}
      </div>
    </header>
  );
}

function Meter({ label, children, debt = false, pulseKey = 0, testid }) {
  return (
    <div
      key={debt ? pulseKey : undefined}
      className={`relative rounded-md border-2 border-ink px-1.5 py-0.5 ${debt ? "bg-[#ffe1dc] text-debt" : "bg-cream text-ink"} ${debt && pulseKey ? "pulse-debt" : ""}`}
      data-testid={testid}
    >
      <div className="text-[9px] font-bold uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-[13px] font-black leading-tight">{children}</div>
    </div>
  );
}

// Chakravaddi: a water-wheel. Green & clockwise when savings compound,
// red & counter-clockwise when debt compounds. Speed follows the yearly rate.
export function Wheel({ life, size = 40 }) {
  const { t, tokens } = useI18n();
  const w = wheelState(life);
  const against = w.dir < 0;
  const speed = w.rate > 0 ? Math.max(0.6, 24 / w.rate) : 0;
  const color = against ? "#c4161c" : "#3d7a4a";
  const label = `${tokens.wheel}: ${w.dir === 0 ? "—" : `${against ? "−" : "+"}${w.rate}%`} · +${rupees(w.savFlow)} / −${rupees(w.debtFlow)}`;
  return (
    <div className="flex flex-col items-center justify-center rounded-md border-2 border-ink bg-cream px-0.5" title={label} aria-label={label} role="img" data-testid="wheel" data-dir={w.dir}>
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect x="0" y="30" width="40" height="10" fill={against ? "#7a3b2e" : "#8fc7c9"} />
        <g
          className={w.dir ? "wheel-spin" : ""}
          style={{ "--wheel-speed": `${speed}s`, "--wheel-dir": against ? "reverse" : "normal" }}
        >
          <circle cx="20" cy="20" r="14" fill="none" stroke={color} strokeWidth="3" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1="20" y1="6" x2="20" y2="34" stroke={color} strokeWidth="2" transform={`rotate(${a} 20 20)`} />
          ))}
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect key={a} x="17.5" y="2" width="5" height="5" fill={against ? "#241510" : "#e9a53b"} stroke="#241510" strokeWidth="0.8" transform={`rotate(${a} 20 20)`} />
          ))}
        </g>
        <circle cx="20" cy="20" r="3" fill="#241510" />
      </svg>
      <span className="text-[9px] font-black leading-none" style={{ color }}>
        {w.dir === 0 ? "0%" : `${against ? "↺" : "↻"}${w.rate}%`}
      </span>
    </div>
  );
}

// The goal: a house that builds brick by brick. Bricks fall when the fund shrinks.
export function House({ life }) {
  const { t } = useI18n();
  const { goalPct, fund } = hud(life);
  const TOTAL = 24;
  const count = Math.round((goalPct / 100) * TOTAL);
  const prev = useRef(count);
  const [falling, setFalling] = useState([]);
  useEffect(() => {
    if (count < prev.current) {
      const fell = Array.from({ length: prev.current - count }, (_, i) => count + i);
      setFalling(fell);
      const id = setTimeout(() => setFalling([]), 1100);
      prev.current = count;
      return () => clearTimeout(id);
    }
    prev.current = count;
  }, [count]);
  const cols = 3;
  const brick = (i, cls = "") => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return <rect key={`${i}${cls}`} className={cls} x={6 + col * 14 + (row % 2 ? 3 : 0)} y={150 - (row + 1) * 12} width="12" height="10" rx="1" fill="#c8553d" stroke="#241510" strokeWidth="1.5" />;
  };
  const done = goalPct >= 100;
  return (
    <aside className="pointer-events-none fixed bottom-24 right-1 z-10 w-12 sm:right-4 sm:w-20" aria-label={`${t("goal")} ${goalPct}%`} data-testid="house" data-bricks={count}>
      <svg viewBox="0 0 56 190" className="w-full drop-shadow-[2px_2px_0_#241510]">
        <path d="M2 54 28 24 54 54" fill={done ? "#2b3a67" : "none"} stroke="#241510" strokeWidth="2.5" strokeDasharray={done ? "0" : "4 3"} />
        <rect x="4" y="54" width="48" height="96" fill={done ? "#7fb0d6" : "#f7e9cb44"} stroke="#241510" strokeWidth="2" strokeDasharray={done ? "0" : "4 3"} />
        {Array.from({ length: Math.min(count, TOTAL) }, (_, i) => brick(i))}
        {falling.map((i) => brick(i, "brick-fall"))}
        <g transform="translate(14 156)">
          <path d="M4 4h20l3 8-3 14H4L1 12z" fill="#b5652d" stroke="#241510" strokeWidth="2" />
          <rect x="7" y="0" width="14" height="5" fill="#8a4a20" stroke="#241510" strokeWidth="1.5" />
        </g>
      </svg>
      <p className="-mt-1 text-center text-[10px] font-black text-cream drop-shadow-[1px_1px_0_#241510]">{goalPct}%</p>
      <p className="sr-only">{rupees(fund)}</p>
    </aside>
  );
}
