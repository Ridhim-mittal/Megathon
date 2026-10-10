// Read-only views of a life for the UI. The UI renders from these and never computes money.

import { CURRICULUM, INVESTABLE, PILLARS, lessonById } from "./curriculum.js";
import { netWorth, productsValue, savingsTotal, totalDebt } from "./money.js";

const INVESTMENTS = ["fd", "rd", "ppf", "sip_index", "gold", "chit", "pension"];
const ASSETS = ["land", "vehicle"];

export function makeSelectors({ A, idx, content, computeDream, checkBudget }) {
  const cardById = (s, id) => idx.pools[s.storylineId]?.byId[id] ?? null;
  const lessonTitle = (id) => idx.lessons[id]?.title ?? null;

  function hud(s) {
    return {
      age: s.age,
      stage: s.stage,
      phase: s.phase,
      playerName: s.playerName,
      cash: s.money.cash,
      wallet: s.money.wallet,
      jars: { ...s.money.jars },
      savings: savingsTotal(s),
      investments: productsValue(s, INVESTMENTS),
      assets: productsValue(s, ASSETS),
      debt: totalDebt(s),
      netWorth: netWorth(s),
      meters: { ...s.meters },
      dream: computeDream(s),
      glasses: s.glasses.charges,
      income: { ...s.income },
      priceIndex: s.priceIndex,
      products: Object.fromEntries(Object.entries(s.money.products).map(([k, h]) => [k, h.value])),
      insurance: s.insurance.map((p) => ({ ...p })),
      loans: s.loans.map((l) => ({
        id: l.id,
        source: l.source,
        balance: l.balance + l.feeDue,
        emi: l.emi,
        monthsLeft: l.monthsLeft,
        rateYearly: l.rateYearly,
        forced: l.forced,
      })),
    };
  }

  function budgetRules(s) {
    const rules = s.year?.rules;
    if (!rules) return null;
    return {
      ...rules,
      jarsUnlocked: [...rules.jarsUnlocked],
      suggested: { ...s.budget },
      investIn: s.investIn,
      investOptions: [...INVESTABLE],
    };
  }

  function shopItems(s) {
    return idx.wants
      .filter((w) => w.stage === s.stage)
      .map((w) => {
        const price = Math.round(w.price * s.priceIndex);
        const bought = Boolean(s.year?.bought.includes(w.id));
        return {
          id: w.id,
          title: w.title,
          basePrice: w.price,
          price,
          joy: w.joy ?? 0,
          echo: w.echo ?? null,
          bought,
          affordable: !bought && price <= s.money.wallet,
        };
      });
  }

  function documentView(s, docId, chosen) {
    const pack = idx.documents[docId];
    const d = s.docs[docId];
    if (!pack || !d) return null;
    const variant = pack.variants.find((v) => v.id === d.variant);
    const lines = (variant?.lines ?? []).map((l) => {
      const flagged = d.flagged.includes(l.id);
      const revealed = d.verified || flagged || Boolean(chosen);
      return {
        id: l.id,
        text: l.text,
        flagged,
        revealed,
        isRedFlag: revealed ? Boolean(l.redFlag) : null,
        explain: revealed && l.redFlag ? l.explain ?? null : null,
      };
    });
    const red = lines.filter((l) => l.isRedFlag);
    return {
      id: pack.id,
      type: pack.type,
      title: pack.title,
      verify: pack.verify ?? null,
      opened: d.opened,
      verified: d.verified,
      flagged: [...d.flagged],
      lines,
      // Only known once the player has verified, caught a red flag, or decided.
      problem: d.verified || chosen || red.length ? (variant?.lines ?? []).some((l) => l.redFlag) || Boolean(variant?.consequence) : null,
    };
  }

  function currentCard(s) {
    if (!s.current) return null;
    const card = cardById(s, s.current.cardId);
    if (!card) return null;
    const worn = s.current.glasses;
    const clarity = (card.clarity ?? []).map((c) => {
      const free = s.lessons[c.lesson] === "applied";
      const revealed = free || worn;
      return { phrase: c.phrase, truth: revealed ? c.truth : null, lesson: c.lesson ?? null, revealed, free };
    });
    const hidden = clarity.filter((c) => !c.revealed).length;
    return {
      id: card.id,
      kind: card.kind,
      lesson: card.lesson ?? null,
      lessonTitle: lessonTitle(card.lesson),
      speaker: card.speaker ?? "narrator",
      title: card.title,
      text: card.text,
      image: card.image ?? null,
      choices: (card.choices ?? []).map((c, i) => ({
        id: c.id,
        label: c.label,
        echo: c.echo ? { level: c.echo.level ?? 1, hint: c.echo.hint ?? null } : null,
        default: Boolean(c.default) || (i === 0 && !(card.choices ?? []).some((x) => x.default)),
      })),
      clarity,
      glasses: { charges: s.glasses.charges, worn, hidden, canUse: !worn && hidden > 0 && s.glasses.charges > 0 && s.phase === "card" },
      document: card.document ? documentView(s, card.document, s.current.chosen) : null,
      echoFrom: s.current.echoFrom,
      crisis: s.current.crisisFlag ? s.current.crisisFlag.replace(/^crisis_/, "") : null,
      chosen: s.current.chosen,
    };
  }

  function lastOutcome(s) {
    return s.lastOutcome;
  }

  function yearSummary(s) {
    return s.year?.summary ?? null;
  }

  function timeline(s) {
    return s.history.map((h) => {
      const card = cardById(s, h.cardId);
      const label = (id) => card?.choices?.find((c) => c.id === id)?.label ?? null;
      return {
        index: h.index,
        age: h.age,
        cardId: h.cardId,
        kind: h.kind,
        lesson: h.lesson,
        quality: h.quality,
        title: card?.title ?? null,
        chosen: { id: h.choiceId, label: label(h.choiceId) },
        alternatives: h.choices.filter((id) => id !== h.choiceId).map((id) => ({ id, label: label(id) })),
      };
    });
  }

  function lessonReport(s) {
    const lessons = CURRICULUM.map((l) => ({
      id: l.id,
      pillar: l.pillar,
      ages: [...l.ages],
      title: lessonTitle(l.id),
      status: s.lessons[l.id],
      cardId: s.lessonCards[l.id]?.cardId ?? null,
      age: s.lessonCards[l.id]?.age ?? null,
    }));
    const empty = () => ({ applied: 0, seen: 0, missed: 0, unseen: 0, total: 0 });
    const pillars = Object.fromEntries(PILLARS.map((p) => [p, empty()]));
    const totals = empty();
    for (const l of lessons) {
      pillars[l.pillar][l.status] += 1;
      pillars[l.pillar].total += 1;
      totals[l.status] += 1;
      totals.total += 1;
    }
    return { lessons, pillars, totals, gyaanCards: totals.total - totals.unseen, gyaan: s.meters.gyaan };
  }

  function ending(s) {
    if (!s.ending) return null;
    const endings = content?.storylines?.[s.storylineId]?.endings ?? {};
    return {
      ...s.ending,
      modifiers: [...s.ending.modifiers],
      text: endings[s.ending.id]?.[s.goalId] ?? null,
      // Optional extra sections, e.g. endings.json { "wrong_path": { "<goalId>": text } }.
      modifierTexts: Object.fromEntries(s.ending.modifiers.map((m) => [m, endings[m]?.[s.goalId] ?? null])),
      storyteller: endings.storyteller ?? null,
    };
  }

  function echoes(s) {
    return {
      choices: s.echoes.map((e) => ({ ...e, fired: e.firedAge != null })),
      habits: s.habitEchoes.map((h) => ({ ...h })),
    };
  }

  function minigame(s) {
    const mg = s.plan.minigame;
    if (!mg) return null;
    return {
      id: mg.id,
      age: mg.age,
      active: s.phase === "minigame",
      done: Boolean(s.minigames[mg.id]),
      result: s.minigames[mg.id] ?? null,
      config: idx.minigames?.[mg.id] ?? null,
    };
  }

  // This life's luck, for "How this world works" and to show luck apart from choices.
  function world(s) {
    return {
      inflation: { ...s.world.inflation },
      returns: Object.fromEntries(Object.entries(s.world.returns).map(([k, v]) => [k, { ...v }])),
      crashAges: [...s.world.crashAges],
      priceIndex: s.priceIndex,
    };
  }

  function lifeSummary(s) {
    const h = hud(s);
    return {
      netWorth: h.netWorth,
      debt: h.debt,
      savings: h.savings,
      investments: h.investments,
      assets: h.assets,
      dream: h.dream,
      meters: h.meters,
      ending: s.ending ? { id: s.ending.id, modifiers: [...s.ending.modifiers] } : null,
      years: s.years.map((y) => ({ age: y.age, netWorth: y.netWorth, debt: y.debt, dreamPct: y.dreamPct })),
    };
  }

  // Parallel Life, side by side.
  function compare(original, parallel) {
    const lessonsDiffer = CURRICULUM.filter((l) => original.lessons[l.id] !== parallel.lessons[l.id]).map((l) => ({
      id: l.id,
      title: lessonTitle(l.id),
      original: original.lessons[l.id],
      parallel: parallel.lessons[l.id],
    }));
    let firstDifferent = null;
    const n = Math.max(original.history.length, parallel.history.length);
    for (let i = 0; i < n; i++) {
      const a = original.history[i];
      const b = parallel.history[i];
      if (!a || !b || a.cardId !== b.cardId || a.choiceId !== b.choiceId) {
        firstDifferent = i;
        break;
      }
    }
    return {
      changed: parallel.parallel ?? null,
      original: lifeSummary(original),
      parallel: lifeSummary(parallel),
      lessonsDiffer,
      firstDifferentDecision: firstDifferent,
    };
  }

  function lesson(id) {
    return { ...lessonById[id], title: lessonTitle(id) };
  }

  return {
    hud,
    budgetRules,
    checkBudget,
    shopItems,
    currentCard,
    lastOutcome,
    yearSummary,
    timeline,
    lessonReport,
    ending,
    echoes,
    minigame,
    world,
    compare,
    lesson,
    error: (s) => s.error,
  };
}
