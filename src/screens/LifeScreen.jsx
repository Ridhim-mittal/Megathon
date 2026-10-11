import React, { useEffect, useState } from "react";
import { useT } from "../i18n/index.jsx";
import { goals, select } from "../ui/gameAdapter.js";
import { AskAmmamma } from "../ui/AskAmmamma.jsx";
import { DreamCard, LifeTopBar, MetersCard } from "../ui/Hud.jsx";
import { BudgetView } from "./life/BudgetView.jsx";
import { ShopView } from "./life/ShopView.jsx";
import { CardView } from "./life/CardView.jsx";
import { OutcomeView } from "./life/OutcomeView.jsx";
import { MinigameView } from "./life/MinigameView.jsx";
import { YearEndView } from "./life/YearEndView.jsx";

// The year loop: HUD on top, meters and dream on the left over the village, the current phase
// in the stage panel on the right.
export function LifeScreen({ life, dispatch, settings, onHelp, onMenu, toast, onToast }) {
  const { pick } = useT();
  const [ask, setAsk] = useState(false);
  const hud = select.hud(life);
  const goal = goals().find((g) => g.id === life.goalId);

  useEffect(() => {
    const open = () => setAsk(true);
    window.addEventListener("lakshyam:ask", open);
    return () => window.removeEventListener("lakshyam:ask", open);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => onToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast, onToast]);

  const phase = life.phase;
  const viewKey = `${life.age}-${phase}-${life.current?.cardId ?? ""}`;
  let view = null;
  if (phase === "budget") view = <BudgetView key={viewKey} life={life} dispatch={dispatch} />;
  else if (phase === "shop") view = <ShopView life={life} dispatch={dispatch} />;
  else if (phase === "card") view = <CardView key={viewKey} life={life} dispatch={dispatch} />;
  else if (phase === "outcome") view = <OutcomeView key={viewKey} life={life} dispatch={dispatch} />;
  else if (phase === "minigame") view = <MinigameView key={viewKey} life={life} dispatch={dispatch} />;
  else if (phase === "yearEnd") view = <YearEndView key={viewKey} life={life} dispatch={dispatch} goalTitle={pick(goal?.title)} />;

  return (
    <div className={`life phase-${phase}`}>
      <LifeTopBar hud={hud} settings={settings} onAsk={() => setAsk(true)} onHelp={onHelp} onMenu={onMenu} />
      <aside className="life-side">
        <MetersCard meters={hud.meters} glasses={hud.glasses} />
        <DreamCard dream={hud.dream} goalTitle={pick(goal?.title)} />
      </aside>
      <section className="life-stage" key={viewKey}>
        {view}
      </section>
      {ask && (
        <AskAmmamma
          state={life}
          lesson={select.currentCard(life)?.lesson}
          onClose={() => setAsk(false)}
          onAsked={() => dispatch({ type: "ASKED_MENTOR" })}
        />
      )}
      {toast && (
        <p className="toast" role="alert">
          {toast}
        </p>
      )}
    </div>
  );
}
