import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sprout,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Heart,
  ShieldCheck,
  Laptop,
  ShoppingBasket,
  Plus,
  Minus,
  Check,
  Bike,
  Coins,
  Info,
  X,
  BookOpen,
  Sun,
  Leaf,
} from "lucide-react";
import {
  ALLOWANCE,
  REPAIR,
  GOAL,
  MIN_NEEDS,
  STEP,
  INITIAL_BUDGET,
  money,
  total,
  validBudget,
  resolveMonth,
} from "./game.js";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";

const jars = [
  {
    key: "needs",
    label: "Everyday needs",
    note: "Bus rides, lunch & school things",
    hint: "Keep at least ₹800 here.",
    icon: ShoppingBasket,
    color: "peach",
    face: "happy",
  },
  {
    key: "wants",
    label: "Little joys",
    note: "A snack, a movie, a little treat",
    hint: "A little joy belongs in your life.",
    icon: Heart,
    color: "pink",
    face: "wink",
  },
  {
    key: "emergency",
    label: "Just in case",
    note: "A cushion for life’s surprises",
    hint: "For expenses you didn’t see coming.",
    icon: ShieldCheck,
    color: "green",
    face: "happy",
  },
  {
    key: "goal",
    label: "My big dream",
    note: "Your very own college laptop",
    hint: "Small savings, bigger possibilities.",
    icon: Laptop,
    color: "purple",
    face: "happy",
  },
];

function Village() {
  return (
    <svg className="village" viewBox="0 0 560 230" aria-hidden="true">
      <circle cx="455" cy="49" r="27" fill="#edcf88" />
      <g fill="#fffdf5" opacity=".9">
        <path d="M72 51c-5-19 25-25 30-10 17-8 29 4 25 13H72Z" />
        <path d="M336 36c-3-14 17-20 24-8 15-7 24 6 20 12h-44Z" />
      </g>
      <path
        d="M0 179Q80 115 170 171Q300 111 410 160Q507 127 560 170V230H0Z"
        fill="#d7dfb9"
      />
      <path d="M0 207Q130 157 280 195Q411 155 560 192V230H0Z" fill="#baca9c" />
      <path
        d="M308 230Q279 191 311 168"
        fill="none"
        stroke="#f2e5c4"
        strokeWidth="32"
      />
      <g stroke="#7e8970" strokeWidth="3" strokeLinejoin="round">
        <path d="M156 111h100v88H156Z" fill="#f6e6b8" />
        <path d="m144 115 61-51 63 51Z" fill="#be7c63" />
        <path d="M194 152q13-11 26 0v47h-26Z" fill="#91aca0" />
        <path d="M168 132h17v21h-17Zm58 0h17v21h-17Z" fill="#fff9df" />
        <path d="M377 133h89v65h-89Z" fill="#f5d7b9" />
        <path d="m365 136 57-41 58 41Z" fill="#81988a" />
        <path d="M394 160h20v23h-20Z" fill="#fff9df" />
        <path d="M443 169v30" strokeWidth="17" />
      </g>
      <g stroke="#7c8964" strokeWidth="5">
        <path d="M99 120v81M502 111v80" />
      </g>
      <g fill="#8fa77b">
        <ellipse cx="98" cy="114" rx="31" ry="44" />
        <ellipse cx="502" cy="100" rx="27" ry="39" />
      </g>
      <g fill="#e5bd89">
        <circle cx="87" cy="105" r="4" />
        <circle cx="110" cy="121" r="4" />
        <circle cx="496" cy="90" r="4" />
      </g>
      <g transform="translate(308 130)">
        <ellipse cx="0" cy="74" rx="23" ry="5" fill="#93a77f" />
        <path
          d="M-11 53v17m22-17v17"
          stroke="#555c55"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path d="M-17 53v-21q17-15 34 0v21" fill="#c38c72" />
        <circle cy="15" r="19" fill="#bd8667" />
        <path
          d="M-19 15Q-25-14 0-9Q25-10 20 18L10 3Q-5 12-19 9"
          fill="#484741"
        />
        <circle cx="-6" cy="17" r="1.8" fill="#484741" />
        <circle cx="7" cy="17" r="1.8" fill="#484741" />
        <path
          d="M-3 25q4 3 7-1"
          fill="none"
          stroke="#684e43"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="m-18 35-9 16m45-16 8 13"
          stroke="#bd8667"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
      <g fill="#f7efd6">
        <path d="m46 206 3-8 3 8Zm423 9 3-8 3 8Z" />
        <circle cx="132" cy="212" r="3" />
        <circle cx="353" cy="212" r="3" />
      </g>
    </svg>
  );
}
function Jar({ item, value, remaining, onChange }) {
  const Icon = item.icon;
  return (
    <article className={`jar-card ${item.color}`}>
      <div className="jar-heading">
        <span className="icon-badge">
          <Icon size={17} />
        </span>
        <h3>{item.label}</h3>
      </div>
      <p className="jar-note">{item.note}</p>
      <div className="jar-illustration" aria-hidden="true">
        <div className="jar-lid" />
        <div className="jar-glass">
          <div
            className="jar-fill"
            style={{ height: `${18 + (value / ALLOWANCE) * 75}%` }}
          >
            <span className="coin coin-one">₹</span>
            <span className="coin coin-two">₹</span>
            <span className="coin coin-three">₹</span>
          </div>
          <div className={`jar-face ${item.face}`}>
            <i />
            <i />
            <b />
          </div>
          <div className="glass-shine" />
        </div>
        <div className="jar-shadow" />
      </div>
      <div className="stepper">
        <button
          aria-label={`Remove ₹100 from ${item.label}`}
          onClick={() => onChange(item.key, -STEP)}
          disabled={value === 0}
        >
          <Minus size={17} />
        </button>
        <output aria-label={`${item.label} amount`}>{money(value)}</output>
        <button
          aria-label={`Add ₹100 to ${item.label}`}
          onClick={() => onChange(item.key, STEP)}
          disabled={remaining < STEP}
        >
          <Plus size={17} />
        </button>
      </div>
      <p className="jar-hint">{item.hint}</p>
    </article>
  );
}
function Mentor({ children }) {
  return (
    <div className="mentor">
      <div className="mentor-avatar" aria-hidden="true">
        ✿
      </div>
      <div>
        <span>AMMAMMA’S LITTLE WISDOM</span>
        <p>{children}</p>
      </div>
    </div>
  );
}
function Summary({ result, title, second = false }) {
  return (
    <article className={`summary-card ${second ? "alternate" : ""}`}>
      <span className="eyebrow">
        {second ? "A DIFFERENT CHOICE" : "YOUR FIRST CHAPTER"}
      </span>
      <h3>{title}</h3>
      <dl>
        <div>
          <dt>Laptop savings left</dt>
          <dd>{money(result.goalLeft)}</dd>
        </div>
        <div>
          <dt>Emergency savings left</dt>
          <dd>{money(result.emergencyLeft)}</dd>
        </div>
        <div>
          <dt>Borrowed for the repair</dt>
          <dd>{money(result.borrowed)}</dd>
        </div>
        <div>
          <dt>Interest next month</dt>
          <dd>{money(result.interest)}</dd>
        </div>
        <div className="debt-row">
          <dt>Total due next month</dt>
          <dd>{money(result.debt)}</dd>
        </div>
        <div>
          <dt>Next allowance after repayment</dt>
          <dd>{money(result.nextAllowance)}</dd>
        </div>
      </dl>
      <p className="summary-foot">
        Little joys enjoyed: {money(result.budget.wants)} · Essentials covered:{" "}
        {money(result.budget.needs)}
      </p>
    </article>
  );
}
function App() {
  const [phase, setPhase] = useState("budget");
  const [budget, setBudget] = useState({ ...INITIAL_BUDGET });
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const heading = useRef(null);
  const guide = useRef(null);
  const guideTrigger = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [phase]);
  useEffect(() => {
    if (showGuide) guide.current?.showModal();
    else if (guide.current?.open) guide.current.close();
  }, [showGuide]);
  const remaining = ALLOWANCE - total(budget);
  const replaying = Boolean(first) && (phase === "budget" || phase === "event");
  const result = second || first;
  const step = phase === "budget" ? 0 : phase === "event" ? 1 : 2;
  function change(key, amount) {
    setBudget((b) => {
      if (b[key] + amount < 0 || total(b) + amount > ALLOWANCE) return b;
      return { ...b, [key]: b[key] + amount };
    });
  }
  function resolve(approach) {
    const next = resolveMonth(budget, approach);
    if (first) {
      setSecond(next);
      setPhase("compare");
    } else {
      setFirst(next);
      setPhase("result");
    }
  }
  function replay() {
    setBudget({ ...first.budget });
    setSecond(null);
    setPhase("budget");
  }
  function restart() {
    setFirst(null);
    setSecond(null);
    setBudget({ ...INITIAL_BUDGET });
    setPhase("budget");
  }
  function closeGuide() {
    setShowGuide(false);
    guideTrigger.current?.focus();
  }
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Lakshyam home">
          <span className="brand-symbol">
            <Sprout size={26} />
          </span>
          lakshyam<span className="brand-dot">.</span>
        </a>
        <span className="brand-tagline">Little choices. Bigger dreams.</span>
        <button
          ref={guideTrigger}
          className="quiet-button"
          onClick={() => setShowGuide(true)}
        >
          <BookOpen size={17} />
          <span>How to play</span>
        </button>
      </header>
      <main>
        <div className="chapter-line">
          <span>
            <span className="chapter-dot" /> CHAPTER 01{" "}
            <span className="chapter-divider">/</span> THE FIRST LITTLE STEP
          </span>
          <span className="time-label">
            <Sun size={15} /> A month in your shoes
          </span>
        </div>
        <section className="story-banner">
          <div className="story-copy">
            <span className="eyebrow">A LITTLE LIFE. A BIG DREAM.</span>
            <h1>
              Big dreams start
              <br />
              with little jars<span>.</span>
            </h1>
            <p>
              You’re in Class 12. A college laptop is on your wish list.
              <br className="desktop-break" /> Let’s make your first ₹2,000
              count.
            </p>
            <div className="persona-chip">
              <span className="tiny-avatar">✿</span> You, 17 <span>·</span>{" "}
              Telangana <span>·</span> Month 1
            </div>
          </div>
          <Village />
        </section>
        <section className="goal-strip" aria-label="Your savings goal">
          <div className="goal-icon">
            <Laptop size={23} />
          </div>
          <div className="goal-label">
            <span>THE DREAM WE’RE SAVING FOR</span>
            <strong>A laptop. A world of possibilities.</strong>
          </div>
          <div className="goal-progress">
            <div>
              <span>
                {phase === "result" || phase === "compare"
                  ? money(result.goalLeft)
                  : money(budget.goal)}{" "}
                <small>/ {money(GOAL)}</small>
              </span>
              <span>
                {phase === "result" || phase === "compare"
                  ? "saved this month"
                  : "planned this month"}
              </span>
            </div>
            <div className="progress-track">
              <div
                style={{
                  width: `${((phase === "result" || phase === "compare" ? result.goalLeft : budget.goal) / GOAL) * 100}%`,
                }}
              />
            </div>
          </div>
        </section>
        <nav className="steps" aria-label="Chapter progress">
          {["Make a little plan", "Life happens", "See your story"].map(
            (label, i) => (
              <div
                key={label}
                className={`${step === i ? "active" : ""} ${step > i ? "complete" : ""}`}
                aria-current={step === i ? "step" : undefined}
              >
                <span>{step > i ? <Check size={13} /> : `0${i + 1}`}</span>
                {label}
              </div>
            ),
          )}
        </nav>
        {phase === "budget" && (
          <section className="phase-content">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {replaying
                    ? "SAME MONTH. A FRESH POSSIBILITY."
                    : "YOUR MONEY, YOUR LITTLE PLAN"}
                </span>
                <h2 ref={heading} tabIndex={-1}>
                  {replaying
                    ? "What would you do differently?"
                    : "A place for every rupee."}
                </h2>
                <p>
                  {replaying
                    ? "Change your jars. The ₹600 repair and your repair approach stay the same."
                    : "We’ve put together a starting plan. Move ₹100 at a time to make it yours."}
                </p>
              </div>
              <div
                className={`available-pill ${remaining ? "has-money" : ""}`}
                role="status"
              >
                <Coins size={18} />
                <div>
                  <strong>{money(remaining)}</strong>
                  <span>
                    {remaining ? "left to tuck away" : "all tucked away"}
                  </span>
                </div>
                {remaining === 0 && <Check size={17} />}
              </div>
            </div>
            <div className="jar-grid">
              {jars.map((item) => (
                <Jar
                  key={item.key}
                  item={item}
                  value={budget[item.key]}
                  remaining={remaining}
                  onChange={change}
                />
              ))}
            </div>
            <div className="allocation-help">
              <Info size={15} />
              <span>
                Moving money? Tap <b>−</b> on one jar, then <b>+</b> on another.
                Each tap moves ₹100.
              </span>
            </div>
            <Mentor>
              {replaying
                ? "Try a different balance, not just more saving. Notice what you give up as well as what you gain."
                : "“Save for your dreams, leave room for a little joy, and keep a little something for a rainy day.”"}
            </Mentor>
            <div className="action-row">
              <p role="status">
                {budget.needs < MIN_NEEDS ? (
                  "Everyday needs require at least ₹800 before you continue."
                ) : remaining ? (
                  `Give the remaining ${money(remaining)} a home to continue.`
                ) : (
                  <>
                    <ShieldCheck size={16} /> Everyday needs covered. Your plan
                    is ready.
                  </>
                )}
              </p>
              <button
                className="primary-button"
                disabled={!validBudget(budget)}
                onClick={() => setPhase("event")}
              >
                {replaying ? "Try this little plan" : "Let’s live this month"}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
        {phase === "event" && (
          <section className="phase-content event-phase">
            <div className="event-illustration">
              <span className="floating-spark">✦</span>
              <Bike size={105} strokeWidth={1.4} />
              <span className="repair-badge">a little bump in the road</span>
            </div>
            <div className="event-copy">
              <span className="eyebrow">
                LIFE HAPPENS · THE SAME EVENT IN BOTH LIVES
              </span>
              <h2 ref={heading} tabIndex={-1}>
                Oh no. A wobbly wheel!
              </h2>
              <p>
                Your bicycle needs a {money(REPAIR)} repair. You ride it to
                coaching, so the repair can’t wait. Your needs and little-joys
                money has already been spent this month.
              </p>
              <p className="event-balance">
                You have <b>{money(budget.emergency)}</b> just in case and{" "}
                <b>{money(budget.goal)}</b> saved for your laptop.
              </p>
              <div className="choice-list">
                {(first ? [first.approach] : ["savings", "borrow"]).map(
                  (approach) => {
                    const preview = resolveMonth(budget, approach);
                    return (
                      <button
                        key={approach}
                        className="choice-button"
                        onClick={() => resolve(approach)}
                      >
                        <span
                          className={`choice-icon ${approach === "savings" ? "green" : "peach"}`}
                        >
                          {approach === "savings" ? (
                            <ShieldCheck size={23} />
                          ) : (
                            <Coins size={23} />
                          )}
                        </span>
                        <span>
                          <strong>
                            {first ? "Same approach: " : ""}
                            {approach === "savings"
                              ? "Use my savings first"
                              : "Protect my laptop jar"}
                          </strong>
                          <small>
                            {approach === "savings"
                              ? `${money(preview.emergencyUsed)} from emergencies + ${money(preview.goalUsed)} from the laptop jar.`
                              : `${money(preview.emergencyUsed)} from emergencies; borrow the rest.`}{" "}
                            {preview.borrowed
                              ? `Borrow ${money(preview.borrowed)}; repay ${money(preview.debt)} next month.`
                              : "No borrowing needed."}
                          </small>
                        </span>
                        <ArrowRight size={19} />
                      </button>
                    );
                  },
                )}
              </div>
              <p className="assumption-note">
                Our pretend loan adds ₹10 per ₹100 borrowed, once, due next
                month. This is an illustrative expensive loan, not a real offer.
              </p>
              <button
                className="text-button"
                onClick={() => setPhase("budget")}
              >
                <ArrowLeft size={15} /> Revisit my jars
              </button>
            </div>
          </section>
        )}
        {phase === "result" && (
          <section className="phase-content">
            <div className="center-heading">
              <span className="eyebrow">YOU HANDLED YOUR FIRST CURVEBALL</span>
              <h2 ref={heading} tabIndex={-1}>
                Your wheel is fixed. Your story goes on.
              </h2>
              <p>
                One surprise, a few choices, and something to take into next
                month.
              </p>
            </div>
            <div className="result-layout">
              <Summary result={first} title="Here’s where you landed" />
              <div className="reflection">
                <span className="reflection-icon">
                  <Sprout size={31} />
                </span>
                <h3>What changed, and why?</h3>
                <p>
                  Your emergency jar covered <b>{money(first.emergencyUsed)}</b>{" "}
                  of the repair.{" "}
                  {first.goalUsed > 0 && (
                    <>
                      You used <b>{money(first.goalUsed)}</b> from your laptop
                      savings too.{" "}
                    </>
                  )}
                  {first.borrowed > 0 ? (
                    <>
                      Borrowing the remaining <b>{money(first.borrowed)}</b>{" "}
                      adds <b>{money(first.interest)}</b> in interest next
                      month.
                    </>
                  ) : (
                    <>You covered the repair without taking on debt.</>
                  )}
                </p>
                <p>
                  The broken wheel was the surprise. How you prepared and paid
                  for it shaped the outcome.
                </p>
                <div className="replay-invite">
                  <Sparkles size={18} />
                  <span>What if you’d filled your jars differently?</span>
                </div>
                <button className="primary-button" onClick={replay}>
                  <RotateCcw size={17} /> Try a parallel life
                </button>
                <small>Same month. Same repair. Change only your budget.</small>
              </div>
            </div>
          </section>
        )}
        {phase === "compare" && (
          <section className="phase-content">
            <div className="center-heading">
              <span className="eyebrow">YOUR PARALLEL LIFE</span>
              <h2 ref={heading} tabIndex={-1}>
                One month. Two little possibilities.
              </h2>
              <p>
                The same ₹600 repair. The same way of paying. A different
                starting plan.
              </p>
            </div>
            <div className="comparison-grid">
              <Summary result={first} title="Your first life" />
              <Summary result={second} title="Your parallel life" second />
            </div>
            <div className="comparison-insight">
              <Sparkles size={23} />
              <div>
                <h3>
                  {second.interest < first.interest
                    ? `Your new plan avoided ${money(first.interest - second.interest)} in interest.`
                    : second.interest > first.interest
                      ? `Your new plan added ${money(second.interest - first.interest)} in interest.`
                      : "Different jars don’t always mean a different financial outcome."}
                </h3>
                <p>
                  After subtracting all debt, your remaining savings are{" "}
                  <b>{money(first.netPosition)}</b> in the first life and{" "}
                  <b>{money(second.netPosition)}</b> in the parallel life.{" "}
                  {second.budget.wants !== first.budget.wants
                    ? `Your little-joys budget also changed from ${money(first.budget.wants)} to ${money(second.budget.wants)}—that’s a trade-off, too.`
                    : "Your little-joys budget stayed the same."}
                </p>
              </div>
            </div>
            <Mentor>
              “An emergency fund gives you options. This one month shows a
              trade-off, not a rule for every life. A different surprise could
              tell a different story.”
            </Mentor>
            <div className="action-row">
              <button className="text-button" onClick={restart}>
                <RotateCcw size={16} /> Start a new story
              </button>
              <button className="primary-button" onClick={replay}>
                Try another balance
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
        <footer>
          <span>
            <Leaf size={14} /> Grow a little wiser, one choice at a time.
          </span>
          <span>A small simulation, not financial advice.</span>
        </footer>
      </main>
      <dialog
        ref={guide}
        onCancel={closeGuide}
        onClose={() => {
          if (showGuide) closeGuide();
        }}
        className="guide-dialog"
      >
        <button
          className="dialog-close quiet-button"
          aria-label="Close how to play"
          onClick={closeGuide}
        >
          <X size={21} />
        </button>
        <span className="eyebrow">WELCOME TO YOUR LITTLE LIFE</span>
        <h2>Four jars. One big dream.</h2>
        <ol>
          <li>
            Split your ₹2,000 monthly allowance. Cover at least ₹800 of
            essentials.
          </li>
          <li>
            Tap − to take ₹100 out of a jar, then + to move it into another.
          </li>
          <li>
            Handle a bicycle repair and see exactly where your money goes.
          </li>
          <li>
            Replay with a new budget. Compare the same repair and payment
            approach in both lives.
          </li>
        </ol>
        <p>
          All prices and loan terms are fictional teaching assumptions. The
          laptop target is ₹12,000. This chapter lasts one month; your progress
          resets when you refresh.
        </p>
        <button className="primary-button" onClick={closeGuide}>
          Let’s begin
          <ArrowRight size={17} />
        </button>
      </dialog>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
