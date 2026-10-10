import { useEffect, useMemo, useRef, useState } from "react";
import { cardById, crossById, msgById, endings, endingById, CFG } from "../engine/data.js";
import { endStats, hud, totalDebt } from "../engine/engine.js";
import { turningPoints, parallelLife, hundredLives } from "../engine/simulate.js";
import { useI18n, rupees } from "../i18n.js";
import { YearPanel, optionLabel } from "./Scroll.jsx";
import { METER_ICON, METERS } from "./bits.jsx";

export function Ending({ life, meta, setMeta, onNewLife, onMenu }) {
  const { t, tx } = useI18n();
  const [stage, setStage] = useState("unroll");
  const [tab, setTab] = useState("review");
  const ending = endingById[life.ending];
  useEffect(() => {
    if (stage !== "unroll") return;
    const id = setTimeout(() => setStage("tale"), 3200);
    return () => clearTimeout(id);
  }, [stage]);

  if (stage === "unroll")
    return (
      <div className="grid min-h-dvh place-items-center bg-red p-4 text-cream" data-testid="unroll">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl" aria-hidden>
            🪕🧔🏽
          </div>
          <p className="mt-2 text-lg font-black">{t("end.unroll")}</p>
          <div className="unroll panel mx-auto mt-3 w-48 py-4 text-ink" style={{ animationDuration: "2.6s" }}>
            <ol className="grid grid-cols-4 gap-1 px-3 text-[11px] font-black">
              {life.years.map((y) => (
                <li key={y.age} className="rounded border border-ink bg-cream">
                  {y.age}
                  <br />
                  {y.events[0] ? cardById[y.events[0].cardId].art : "·"}
                </li>
              ))}
            </ol>
          </div>
          <button className="btn mt-4 bg-gold px-4 py-2 text-ink" onClick={() => setStage("tale")}>
            {t("year.end")}
          </button>
        </div>
      </div>
    );

  const tabs = ["review", "parallel", "letter", "collection"];
  return (
    <div className="min-h-dvh bg-red pb-10" data-testid="ending">
      <div className="ikat" />
      <div className="mx-auto max-w-xl px-3 pt-4 text-cream">
        <article className="rise panel px-4 pt-6 pb-6 text-center text-ink">
          <div className="text-5xl" aria-hidden>
            {ending.art}
          </div>
          <h1 className="mt-1 text-2xl font-black" data-testid="ending-title">
            {tx(ending.title)}
          </h1>
          <p className="mt-2 text-[14px] italic">{tx(ending.tale)}</p>
        </article>
        <Stats life={life} meta={meta} />
        <nav className="mt-3 grid grid-cols-4 gap-1" role="tablist">
          {tabs.map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`btn py-1.5 text-[11px] ${tab === k ? "bg-gold text-ink" : "bg-cream text-ink"}`} onClick={() => setTab(k)}>
              {{ review: t("end.review"), parallel: t("end.parallel"), letter: t("end.letter").split(" ").slice(0, 2).join(" "), collection: t("end.collection") }[k]}
            </button>
          ))}
        </nav>
        <div className="mt-3">
          {tab === "review" && <Review life={life} />}
          {tab === "parallel" && <Parallel life={life} />}
          {tab === "letter" && <Letter life={life} meta={meta} setMeta={setMeta} />}
          {tab === "collection" && <Collection meta={meta} />}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn bg-leaf py-2 text-cream" onClick={onNewLife} data-testid="again">
            {t("end.again")}
          </button>
          <button className="btn bg-cream py-2 text-ink" onClick={onMenu}>
            {t("menu")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stats({ life, meta }) {
  const { t } = useI18n();
  const s = endStats(life);
  return (
    <section className="panel mt-3 px-3 pt-5 pb-5 text-ink" data-testid="end-stats">
      <h2 className="font-black">{t("end.stats")}</h2>
      <ul className="mt-1 space-y-0.5 text-[13px] font-bold">
        <li>{s.goalMet ? `🏡 ${t("end.goalMet", { age: s.goalAge })}` : `🧱 ${t("end.goalNot", { pct: s.goalPct })}`}</li>
        <li>{s.debtFree ? `✅ ${t("end.debtFree")}` : `🌀 ${t("end.inDebt")}`}</li>
        <li>⚖ {t("end.meters", { n: s.metersAboveFloor })}</li>
        <li>🚩 {t("end.scams", { n: s.scamsFlagged })}</li>
        <li>📜 {t("end.collected", { n: meta.endings.length, total: endings.length })}</li>
      </ul>
      <p className="mt-2 text-[11px] italic">{t("end.noRank")}</p>
    </section>
  );
}

export function reviewData(life, t, tx) {
  const luck = [];
  const choices = [];
  const market = [];
  for (const y of life.years) {
    if (y.crossroads) choices.push({ age: y.age, text: `🛤 ${tx(crossById[y.crossroads.id].title)} → ${optionLabel(tx, "crossroads", y.crossroads.id, y.crossroads.optionId)}` });
    for (const e of y.events) {
      const card = cardById[e.cardId];
      const opt = card.options.find((o) => o.id === e.optionId);
      if (card.luck) luck.push({ age: y.age, text: `${card.art} ${tx(card.title)}` });
      if (e.planted || opt.style === "bold" || e.loan) choices.push({ age: y.age, text: `${card.art} ${tx(card.title)} → ${tx(opt.label)}${e.planted ? " 🌱" : ""}` });
    }
    if (y.message) {
      const m = msgById[y.message.msgId];
      choices.push({ age: y.age, text: `📱 ${tx(m.sender)} → ${y.message.verdict === "flag" ? "🚩" : "↩"} ${y.message.correct ? "✓" : "✗"}` });
    }
    for (const a of y.actions) if (["insurance", "sip", "chitti", "loan", "fd", "rd"].includes(a.kind)) choices.push({ age: y.age, text: `${t(`tool.${a.kind}`)}` });
    for (const l of y.luck) if (l.key === "market") market.push({ age: y.age, pct: l.pct });
  }
  if (market.length) {
    const sorted = [...market].sort((a, b) => a.pct - b.pct);
    for (const m of [sorted[0], sorted.at(-1)]) luck.push({ age: m.age, text: `🌳 ${t("lucky.market", { pct: m.pct })}` });
  }
  for (const sd of life.seeds) {
    const src = sd.origin.kind === "crossroads" ? crossById[sd.origin.id] : sd.origin.kind === "message" ? null : cardById[sd.origin.id];
    const name = src ? tx(src.title) : tx(msgById[sd.origin.id].sender);
    if (sd.status === "withered") luck.push({ age: sd.fireAge, text: `🍃 ${name}: ${t("end.withered")}` });
    else if (sd.status === "fired" && src?.options.find((o) => o.id === sd.origin.optionId)?.hidden?.outcomes)
      luck.push({ age: sd.fireAge, text: `🎲 ${t("lucky.seed", { card: name, result: tx(cardById[sd.consequence].title) })}` });
  }
  const byAge = (a, b) => a.age - b.age;
  return { luck: luck.sort(byAge), choices: choices.sort(byAge) };
}

function Review({ life }) {
  const { t, tx } = useI18n();
  const [view, setView] = useState("columns");
  const { luck, choices } = useMemo(() => reviewData(life, t, tx), [life, t, tx]);
  return (
    <section className="panel px-3 pt-5 pb-5 text-ink" data-testid="review">
      <div className="flex gap-1">
        {["columns", "threads"].map((v) => (
          <button key={v} className={`btn px-2 py-1 text-[12px] ${view === v ? "bg-gold" : "bg-cream"}`} onClick={() => setView(v)} aria-pressed={view === v}>
            {v === "columns" ? t("end.columns") : `🌱 ${t("end.threads")}`}
          </button>
        ))}
      </div>
      {view === "columns" ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          {[
            [t("end.luck"), luck, "🎲"],
            [t("end.choices"), choices, "✋"],
          ].map(([title, list, icon]) => (
            <div key={title}>
              <h3 className="border-b-2 border-ink font-black">
                {icon} {title}
              </h3>
              <ul className="mt-1 space-y-1">
                {list.map((x, i) => (
                  <li key={i}>
                    <b>{x.age}</b> {x.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ThreadList life={life} />
      )}
    </section>
  );
}

function ThreadList({ life }) {
  const { t, tx } = useI18n();
  if (!life.seeds.length) return <p className="mt-2 text-[13px]">{t("end.noThreads")}</p>;
  return (
    <ul className="mt-2 space-y-1.5 text-[12px]" data-testid="thread-list">
      {life.seeds.map((sd) => {
        const o = sd.origin;
        const from =
          o.kind === "message"
            ? `📱 ${tx(msgById[o.id].sender)} → ${t("phone.reply")}`
            : `${(o.kind === "crossroads" ? crossById : cardById)[o.id].art} ${tx((o.kind === "crossroads" ? crossById : cardById)[o.id].title)} → ${optionLabel(tx, o.kind === "crossroads" ? "crossroads" : "event", o.id, o.optionId)}`;
        const to = sd.status === "fired" ? `${cardById[sd.consequence].art} ${tx(cardById[sd.consequence].title)} (${sd.fireAge})` : sd.status === "withered" ? t("end.withered") : t("end.pending");
        return (
          <li key={sd.id} className="rounded border-2 border-ink bg-white/70 p-1.5">
            🌱 <b>{sd.age}</b> {from}
            <br />
            <span className="font-bold">⟶ {to}</span>
          </li>
        );
      })}
    </ul>
  );
}

function altLabel(tx, t, point, choice) {
  if (point.kind === "message") return choice === "flag" ? t("phone.flag") : t("phone.reply");
  return optionLabel(tx, point.kind === "crossroads" ? "crossroads" : "event", point.id, choice);
}

function Parallel({ life }) {
  const { t, tx } = useI18n();
  const points = useMemo(() => turningPoints(life), [life]);
  const [sel, setSel] = useState(null);
  const [result, setResult] = useState(null);
  const [hundred, setHundred] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = (point, choice) => {
    setHundred(null);
    setResult({ point, choice, ...parallelLife(life, point, choice) });
  };
  return (
    <section className="panel px-3 pt-5 pb-5 text-ink" data-testid="parallel">
      <h2 className="font-black">{t("end.parallel")}</h2>
      <p className="text-[12px]">{t("end.pickPoint")}</p>
      {!result && (
        <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {points.map((p) => (
            <li key={p.index}>
              <button className={`btn w-full px-2 py-1 text-left text-[12px] ${sel === p ? "bg-gold" : p.risky ? "bg-[#ffe9a8]" : "bg-cream"}`} onClick={() => setSel(p)} data-testid="turning-point">
                <b>{p.age}</b> {p.art} {tx(p.title)} → {altLabel(tx, t, p, p.chosen)}
              </button>
              {sel === p && (
                <div className="mt-1 flex flex-wrap gap-1 pl-4">
                  {p.alternatives.map((alt) => (
                    <button key={alt} className="btn bg-leaf px-2 py-1 text-[12px] text-cream" onClick={() => run(p, alt)} data-testid="alternative">
                      {t("end.instead", { option: altLabel(tx, t, p, alt) })}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && (
        <>
          <button className="btn mt-2 bg-cream px-2 py-1 text-[12px]" onClick={() => setResult(null)}>
            ← {t("back")}
          </button>
          <p className="mt-2 rounded bg-[#fff3a6] px-2 py-1 text-[12px] font-black">{t("end.diverge", { age: result.divergence })}</p>
          <SideBySide a={life} b={result.alt} diverge={result.divergence} labelB={altLabel(tx, t, result.point, result.choice)} />
          <FinalCompare a={life} b={result.alt} />
          <button
            className="btn mt-3 w-full bg-indigo py-2 text-cream"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setHundred(hundredLives(life, result.point, result.choice));
                setBusy(false);
              }, 30);
            }}
            data-testid="run-hundred"
          >
            {busy ? "…" : t("end.hundred")}
          </button>
          {hundred && <HundredBars data={hundred} labelB={altLabel(tx, t, result.point, result.choice)} />}
        </>
      )}
    </section>
  );
}

// Two scrolls, scrolled together; the year the lives split is highlighted yellow.
function SideBySide({ a, b, diverge, labelB }) {
  const { t } = useI18n();
  const left = useRef(null);
  const right = useRef(null);
  const lock = useRef(false);
  const sync = (from, to) => () => {
    if (lock.current) return;
    lock.current = true;
    const f = from.current;
    const ratio = f.scrollTop / Math.max(1, f.scrollHeight - f.clientHeight);
    to.current.scrollTop = ratio * (to.current.scrollHeight - to.current.clientHeight);
    requestAnimationFrame(() => (lock.current = false));
  };
  const col = (life, ref, other, title, id) => (
    <div className="min-w-0">
      <h3 className="truncate text-[11px] font-black">{title}</h3>
      <div ref={ref} onScroll={sync(ref, other)} className="mt-1 h-[55dvh] space-y-1.5 overflow-y-auto rounded border-2 border-ink bg-red p-1" data-testid={`scroll-${id}`}>
        {life.years.map((y) => (
          <YearPanel key={y.age} year={y} compact highlight={y.age === diverge} testid={`${id}-year-${y.age}`} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {col(a, left, right, t("end.you"), "mine")}
      {col(b, right, left, `${t("end.other")}: ${labelB}`, "other")}
    </div>
  );
}

function FinalCompare({ a, b }) {
  const { t, tx } = useI18n();
  const ha = hud(a);
  const hb = hud(b);
  const rows = [
    ["🏡", t("goal"), `${ha.goalPct}%`, `${hb.goalPct}%`],
    ["🌀", t("debt"), rupees(totalDebt(a)), rupees(totalDebt(b))],
    ...METERS.map((m) => [METER_ICON[m], t(m), ha[m], hb[m]]),
  ];
  return (
    <table className="mt-2 w-full text-[12px]" data-testid="final-compare">
      <caption className="text-left font-black">{t("end.final")}</caption>
      <thead>
        <tr>
          <th />
          <th className="text-right">{t("end.you")}</th>
          <th className="text-right">{t("end.other")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([icon, name, x, y]) => (
          <tr key={name} className="border-t border-ink/30">
            <td>
              {icon} {name}
            </td>
            <td className="text-right font-bold">{x}</td>
            <td className="text-right font-bold">{y}</td>
          </tr>
        ))}
        <tr className="border-t border-ink/30">
          <td>📜</td>
          <td className="text-right text-[11px]">{tx(endingById[a.ending].title)}</td>
          <td className="text-right text-[11px]">{tx(endingById[b.ending].title)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function HundredBars({ data, labelB }) {
  const { t } = useI18n();
  const bar = (s, label, color) => (
    <div className="mt-2">
      <div className="flex justify-between text-[12px] font-bold">
        <span>{label}</span>
        <span>{t("end.metIn", { n: s.met })}</span>
      </div>
      <div className="relative mt-0.5 h-6 rounded border-2 border-ink bg-white" role="img" aria-label={`${label}: ${Math.round(s.p10)}–${Math.round(s.p90)}%, ${t("end.metIn", { n: s.met })}`}>
        <div className="absolute inset-y-0 opacity-25" style={{ left: `${s.min}%`, width: `${Math.max(1, s.max - s.min)}%`, background: color }} />
        <div className="absolute inset-y-1 rounded" style={{ left: `${s.p10}%`, width: `${Math.max(1.5, s.p90 - s.p10)}%`, background: color }} />
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-gold" style={{ left: `${s.median}%` }} />
        <div className="absolute inset-y-0 right-0 border-l-2 border-dashed border-ink" title="100%" />
      </div>
    </div>
  );
  return (
    <div className="mt-3 rounded-lg border-2 border-ink bg-paper p-2" data-testid="hundred">
      <p className="text-[12px]">{t("end.hundredHelp")}</p>
      {bar(data.mine, t("end.you"), "#3d7a4a")}
      {bar(data.other, `${t("end.other")}: ${labelB}`, "#2b3a67")}
      <div className="mt-1 flex justify-between text-[10px] font-bold">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function Letter({ life, meta, setMeta }) {
  const { t, tx } = useI18n();
  const existing = meta.letters.find((l) => l.seed === life.seed);
  const [text, setText] = useState(existing?.text || "");
  const [saved, setSaved] = useState(Boolean(existing));
  const save = () => {
    const letter = { seed: life.seed, ending: life.ending, text: text.trim(), date: new Date().toISOString().slice(0, 10) };
    setMeta((m) => ({ ...m, letters: [...m.letters.filter((l) => l.seed !== life.seed), letter] }));
    setSaved(true);
  };
  const exportSummary = () => {
    const s = endStats(life);
    const lines = [
      "LAKSHYAM — TEACHER SUMMARY (mock export)",
      `Life seed: ${life.seed}`,
      `Ending: ${endingById[life.ending].title.en}`,
      `House goal met: ${s.goalMet ? `yes, at ${s.goalAge}` : `no (${s.goalPct}%)`}`,
      `Debt-free: ${s.debtFree ? "yes" : "no"}`,
      `Meters above floor: ${s.metersAboveFloor}/4`,
      `Scams flagged: ${s.scamsFlagged} · fallen for: ${s.scamsFallen}`,
      `Gyaan lessons: ${life.lessons}`,
      `Crossroads: ${Object.entries(life.crossroads).map(([id, o]) => `${crossById[id].title.en} → ${optionLabel((x) => x?.en, "crossroads", id, o)}`).join("; ")}`,
      `Threads: ${life.seeds.map((sd) => `${sd.age}→${sd.status}`).join(", ") || "none"}`,
      "",
      "Letter to my 17-year-old self:",
      text.trim() || "(not written)",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lakshyam-summary-${life.seed}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <section className="panel px-3 pt-5 pb-5 text-ink" data-testid="letter">
      <h2 className="font-black">✉ {t("end.letter")}</h2>
      <p className="text-[12px]">{t("end.letterHelp")}</p>
      <textarea
        rows={2}
        maxLength={240}
        value={text}
        onChange={(e) => {
          setText(e.target.value.split("\n").slice(0, 2).join("\n"));
          setSaved(false);
        }}
        className="mt-2 w-full rounded-lg border-2 border-ink bg-white p-2 text-[14px]"
        aria-label={t("end.letter")}
        placeholder={tx(endingById[life.ending].title)}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn bg-leaf py-2 text-cream" onClick={save} disabled={!text.trim()}>
          {saved ? t("end.saved") : t("end.save")}
        </button>
        <button className="btn bg-cream py-2 text-[12px]" onClick={exportSummary} data-testid="teacher-export">
          {t("end.teacher")}
        </button>
      </div>
    </section>
  );
}

export function Collection({ meta }) {
  const { t, tx } = useI18n();
  return (
    <section className="panel px-3 pt-5 pb-5 text-ink" data-testid="collection">
      <h2 className="font-black">{t("end.collected", { n: meta.endings.length, total: endings.length })}</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {endings.map((e) => {
          const got = meta.endings.includes(e.id);
          return (
            <li key={e.id} className={`rounded-lg border-2 border-ink p-2 text-center ${got ? "bg-ochre" : "bg-ink/10"}`}>
              <div className="text-2xl" aria-hidden>
                {got ? e.art : "❔"}
              </div>
              <div className="text-[12px] font-black">{got ? tx(e.title) : t("end.locked")}</div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] italic">{t("end.noRank")}</p>
    </section>
  );
}
