import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Brain, Link2, PiggyBank } from "lucide-react";
import { useT, formatMoney } from "../../i18n/index.jsx";
import { sounds } from "../sound.js";
import { SWIPE_CONFIG as C } from "./swipeBazaarConfig.js";

// Swipe Bazaar (lesson: peer pressure & borrowing). Things are tossed up from the bazaar in waves. Swiping one
// BUYS or ACCEPTS it; letting it fall means saying NO. Six months, a fixed income each month.
// Needs should be paid, wants cost money now, "pay later" items chain an EMI to your wallet,
// loan apps hand you cash and then come after you, and savings coins build a combo.
//
// Arcade contract: <SwipeBazaar running onEnd />. onEnd(state) gets
// { id: "swipeBazaar", score, saved, extraPaid, needsMissed, emisLeft }.

const FW = 640;
const FH = 360;
const R = { need: 30, want: 30, emi: 44, loan: 34, coin: 22 };
const money = formatMoney;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const lerp = (a, b, k) => a + (b - a) * k;

// What an item really costs, for "Think first" and for the summaries.
function trueCost(item) {
  const d = item.def;
  if (item.kind === "emi") return { now: 0, total: d.monthly * d.months, sticker: d.price };
  if (item.kind === "loan") return { get: d.cash - d.hiddenFee, total: d.monthly * d.months };
  return { now: d.price ?? d.amount, total: d.price ?? d.amount };
}

// Distance from point p to the segment a–b.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}

// ---------- how-to-play (the arcade's intro card) ----------
export function SwipeBazaarIntro({ best, startRef, onStart }) {
  const { t } = useT();
  const rows = [
    ["need", "🍚", C.needs.map((n) => n.icon).join(" ")],
    ["want", "👟", C.wants.map((n) => n.icon).join(" ")],
    ["emi", "📱", C.emiItems.map((n) => n.icon).join(" ")],
    ["loan", "⚠️", "💸"],
    ["coin", "🪙", "🪙"],
  ];
  return (
    <div className="swipe-intro">
      <p className="swipe-lead">{t("arcade.swipe.intro.lead", { income: money(C.income), months: C.rounds })}</p>
      <ul className="swipe-legend">
        {rows.map(([k, icon, examples]) => (
          <li key={k} className={`kind-${k}`}>
            <span className="swipe-badge" aria-hidden="true">{icon}</span>
            <span>
              <b>{t(`arcade.swipe.intro.${k}.name`)}</b> <small aria-hidden="true">{examples}</small>
              <br />
              {t(`arcade.swipe.intro.${k}.what`)}
            </span>
          </li>
        ))}
      </ul>
      <p className="swipe-tip">
        <Brain size={18} aria-hidden="true" /> {t("arcade.swipe.intro.think", { n: C.thinkUses })}
      </p>
      <p className="swipe-tip">{t("arcade.swipe.intro.controls")}</p>
      {best > 0 && <p className="quiet">{t("arcade.best", { score: money(best) })}</p>}
      <button ref={startRef} className="primary-button big" onClick={onStart}>
        {t("arcade.swipe.intro.start")} <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ---------- the game ----------
export function SwipeBazaar({ running, onEnd }) {
  const { t } = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const runningRef = useRef(running);
  runningRef.current = running;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const canvasRef = useRef(null);
  const game = useRef(null);
  const [hud, setHud] = useState(null);
  const [screen, setScreen] = useState({ kind: "play" }); // play | month | final

  // One month's bookkeeping.
  const freshLog = () => ({ bought: [], paidNeeds: 0, paidWants: 0, emiPaid: 0, fees: 0, saved: 0, needsPaid: 0, needsMissed: 0, saidNo: 0, extraCommitted: 0, loanCash: 0 });

  useEffect(() => {
    const tr = (k, v) => tRef.current(`arcade.swipe.${k}`, v);
    const g = {
      month: 0,
      phase: "play", // play | summary | over
      time: 0,
      cash: 0,
      savings: 0,
      status: 20,
      emis: [], // { id, kind, icon, monthly, monthsLeft, overdue, sticker, total, paid }
      fines: 0,
      items: [],
      halves: [],
      sparks: [],
      floats: [], // floating texts on the field
      threats: [], // loan-app threat popups
      trail: [],
      needQueue: [],
      waveNo: 0, // waves tossed so far this game (drives difficulty)
      wave: null, // { id, t, queue: [toss…], lastAt }
      gapLeft: 1, // seconds until the next wave
      thinkLeft: C.thinkUses,
      thinkT: 0,
      shake: 0,
      combo: 0,
      bestCombo: 0,
      log: freshLog(),
      months: [],
      totals: { extraPaid: 0, interestPaid: 0, lateFees: 0, fines: 0, needsMissed: 0, needsPaid: 0, wants: 0, emiBought: [], loans: 0, loanRepaid: 0, saidNo: 0 },
      startNotes: [],
    };
    game.current = g;

    const float = (text, x, y, color = "#2b2238") => g.floats.push({ text, x, y, color, t: 0 });

    // Start of a month: pay day, then EMIs, loan repayments and last month's fines.
    const startMonth = () => {
      g.month += 1;
      g.time = 0;
      g.phase = "play";
      g.log = freshLog();
      g.items = [];
      g.halves = [];
      g.threats = [];
      g.startNotes = [];
      g.cash += C.income;
      if (g.fines > 0) {
        const pay = Math.min(g.cash, g.fines);
        g.cash -= pay;
        g.log.fees += pay;
        g.totals.fines += pay;
        g.startNotes.push({ tone: "bad", text: tr("note.fine", { amount: money(pay) }) });
        g.fines -= pay;
      }
      for (const e of g.emis) {
        const due = e.monthly + e.overdue;
        const pay = Math.min(g.cash, due);
        g.cash -= pay;
        e.paid += pay;
        g.log.emiPaid += pay;
        if (e.kind === "loan") g.totals.loanRepaid += pay;
        const unpaid = due - pay;
        const lateFee = unpaid > 0 ? (e.kind === "loan" ? C.loanApp.lateFee : C.lateFee) : 0;
        e.overdue = unpaid + lateFee;
        e.monthsLeft = Math.max(0, e.monthsLeft - 1);
        if (lateFee) {
          g.totals.lateFees += lateFee;
          g.log.fees += lateFee;
          g.startNotes.push({ tone: "bad", text: tr("note.late", { item: tr(`items.${e.id}`), fee: money(lateFee) }) });
          if (e.kind === "loan") g.shake = 0.5;
        }
      }
      g.emis = g.emis.filter((e) => e.monthsLeft > 0 || e.overdue > 0);
      // Needs fly at spread-out moments during the month.
      const slot = (C.monthSeconds - 6) / C.needs.length;
      g.needQueue = [...C.needs].sort(() => Math.random() - 0.5).map((d, i) => ({ d, at: 1.5 + slot * (i + Math.random() * 0.7) }));
      g.wave = null;
      g.gapLeft = 0.9;
      if (g.emis.some((e) => e.kind === "loan")) g.nextThreat = 2 + Math.random() * 3;
      else g.nextThreat = Infinity;
    };

    // Toss one item from the bottom so it peaks at `apex` (share of the field from the top).
    const launch = (kind, def, x, vx, apex, waveId) => {
      const r = R[kind];
      const startY = FH + r;
      const vy = -Math.sqrt(2 * C.gravity * (startY - FH * apex));
      const air = (2 * -vy) / C.gravity;
      // Keep the whole arc on screen.
      const land = x + vx * air;
      if (land < r + 10 || land > FW - r - 10) vx = (Math.max(r + 10, Math.min(FW - r - 10, land)) - x) / air;
      const it = { kind, def, x, y: startY, vx, vy, r, spin: (Math.random() - 0.5) * 2.4, rot: 0, wave: waveId };
      // At most one friend pushes per wave, so big waves stay readable.
      const pushed = g.items.some((o) => o.wave === waveId && o.bubble);
      if (!pushed && (kind === "want" || kind === "emi" || kind === "loan") && Math.random() < C.friendBubbleChance) {
        const lines = tRef.current("arcade.swipe.friends");
        it.bubble = Array.isArray(lines) ? pick(lines) : String(lines);
      }
      g.items.push(it);
    };

    // ---------- waves ----------
    const W = C.waves;
    const rand = (a, b) => a + Math.random() * (b - a);
    const progress = () => Math.min(1, g.waveNo / W.rampWaves);
    const apexAt = () => rand(C.apex[0], C.apex[1]);

    // Later patterns unlock as the game goes on, and become more common.
    const pickPattern = (p) => {
      const open = Object.entries(W.patterns).filter(([, at]) => p >= at);
      const weights = open.map(([name, at]) => (name === "single" ? Math.max(0.12, 1 - p * 1.6) : 0.5 + (p - at) * 2.5));
      let r = Math.random() * weights.reduce((a, w) => a + w, 0);
      for (let i = 0; i < open.length; i++) if ((r -= weights[i]) <= 0) return open[i][0];
      return open[open.length - 1][0];
    };

    // What flies in a wave: any due need, maybe a hidden trap, the rest wants and savings coins.
    const waveItems = (n, p) => {
      const out = [];
      const due = g.needQueue.find((q) => !q.done && g.time >= q.at);
      if (due) {
        due.done = true;
        out.push(["need", due.d]);
      }
      if (Math.random() < lerp(W.trapChance[0], W.trapChance[1], p)) {
        const traps = n >= 5 && Math.random() < p ? 2 : 1;
        for (let i = 0; i < traps && out.length < n; i++) out.push(Math.random() < C.mix.emiTrap ? ["emi", pick(C.emiItems)] : ["loan", C.loanApp]);
      }
      while (out.length < n) out.push(Math.random() < C.mix.want ? ["want", pick(C.wants)] : ["coin", C.coin]);
      return out.sort(() => Math.random() - 0.5);
    };

    const startWave = () => {
      g.waveNo += 1;
      const p = progress();
      const pattern = pickPattern(p);
      const most = Math.max(3, Math.round(lerp(W.size[0], W.size[1], p)));
      const n = pattern === "single" ? 1 : pattern === "pair" ? 2 : 3 + Math.floor(Math.random() * (most - 2));
      const items = waveItems(n, p);
      const tosses = [];
      const add = (i, delay, x, vx, apex = apexAt()) => tosses.push({ at: delay, kind: items[i][0], def: items[i][1], x, vx, apex });
      if (pattern === "single") {
        const x = rand(140, FW - 140);
        add(0, 0, x, (FW / 2 - x) * rand(0.15, 0.4));
      } else if (pattern === "pair") {
        const x1 = rand(110, FW / 2 - 50);
        const x2 = rand(FW / 2 + 50, FW - 110);
        add(0, 0, x1, rand(10, 60));
        add(1, rand(0, 0.12), x2, -rand(10, 60));
      } else if (pattern === "clump") {
        // A bunch from one spot, spreading a little.
        const x0 = rand(170, FW - 170);
        items.forEach((_, i) => add(i, i * 0.09, x0 + rand(-40, 40), lerp(-110, 110, n === 1 ? 0.5 : i / (n - 1)) + rand(-20, 20) + (FW / 2 - x0) * 0.2, apexAt()));
      } else if (pattern === "fan") {
        // Thrown together from the middle, fanning out left to right.
        const x0 = FW / 2 + rand(-60, 60);
        const apex = apexAt();
        items.forEach((_, i) => add(i, 0, x0 + rand(-10, 10), lerp(-180, 180, n === 1 ? 0.5 : i / (n - 1)), apex + rand(-0.04, 0.04)));
      } else if (pattern === "stream") {
        // One after another, sweeping across from one side.
        const dir = Math.random() < 0.5 ? 1 : -1;
        const every = lerp(W.streamEvery[0], W.streamEvery[1], p);
        items.forEach((_, i) => {
          const x = dir > 0 ? 90 + i * 70 : FW - 90 - i * 70;
          add(i, i * every, Math.max(60, Math.min(FW - 60, x)), dir * rand(50, 110));
        });
      } else {
        // Crossing throws from both bottom corners.
        items.forEach((_, i) => {
          const left = i % 2 === 0;
          add(i, Math.floor(i / 2) * 0.12, left ? rand(50, 110) : rand(FW - 110, FW - 50), (left ? 1 : -1) * rand(170, 240), apexAt());
        });
      }
      g.wave = { id: g.waveNo, t: 0, queue: tosses.sort((a, b) => a.at - b.at), lastAt: Math.max(...tosses.map((x) => x.at)) };
    };

    // Toss what's due in the current wave; start the next once the screen clears.
    const runWaves = (dt) => {
      if (g.wave) {
        g.wave.t += dt;
        while (g.wave.queue.length && g.wave.queue[0].at <= g.wave.t) {
          const q = g.wave.queue.shift();
          launch(q.kind, q.def, q.x, q.vx, q.apex, g.wave.id);
        }
        const up = g.items.some((it) => it.wave === g.wave.id && !it.sliced && !it.gone);
        const overdue = g.wave.t > g.wave.lastAt + W.maxWait;
        if (!g.wave.queue.length && (!up || overdue)) {
          g.wave = null;
          g.gapLeft = lerp(W.gap[0], W.gap[1], progress());
        }
      } else if (g.time < C.monthSeconds - 2.5) {
        // No new waves in the last moments of a month, so it ends cleanly.
        g.gapLeft -= dt;
        if (g.gapLeft <= 0) startWave();
      }
    };

    // Swiping an item: buy it, accept it, or save.
    const slice = (it, angle) => {
      it.sliced = true;
      const d = it.def;
      const name = it.kind === "loan" ? tr("items.loan") : it.kind === "coin" ? "" : tr(`items.${d.id}`);
      if (it.kind === "need") {
        if (g.cash >= d.price) {
          g.cash -= d.price;
          g.log.paidNeeds += d.price;
          g.log.needsPaid += 1;
          g.totals.needsPaid += 1;
          float(tr("float.paid", { amount: money(d.price) }), it.x, it.y, "#23784a");
          sounds.coin?.();
        } else {
          it.missed = true;
          g.log.needsMissed += 1;
          g.totals.needsMissed += 1;
          g.fines += C.needFine;
          float(tr("float.cantAfford"), it.x, it.y, "#b4372f");
          sounds.thud?.();
        }
      } else if (it.kind === "want") {
        if (g.cash >= d.price) {
          g.cash -= d.price;
          g.status = Math.min(100, g.status + d.status);
          g.log.paidWants += d.price;
          g.log.bought.push({ icon: d.icon, name, price: d.price });
          g.totals.wants += d.price;
          g.combo = 0;
          float(`−${money(d.price)}`, it.x, it.y, "#d66a12");
          sounds.spend?.();
        } else {
          float(tr("float.cantAfford"), it.x, it.y, "#b4372f");
          sounds.thud?.();
        }
      } else if (it.kind === "emi") {
        const total = d.monthly * d.months;
        g.emis.push({ id: d.id, kind: "emi", icon: d.icon, monthly: d.monthly, monthsLeft: d.months, overdue: 0, sticker: d.price, total, paid: 0 });
        g.status = Math.min(100, g.status + d.status);
        g.log.bought.push({ icon: d.icon, name, price: 0, emi: d.monthly, months: d.months });
        g.log.extraCommitted += total - d.price;
        g.totals.extraPaid += total - d.price;
        g.totals.emiBought.push({ id: d.id, name, sticker: d.price, total, month: g.month });
        g.combo = 0;
        float(tr("float.emi", { amount: money(d.monthly) }), it.x, it.y, "#7a55c4");
        sounds.page?.();
        for (let i = 0; i < 6; i++) g.sparks.push({ x: it.x, y: it.y, vx: Math.cos(i) * 140, vy: Math.sin(i) * 140, t: 0, c: "#ffd23f" });
      } else if (it.kind === "loan") {
        const got = d.cash - d.hiddenFee;
        g.cash += got;
        g.emis.push({ id: "loan", kind: "loan", icon: "💸", monthly: d.monthly, monthsLeft: d.months, overdue: 0, sticker: d.cash, total: d.monthly * d.months, paid: 0 });
        g.status = Math.min(100, g.status + d.status);
        g.log.loanCash += got;
        g.log.bought.push({ icon: "💸", name, price: 0, emi: d.monthly, months: d.months, loan: true });
        g.log.extraCommitted += d.monthly * d.months - got;
        g.totals.extraPaid += d.monthly * d.months - got;
        g.totals.loans += 1;
        g.combo = 0;
        g.shake = 0.6;
        float(tr("float.loan", { got: money(got), fee: money(d.hiddenFee) }), it.x, it.y, "#b4372f");
        sounds.thud?.();
        g.nextThreat = Math.min(g.nextThreat, 1.5);
      } else if (it.kind === "coin") {
        if (g.cash >= d.amount) {
          g.cash -= d.amount;
          g.savings += d.amount;
          g.log.saved += d.amount;
          g.combo += 1;
          g.bestCombo = Math.max(g.bestCombo, g.combo);
          let text = tr("float.saved", { amount: money(d.amount) });
          if (g.combo % d.comboBonusEvery === 0) {
            g.savings += d.comboBonus;
            g.log.saved += d.comboBonus;
            text = tr("float.combo", { n: g.combo, bonus: money(d.comboBonus) });
            sounds.chime?.();
          } else sounds.coin?.();
          float(text, it.x, it.y, "#0a8fa3");
          for (let i = 0; i < 8; i++) g.sparks.push({ x: it.x, y: it.y, vx: Math.cos((i / 8) * Math.PI * 2) * 120, vy: Math.sin((i / 8) * Math.PI * 2) * 120, t: 0, c: i % 2 ? "#ffd23f" : "#fff6b0" });
        } else {
          float(tr("float.noCash"), it.x, it.y, "#b4372f");
        }
      }
      // Two halves fly apart along the cut.
      const nx = Math.cos(angle + Math.PI / 2);
      const ny = Math.sin(angle + Math.PI / 2);
      for (const s of [-1, 1]) g.halves.push({ kind: it.kind, def: it.def, x: it.x, y: it.y, vx: it.vx + nx * 90 * s, vy: Math.min(it.vy, -80) + ny * 90 * s, r: it.r, side: s, angle, rot: 0, t: 0 });
    };

    // Something reached the ground un-swiped: that's a "no".
    const fell = (it) => {
      if (it.kind === "need") {
        g.log.needsMissed += 1;
        g.totals.needsMissed += 1;
        g.fines += C.needFine;
        float(tr("float.needMissed", { item: tr(`items.${it.def.id}`) }), it.x, FH - 30, "#b4372f");
      } else if (it.kind !== "coin") {
        g.log.saidNo += 1;
        g.totals.saidNo += 1;
        float(tr("float.saidNo"), it.x, FH - 30, "#23784a");
      }
    };

    const endMonth = () => {
      // Needs still in the air when the month ends count as unpaid.
      for (const it of g.items) if (!it.sliced && it.kind === "need") fell(it);
      g.items = [];
      g.phase = "summary";
      const owedMonthly = g.emis.reduce((a, e) => a + e.monthly, 0);
      const overdue = g.emis.reduce((a, e) => a + e.overdue, 0);
      const report = {
        month: g.month,
        log: g.log,
        cash: g.cash,
        savings: g.savings,
        status: Math.round(g.status),
        emis: g.emis.map((e) => ({ ...e })),
        owedMonthly,
        overdue,
        fines: g.fines,
        nextLeft: C.income - owedMonthly - overdue - g.fines,
        needsTotal: C.needs.reduce((a, n) => a + n.price, 0),
        last: g.month >= C.rounds,
      };
      g.months.push(report);
      if (report.last) {
        g.phase = "over";
        setScreen({ kind: "final", report: finalReport() });
      } else setScreen({ kind: "month", report });
    };

    const finalReport = () => {
      const owed = g.emis.reduce((a, e) => a + e.monthsLeft * e.monthly + e.overdue, 0);
      const score = Math.max(0, Math.round(g.savings + g.cash - owed - g.fines));
      const T = g.totals;
      const biggest = [...T.emiBought].sort((a, b) => b.total - b.sticker - (a.total - a.sticker))[0];
      let takeaway;
      if (biggest) takeaway = tr("take.emi", { extra: money(biggest.total - biggest.sticker), item: biggest.name.toLowerCase() });
      else if (T.loans) takeaway = tr("take.loan", { got: money(C.loanApp.cash - C.loanApp.hiddenFee), repay: money(C.loanApp.monthly * C.loanApp.months) });
      else if (T.needsMissed >= 2) takeaway = tr("take.needs", { n: T.needsMissed });
      else if (g.savings >= C.income) takeaway = tr("take.saver", { amount: money(g.savings), no: T.saidNo });
      else takeaway = tr("take.default");
      return {
        score,
        saved: Math.round(g.savings),
        cash: Math.round(g.cash),
        owed,
        extraPaid: Math.round(T.extraPaid),
        lateFees: T.lateFees + T.fines,
        needsMissed: T.needsMissed,
        needsPaid: T.needsPaid,
        wants: T.wants,
        emisLeft: g.emis.length,
        status: Math.round(g.status),
        bestCombo: g.bestCombo,
        saidNo: T.saidNo,
        takeaway,
      };
    };
    g.finalReport = finalReport;
    g.startMonth = startMonth;

    // ---------- input: swipe (mouse drag or touch) to slice ----------
    const canvas = canvasRef.current;
    const toField = (e) => {
      const b = canvas.getBoundingClientRect();
      return { x: ((e.clientX - b.left) / b.width) * FW, y: ((e.clientY - b.top) / b.height) * FH };
    };
    let down = false;
    let last = null;
    const cut = (a, b) => {
      if (g.phase !== "play" || !runningRef.current) return;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (const it of g.items) if (!it.sliced && segDist(it.x, it.y, a.x, a.y, b.x, b.y) < it.r) slice(it, angle);
    };
    const onDown = (e) => {
      down = true;
      last = toField(e);
      canvas.setPointerCapture?.(e.pointerId);
      g.trail.push({ ...last, t: 0 });
      // A tap right on an item also counts (easier on small screens).
      cut({ x: last.x - 1, y: last.y - 1 }, { x: last.x + 1, y: last.y + 1 });
    };
    const onMove = (e) => {
      if (!down) return;
      const p = toField(e);
      if (last && Math.hypot(p.x - last.x, p.y - last.y) > 2) {
        cut(last, p);
        g.trail.push({ ...p, t: 0 });
        if (g.trail.length > 14) g.trail.shift();
        last = p;
      }
    };
    const onUp = () => {
      down = false;
      last = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    // ---------- loop ----------
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = FW * dpr;
    canvas.height = FH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    startMonth();
    let raf;
    let prev = performance.now();
    let hudTick = 0;

    const frame = (now) => {
      const realDt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const live = runningRef.current && g.phase === "play";
      if (g.thinkT > 0 && live) g.thinkT = Math.max(0, g.thinkT - realDt);
      const dt = live ? realDt * (g.thinkT > 0 ? C.thinkSlowdown : 1) : 0;

      if (live) {
        g.time += realDt; // the month clock runs at real speed; only the items slow down
        g.status = Math.max(0, g.status - C.statusDrain * realDt);
        runWaves(dt);
        g.nextThreat -= realDt;
        if (g.nextThreat <= 0 && g.emis.some((e) => e.kind === "loan")) {
          const lines = tRef.current("arcade.swipe.threats");
          g.threats.push({ text: Array.isArray(lines) ? pick(lines) : String(lines), x: 80 + Math.random() * (FW - 360), y: 40 + Math.random() * (FH - 140), t: 0 });
          g.shake = 0.35;
          sounds.thud?.();
          g.nextThreat = 4 + Math.random() * 4;
        }
        if (g.time >= C.monthSeconds) endMonth();
      }

      for (const it of g.items) {
        it.vy += C.gravity * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        if (!it.sliced && it.vy > 0 && it.y - it.r > FH) {
          it.gone = true;
          fell(it);
        }
      }
      g.items = g.items.filter((it) => !it.sliced && !it.gone);
      for (const h of g.halves) {
        h.vy += C.gravity * (dt || realDt * 0.4);
        h.x += h.vx * (dt || realDt * 0.4);
        h.y += h.vy * (dt || realDt * 0.4);
        h.rot += h.side * 3 * realDt;
        h.t += realDt;
      }
      g.halves = g.halves.filter((h) => h.t < 1.2 && h.y < FH + 60);
      for (const s of g.sparks) {
        s.x += s.vx * realDt;
        s.y += s.vy * realDt;
        s.t += realDt;
      }
      g.sparks = g.sparks.filter((s) => s.t < 0.5);
      for (const f of g.floats) f.t += realDt;
      g.floats = g.floats.filter((f) => f.t < 1.3);
      for (const th of g.threats) th.t += realDt;
      g.threats = g.threats.filter((th) => th.t < 2.8);
      for (const p of g.trail) p.t += realDt;
      g.trail = g.trail.filter((p) => p.t < 0.16);
      g.shake = Math.max(0, g.shake - realDt);

      draw(ctx, g, now, tRef.current);

      hudTick += realDt;
      if (hudTick > 0.1) {
        hudTick = 0;
        setHud({
          month: g.month,
          left: Math.max(0, C.monthSeconds - g.time),
          cash: Math.round(g.cash),
          savings: Math.round(g.savings),
          status: g.status,
          emis: g.emis.map((e) => ({ id: e.id, icon: e.icon, monthly: e.monthly, overdue: e.overdue, kind: e.kind })),
          thinkLeft: g.thinkLeft,
          thinking: g.thinkT > 0,
          combo: g.combo,
          notes: g.startNotes,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e) => {
      if ((e.key === "t" || e.key === "T" || e.key === " ") && g.phase === "play") {
        e.preventDefault();
        think();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const think = () => {
    const g = game.current;
    if (!g || g.phase !== "play" || !runningRef.current || g.thinkLeft <= 0 || g.thinkT > 0) return;
    g.thinkLeft -= 1;
    g.thinkT = C.thinkSeconds;
    sounds.ripple?.();
  };

  const nextMonth = () => {
    game.current.startMonth();
    setScreen({ kind: "play" });
  };

  const tr = (k, v) => t(`arcade.swipe.${k}`, v);
  const h = hud ?? { month: 1, left: C.monthSeconds, cash: C.income, savings: 0, status: 20, emis: [], thinkLeft: C.thinkUses, thinking: false, combo: 0, notes: [] };
  const emiTotal = h.emis.reduce((a, e) => a + e.monthly, 0);
  return (
    <div className="arcade-field swipe-field">
      <div className="swipe-hud">
        <span className="swipe-month">
          <b>{tr("hud.month", { n: h.month, total: C.rounds })}</b>
          <span className="arcade-timer">
            <i style={{ width: `${(h.left / C.monthSeconds) * 100}%` }} />
          </span>
        </span>
        <span className={`swipe-wallet${h.emis.length ? " chained" : ""}`} title={tr("hud.wallet")}>
          <b>👛 {money(h.cash)}</b>
          {h.emis.length > 0 && (
            <small className="swipe-chains">
              {Object.values(
                h.emis.reduce((acc, e) => {
                  const k = acc[e.id] ?? (acc[e.id] = { id: e.id, icon: e.icon, n: 0, late: false });
                  k.n += 1;
                  k.late ||= e.overdue > 0;
                  return acc;
                }, {}),
              ).map((e) => (
                <span key={e.id} className={e.late ? "late" : ""} title={tr(`items.${e.id}`)}>
                  <Link2 size={13} aria-hidden="true" />
                  {e.icon}
                  {e.n > 1 && `×${e.n}`}
                </span>
              ))}
              <em>{tr("hud.emis", { amount: money(emiTotal) })}</em>
            </small>
          )}
        </span>
        <span className="swipe-savings" title={tr("hud.savings")}>
          <PiggyBank size={16} aria-hidden="true" /> {money(h.savings)}
          {h.combo >= 2 && <em className="swipe-combo">×{h.combo}</em>}
        </span>
        <span className="swipe-status" title={tr("hud.statusHint")}>
          <small>{tr("hud.status")}</small>
          <span className="swipe-status-bar">
            <i style={{ width: `${h.status}%` }} />
          </span>
        </span>
        <button type="button" className={`secondary-button swipe-think${h.thinking ? " on" : ""}`} onClick={think} disabled={h.thinkLeft <= 0 || h.thinking}>
          <Brain size={16} aria-hidden="true" /> {tr("hud.think", { n: h.thinkLeft })}
        </button>
      </div>

      <div className="swipe-stage">
        <canvas ref={canvasRef} className="swipe-canvas" aria-label={t("arcade.games.swipeBazaar.how")} />
        {screen.kind === "play" && h.notes.length > 0 && h.left > C.monthSeconds - 4 && (
          <ul className="swipe-notes" aria-live="polite">
            {h.notes.map((n, i) => (
              <li key={i} className={n.tone}>
                {n.text}
              </li>
            ))}
          </ul>
        )}
        {screen.kind === "month" && <MonthSummary r={screen.report} onNext={nextMonth} />}
        {screen.kind === "final" && <FinalSummary r={screen.report} onDone={() => onEndRef.current({ id: "swipeBazaar", ...screen.report })} />}
      </div>
    </div>
  );
}

// ---------- summaries ----------
function MonthSummary({ r, onNext }) {
  const { t } = useT();
  const tr = (k, v) => t(`arcade.swipe.${k}`, v);
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), []);
  const L = r.log;
  const paid = L.paidNeeds + L.paidWants + L.emiPaid + L.fees;
  return (
    <div className="swipe-summary" role="dialog" aria-label={tr("sum.title", { n: r.month })}>
      <h3>{tr("sum.title", { n: r.month })}</h3>
      <div className="swipe-sum-grid">
        <div>
          <h4>{tr("sum.bought")}</h4>
          {L.bought.length ? (
            <ul className="swipe-bought">
              {L.bought.map((b, i) => (
                <li key={i}>
                  <span aria-hidden="true">{b.icon}</span> {b.name} <b>{b.emi ? tr("sum.emiLine", { emi: money(b.emi), months: b.months }) : money(b.price)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet">{tr("sum.nothing")}</p>
          )}
          {L.saidNo > 0 && <p className="swipe-good">{tr("sum.saidNo", { n: L.saidNo })}</p>}
        </div>
        <dl className="swipe-sum-nums">
          <dt>{tr("sum.paid")}</dt>
          <dd>{money(paid)}</dd>
          <dt>{tr("sum.emiPaid")}</dt>
          <dd>{money(L.emiPaid)}</dd>
          <dt>{tr("sum.extra")}</dt>
          <dd className={L.extraCommitted ? "bad" : ""}>{money(L.extraCommitted)}</dd>
          <dt>{tr("sum.needs")}</dt>
          <dd className={L.needsMissed ? "bad" : "good"}>{tr("sum.needsVal", { paid: L.needsPaid, missed: L.needsMissed })}</dd>
          <dt>{tr("sum.saved")}</dt>
          <dd className="good">{money(r.savings)}</dd>
          <dt>{tr("sum.status")}</dt>
          <dd>{r.status} / 100</dd>
        </dl>
      </div>
      <p className={`swipe-next${r.nextLeft < r.needsTotal ? " bad" : ""}`}>
        {tr("sum.next", { income: money(C.income), emis: money(r.owedMonthly + r.overdue), fines: money(r.fines), left: money(r.nextLeft), needs: money(r.needsTotal) })}
        {r.nextLeft < r.needsTotal && <b> {tr("sum.squeeze")}</b>}
      </p>
      <button ref={btn} className="primary-button big" onClick={onNext}>
        {tr("sum.continue", { n: r.month + 1 })} <ArrowRight size={18} />
      </button>
    </div>
  );
}

function FinalSummary({ r, onDone }) {
  const { t } = useT();
  const tr = (k, v) => t(`arcade.swipe.${k}`, v);
  const btn = useRef(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className="swipe-summary final" role="dialog" aria-label={tr("final.title")}>
      <h3>{tr("final.title")}</h3>
      <p className="swipe-takeaway">{r.takeaway}</p>
      <dl className="swipe-sum-nums wide">
        <dt>{tr("final.saved")}</dt>
        <dd className="good">{money(r.saved)}</dd>
        <dt>{tr("final.cash")}</dt>
        <dd>{money(r.cash)}</dd>
        <dt>{tr("final.owed")}</dt>
        <dd className={r.owed ? "bad" : ""}>{money(r.owed)}</dd>
        <dt>{tr("final.extra")}</dt>
        <dd className={r.extraPaid ? "bad" : ""}>{money(r.extraPaid)}</dd>
        <dt>{tr("final.fees")}</dt>
        <dd className={r.lateFees ? "bad" : ""}>{money(r.lateFees)}</dd>
        <dt>{tr("final.needs")}</dt>
        <dd className={r.needsMissed ? "bad" : "good"}>{tr("sum.needsVal", { paid: r.needsPaid, missed: r.needsMissed })}</dd>
        <dt>{tr("final.status")}</dt>
        <dd>{r.status} / 100</dd>
      </dl>
      <button ref={btn} className="primary-button big" onClick={onDone}>
        {tr("final.score")} <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ---------- drawing ----------
const KIND_STYLE = {
  need: { fill: "#e7f4dc", ring: "#4f9a43" },
  want: { fill: "#fde6cc", ring: "#e08a2e" },
  emi: { fill: "#fff2b8", ring: "#c9971b" },
  loan: { fill: "#f8d3cf", ring: "#c8423b" },
  coin: { fill: "#ffd24a", ring: "#b07a12" },
};

function drawBall(ctx, kind, def, x, y, r, now, clipSide, angle) {
  const st = KIND_STYLE[kind];
  ctx.save();
  ctx.translate(x, y);
  if (clipSide) {
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(-r - 4, clipSide < 0 ? -r - 4 : 0, r * 2 + 8, r + 4);
    ctx.clip();
    ctx.rotate(-angle);
  }
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.arc(2, 4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = st.fill;
  ctx.strokeStyle = st.ring;
  ctx.lineWidth = kind === "emi" ? 5 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (kind === "emi") {
    // Big and shiny: a light sweep across the ball.
    const k = 0.15 + ((now / 900) % 1) * 0.7; // sweep position, kept inside 0–1 with its edges
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(k - 0.15, "rgba(255,255,255,0)");
    grad.addColorStop(k, "rgba(255,255,255,0.75)");
    grad.addColorStop(k + 0.15, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `${Math.round(r * (kind === "coin" ? 1.0 : 1.05))}px system-ui, "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = kind === "coin" ? "#7a4f00" : "#2b2238"; // emoji keep their own colours
  if (kind === "coin") ctx.font = `800 ${Math.round(r * 1.05)}px system-ui, sans-serif`;
  ctx.fillText(kind === "loan" ? "💸" : kind === "coin" ? "₹" : def.icon, 0, kind === "coin" ? 1 : 2);
  ctx.restore();
}

function draw(ctx, g, now, t) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * g.shake, (Math.random() - 0.5) * 14 * g.shake);
  // The bazaar: a warm sky, a strip of stall awnings at the bottom.
  const sky = ctx.createLinearGradient(0, 0, 0, FH);
  sky.addColorStop(0, "#fde9c4");
  sky.addColorStop(1, "#f6d29a");
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, FW + 20, FH + 20);
  const awnings = ["#c8423b", "#f2c14e", "#0a8fa3", "#5aa95a", "#d66a12", "#7a55c4"];
  for (let i = 0; i < 10; i++) {
    const x = i * 66 - 10;
    ctx.fillStyle = awnings[i % awnings.length];
    ctx.beginPath();
    ctx.moveTo(x, FH - 34);
    ctx.lineTo(x + 66, FH - 34);
    ctx.lineTo(x + 60, FH - 20);
    ctx.lineTo(x + 6, FH - 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x + 22, FH - 34, 12, 14);
  }
  ctx.fillStyle = "#a8743f";
  ctx.fillRect(0, FH - 20, FW, 20);

  const thinking = g.thinkT > 0;
  const tr = (k, v) => t(`arcade.swipe.${k}`, v);
  for (const it of g.items) {
    drawBall(ctx, it.kind, it.def, it.x, it.y, it.r, now);
    // Label under the item: its price (or the true cost while thinking).
    let label;
    const d = it.def;
    if (thinking) {
      const c = trueCost(it);
      if (it.kind === "emi") label = tr("think.emi", { price: formatMoney(c.sticker), total: formatMoney(c.total), months: d.months });
      else if (it.kind === "loan") label = tr("think.loan", { got: formatMoney(c.get), total: formatMoney(c.total) });
      else if (it.kind === "coin") label = tr("think.coin", { amount: formatMoney(d.amount) });
      else if (it.kind === "need") label = tr("think.need", { price: formatMoney(d.price) });
      else label = tr("think.want", { price: formatMoney(d.price) });
    } else if (it.kind === "emi") label = tr("label.emi");
    else if (it.kind === "loan") label = tr("label.loan", { amount: formatMoney(d.cash) });
    else if (it.kind === "coin") label = tr("label.coin", { amount: formatMoney(d.amount) });
    else label = formatMoney(d.price);
    ctx.font = `700 ${thinking ? 12 : 12}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = thinking ? "rgba(43,34,56,0.92)" : it.kind === "loan" ? "#c8423b" : it.kind === "emi" ? "#7a55c4" : "rgba(255,255,255,0.9)";
    ctx.fillRect(it.x - w / 2, it.y + it.r + 4, w, 18);
    ctx.fillStyle = thinking || it.kind === "loan" || it.kind === "emi" ? "#fff8e7" : "#2b2238";
    ctx.fillText(label, it.x, it.y + it.r + 7);
    // A friend's push next to tempting items.
    if (it.bubble && !thinking) {
      ctx.font = "600 12px system-ui, sans-serif";
      const bw = ctx.measureText(it.bubble).width + 16;
      const bx = Math.min(FW - bw - 4, Math.max(4, it.x + it.r - 6));
      const by = it.y - it.r - 30;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2b2238";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, 22, 8);
      else ctx.rect(bx, by, bw, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2b2238";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`🧑 ${it.bubble}`, bx + 6, by + 11);
    }
  }
  for (const h of g.halves) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - h.t / 1.2);
    drawBall(ctx, h.kind, h.def, h.x, h.y, h.r, now, h.side, h.angle + h.rot);
    ctx.restore();
  }
  for (const s of g.sparks) {
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
  }
  // Swipe trail.
  if (g.trail.length > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineCap = "round";
    for (let i = 1; i < g.trail.length; i++) {
      ctx.lineWidth = 2 + i * 0.6;
      ctx.beginPath();
      ctx.moveTo(g.trail[i - 1].x, g.trail[i - 1].y);
      ctx.lineTo(g.trail[i].x, g.trail[i].y);
      ctx.stroke();
    }
  }
  for (const f of g.floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.3);
    ctx.font = "800 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(f.text, f.x, f.y - f.t * 40);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - f.t * 40);
    ctx.globalAlpha = 1;
  }
  for (const th of g.threats) {
    ctx.globalAlpha = Math.min(1, th.t * 4, (2.8 - th.t) * 2);
    ctx.font = "700 13px system-ui, sans-serif";
    const w = Math.min(300, ctx.measureText(th.text).width + 50);
    ctx.fillStyle = "#2b2238";
    ctx.fillRect(th.x, th.y, w, 46);
    ctx.fillStyle = "#c8423b";
    ctx.fillRect(th.x, th.y, w, 16);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.fillText(t("arcade.swipe.threatFrom"), th.x + 8, th.y + 8);
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(th.text, th.x + 8, th.y + 31, w - 14);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (thinking) {
    ctx.fillStyle = "rgba(10,143,163,0.10)";
    ctx.fillRect(0, 0, FW, FH);
    ctx.font = "800 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#06606e";
    ctx.fillText(t("arcade.swipe.thinking"), FW / 2, 18);
  }
}
