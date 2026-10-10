import { crossById, crossroads } from "../engine/data.js";
import { previewOption } from "../engine/engine.js";
import { useI18n } from "../i18n.js";
import { EffectChips, LoanTerms } from "./bits.jsx";

// Full-screen crossroads with a little flowchart: past roads lit, roads not taken greyed.
export function Crossroads({ life, step, send }) {
  const { t, tx } = useI18n();
  const cr = crossById[step.id];
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-red" role="dialog" aria-modal="true" aria-labelledby="cross-title" data-testid="crossroads">
      <div className="ikat" />
      <div className="mx-auto max-w-md px-3 py-4 text-cream">
        <p className="text-[12px] font-black uppercase tracking-widest text-gold">{t("cross.title", { age: cr.age })}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-ochre text-5xl shadow-[3px_3px_0_#241510]" aria-hidden>
            {cr.art}
          </span>
          <div>
            <h2 id="cross-title" className="text-2xl font-black leading-tight">
              {tx(cr.title)}
            </h2>
            <p className="text-[14px]">{tx(cr.text)}</p>
          </div>
        </div>
        <FlowMap life={life} current={cr.id} />
        <div className="mt-3 space-y-2">
          {cr.options.map((opt) => {
            const p = previewOption(life, opt, cr);
            return (
              <button
                key={opt.id}
                className="btn block w-full bg-paper p-3 text-left text-ink"
                onClick={() => send({ type: "crossroads", id: cr.id, optionId: opt.id })}
                data-testid={`cross-${opt.id}`}
              >
                <span className="block text-base font-black">{tx(opt.label)}</span>
                <span className="block text-[12px]">{tx(opt.desc)}</span>
                <span className="mt-1 block">
                  <EffectChips preview={p} />
                </span>
                {p.loan && <LoanTerms quote={p.loan} compact />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ikat" />
    </div>
  );
}

export function FlowMap({ life, current }) {
  const { t, tx } = useI18n();
  return (
    <div className="mt-3 rounded-lg border-2 border-ink bg-paper p-2 text-ink" aria-label={t("cross.map")} data-testid="flowmap">
      <p className="text-[11px] font-black uppercase">{t("cross.map")}</p>
      <ol className="mt-1 space-y-1">
        {crossroads.map((cr) => {
          const chosen = life.crossroads[cr.id];
          const future = !chosen && cr.id !== current;
          return (
            <li key={cr.id} className="flex items-center gap-1">
              <span className="w-7 shrink-0 text-[11px] font-black">{cr.age}</span>
              <span className="h-0.5 w-2 bg-ink" />
              <div className="flex flex-1 flex-wrap gap-1">
                {future && <span className="rounded border-2 border-dashed border-ink px-1 text-[10px] font-bold opacity-50">{tx(cr.title)} · {t("cross.future")}</span>}
                {!future && cr.options.map((o) => {
                  const on = chosen === o.id;
                  const cls = on
                      ? "bg-leaf text-cream"
                      : cr.id === current
                        ? "bg-gold"
                        : "line-through opacity-35";
                  return (
                    <span key={o.id} className={`rounded border-2 border-ink px-1 text-[10px] font-bold ${cls}`} data-chosen={on || undefined}>
                      {tx(o.label)}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
