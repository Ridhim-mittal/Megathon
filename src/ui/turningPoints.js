// "What if…?": the decisions where one other choice would have changed the life a lot. Every other
// option of every decision is lived again (replay) and compared with the real life; only the big
// differences are kept. Most choices change the final money by a few hundred rupees; a turning
// point changes the ending, the dream, or lakhs of rupees.

import { content, replay, select } from "./gameAdapter.js";

// What counts as "a big difference".
export const BIG = { netWorth: 100000, share: 0.25, dream: 20 };

// How wise a story choice is, from the content ("good" | "ok" | "bad"); unknown counts as ok.
const RANK = { bad: 0, ok: 1, good: 2 };
let qualities = null;
function quality(cardId, choiceId) {
  if (!qualities) {
    qualities = new Map();
    for (const m of content.story?.missions ?? []) for (const n of m.nodes ?? []) for (const c of n.choices ?? []) qualities.set(`${n.id}:${c.id}`, RANK[c.quality] ?? 1);
  }
  return qualities.get(`${cardId}:${choiceId}`) ?? 1;
}

// A replay plays the rest of the other life on autopilot, so a big difference can come from those
// later automatic picks rather than from this choice. Keep only differences that point the same
// way as the choices' quality: a wiser choice never "costs" lakhs, a worse one never "saves" them.
export function agreesWithQuality(d, option) {
  const chosen = quality(d.cardId, d.chosen.id);
  const other = quality(d.cardId, option.id);
  return option.nw >= 0 ? other >= chosen : other <= chosen;
}

function effectOf(life, base, d, a) {
  let parallel;
  try {
    parallel = replay(life, { decisionIndex: d.index, choiceId: a.id });
  } catch {
    return null; // a choice that was locked at that moment
  }
  const cmp = select.compare(life, parallel);
  const nw = cmp.parallel.netWorth - base.netWorth;
  const dream = cmp.parallel.dream.pct - base.dream.pct;
  const ending = cmp.parallel.ending?.id ?? null;
  const endingChanged = ending !== (base.ending?.id ?? null);
  const storyChanged = (parallel.ending?.story?.id ?? null) !== (life.ending?.story?.id ?? null);
  const big = endingChanged || storyChanged || Math.abs(dream) >= BIG.dream || Math.abs(nw) >= Math.max(BIG.netWorth, Math.abs(base.netWorth) * BIG.share);
  const score = Math.abs(nw) + (endingChanged ? 1e6 : 0) + (storyChanged ? 5e5 : 0) + Math.abs(dream) * 1e4;
  return { id: a.id, label: a.label, parallel, nw, dream, ending, endingChanged, storyChanged, storyTitle: parallel.ending?.story?.title ?? null, big, score };
}

// A search done a few replays at a time, so the screen can show progress in between.
// step(n) lives n more options and returns true when finished; result() lists the turning points.
export function turningPointSearch(life, { limit = 5 } = {}) {
  const base = select.compare(life, life).original;
  const jobs = select
    .timeline(life)
    .filter((d) => d.alternatives.length > 0)
    .flatMap((d) => d.alternatives.map((a) => ({ d, a })));
  const byDecision = new Map();
  let done = 0;
  return {
    total: jobs.length,
    get done() {
      return done;
    },
    step(n = 1) {
      for (let k = 0; k < n && done < jobs.length; k++, done++) {
        const { d, a } = jobs[done];
        const e = effectOf(life, base, d, a);
        if (!e?.big || !agreesWithQuality(d, e)) continue;
        if (!byDecision.has(d.index)) byDecision.set(d.index, { ...d, options: [] });
        byDecision.get(d.index).options.push(e);
      }
      return done >= jobs.length;
    },
    // [{ index, age, cardId, title, chosen, options: [effect…] (strongest first), top }], strongest first.
    result() {
      return [...byDecision.values()]
        .map((d) => {
          const options = [...d.options].sort((x, y) => y.score - x.score);
          return { ...d, options, top: options[0] };
        })
        .sort((x, y) => y.top.score - x.top.score)
        .slice(0, limit)
        .sort((x, y) => x.index - y.index);
    },
  };
}

export function findTurningPoints(life, opts) {
  const search = turningPointSearch(life, opts);
  while (!search.step(100));
  return search.result();
}
