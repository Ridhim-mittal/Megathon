import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Check, Lock, MapPin, Skull, Trophy, TriangleAlert } from "lucide-react";
import { useT } from "../../i18n/index.jsx";

// A Detroit-style mission flowchart: scenes left to right, each with its choices; lines run from a
// choice to the scene it led to. The path this life took is lit; branches seen in earlier lives
// are shown; the rest stay locked.

const COL = 230;
const GAP_X = 70;
const HEAD = 34;
const ROW = 22;
const GAP_Y = 22;
const OUT_H = 54;

const TONE_ICON = { good: Trophy, mixed: Check, bad: TriangleAlert, tragic: Skull };

function layout(chart) {
  const nodes = chart.nodes.map((n) => ({ ...n, h: n.type === "outcome" ? OUT_H : HEAD + ROW * Math.max(1, n.choices.length) + 6 }));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const parents = {};
  for (const n of nodes) for (const c of n.choices) for (const t of c.targets) (parents[t] ??= []).push({ node: n, choice: n.choices.indexOf(c) });
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  let height = 0;
  for (let d = 0; d <= maxDepth; d++) {
    const col = nodes.filter((n) => n.depth === d);
    // Order by where the lines come from, to keep crossings few.
    for (const n of col) {
      const ps = (parents[n.id] ?? []).filter((p) => p.node.y != null);
      n.want = ps.length ? ps.reduce((a, p) => a + p.node.y + HEAD + p.choice * ROW, 0) / ps.length - n.h / 2 + ROW / 2 : 0;
    }
    col.sort((a, b) => a.want - b.want);
    let y = 0;
    for (const n of col) {
      n.y = Math.max(y, Math.round(n.want));
      n.x = d * (COL + GAP_X);
      y = n.y + n.h + GAP_Y;
    }
    height = Math.max(height, y);
  }
  const edges = [];
  for (const n of nodes)
    n.choices.forEach((c, i) => {
      for (const t of c.targets) {
        const to = byId[t];
        if (!to) continue;
        edges.push({
          key: `${n.id}:${c.id}>${t}`,
          x1: n.x + COL,
          y1: n.y + HEAD + i * ROW + ROW / 2,
          x2: to.x,
          y2: to.y + (to.type === "outcome" ? OUT_H / 2 : HEAD / 2),
          lit: c.taken && to.visited,
          known: c.known && to.known,
        });
      }
    });
  return { nodes, edges, width: (maxDepth + 1) * (COL + GAP_X) - GAP_X, height };
}

export function Flowchart({ chart, placeName }) {
  const { t, plain } = useT();
  const scroller = useRef(null);
  const plan = useMemo(() => (chart ? layout(chart) : null), [chart]);

  // Scroll to where the story is now (the current scene, or the outcome reached).
  useLayoutEffect(() => {
    if (!plan || !scroller.current) return;
    const focus = plan.nodes.find((n) => n.current) ?? plan.nodes.find((n) => n.reached);
    if (focus) scroller.current.scrollLeft = Math.max(0, focus.x - scroller.current.clientWidth / 2 + COL / 2);
  }, [plan]);

  if (!plan) return null;
  return (
    <div className="flowchart">
      <div className="flowchart-head">
        <span className="flow-pct">
          <b>{chart.completion}%</b> {t("story.explored")}
        </span>
        <span className="flow-legend">
          <i className="lg lit" /> {t("story.flow.yourPath")} <i className="lg known" /> {t("story.flow.seen")} <i className="lg locked" /> {t("story.flow.locked")}
        </span>
      </div>
      <div className="flowchart-scroll" ref={scroller}>
        <div className="flowchart-canvas" style={{ width: plan.width + 40, height: plan.height + 20 }}>
          <svg width={plan.width + 40} height={plan.height + 20} aria-hidden="true">
            {plan.edges.map((e) => {
              const mid = e.x1 + GAP_X / 2;
              return (
                <path
                  key={e.key}
                  d={`M${e.x1} ${e.y1} H${mid} V${e.y2} H${e.x2}`}
                  className={`flow-edge ${e.lit ? "lit" : e.known ? "known" : ""}`}
                />
              );
            })}
          </svg>
          {plan.nodes.map((n) => {
            const Icon = TONE_ICON[n.tone] ?? Check;
            const cls = `flow-node ${n.type} ${n.visited ? "visited" : n.known ? "known" : "locked"} ${n.current ? "current" : ""} ${n.reached ? "reached" : ""} tone-${n.tone ?? "none"}`;
            return (
              <div key={n.id} className={cls} style={{ left: n.x, top: n.y, width: COL, height: n.h }}>
                {n.type === "outcome" ? (
                  <div className="flow-outcome">
                    <span className="flow-icon">{n.known ? <Icon size={16} /> : <Lock size={14} />}</span>
                    <b>{n.known ? plain(n.title) : t("story.flow.lockedEnding")}</b>
                  </div>
                ) : (
                  <>
                    <div className="flow-title">
                      <b>{n.known ? plain(n.title) : "? ? ?"}</b>
                      {n.known && n.location && (
                        <small>
                          <MapPin size={10} /> {placeName(n.location)}
                        </small>
                      )}
                    </div>
                    <ul>
                      {n.choices.map((c) => (
                        <li key={c.id} className={`${c.taken ? "taken" : c.known ? "known" : "locked"} ${c.warn ? "danger" : ""}`}>
                          {c.known ? plain(c.label) : <span className="flow-lock"><Lock size={10} /> {t("story.flow.locked")}</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
