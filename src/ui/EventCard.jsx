import { cardById } from "../engine/data.js";
import { previewOption } from "../engine/engine.js";
import { useI18n, rupees } from "../i18n.js";
import { EffectChips, LoanTerms } from "./bits.jsx";

// Center-screen event card. Each option shows its cost on money + meters before the tap.
export function EventCard({ life, step, index, total, send }) {
  const { t, tx } = useI18n();
  const card = cardById[step.cardId];
  const seed = step.seedId ? life.seeds.find((s) => s.id === step.seedId) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-2">
      <section role="dialog" aria-modal="true" aria-labelledby="event-title" className="rise panel max-h-[94dvh] w-full max-w-md overflow-y-auto px-3 pt-5 pb-5" data-testid="event-card" data-card={card.id}>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{t("event.of", { i: index, n: total })}</p>
        {seed && <p className="mt-1 rounded bg-[#ffe9a8] px-2 py-0.5 text-[12px] font-black">🌱→ {t("event.threadFrom", { age: seed.age })}</p>}
        <div className="mt-1 flex items-start gap-2">
          <span className="text-4xl" aria-hidden>
            {card.art}
          </span>
          <div>
            <h2 id="event-title" className="text-lg font-black leading-tight">
              {tx(card.title)}
            </h2>
            <p className="text-[13px]">{tx(card.text)}</p>
            {card.base?.money && <p className="mt-1 text-[12px] font-black text-debt">{rupees(card.base.money)}</p>}
            {card.base?.loan && <p className="mt-1 text-[12px] font-black text-debt">+{t("debt")} {rupees(card.base.loan.amount)}</p>}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {card.options.map((opt) => {
            const p = previewOption(life, opt, card);
            return (
              <button
                key={opt.id}
                className="btn block w-full bg-cream p-2 text-left hover:bg-white"
                onClick={() => send({ type: "choose", cardId: card.id, optionId: opt.id })}
                data-testid={`option-${opt.id}`}
              >
                <span className="block text-[14px] font-black leading-tight">{tx(opt.label)}</span>
                <span className="mt-1 block">
                  <EffectChips preview={p} />
                </span>
                {p.loan && <LoanTerms quote={p.loan} compact />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
