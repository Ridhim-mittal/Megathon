// Small fixture content shaped exactly like src/content/index.js (spec section 7), used by the
// engine tests and as a stand-in until real content lands. It is NOT the game's story.

import { CURRICULUM, ENDINGS, GOALS } from "../curriculum.js";

const t = (en, hi) => (hi ? { en, hi } : { en });

function choice(id, quality, label, effects = {}, extra = {}) {
  return {
    id,
    quality,
    label: t(label),
    effects,
    outcome: t(extra.outcome ?? `You chose: ${label}.`),
    why: t(extra.why ?? "Every choice has a cost you can count."),
    ...(extra.echo ? { echo: { level: extra.echo[0], hint: t(extra.echo[1]) } } : {}),
    ...(extra.default ? { default: true } : {}),
  };
}

function card(id, kind, lesson, ages, title, text, choices, extra = {}) {
  return { id, storyline: "village", kind, lesson, ages, weight: 1, speaker: extra.speaker ?? "narrator", title: t(title), text: typeof text === "string" ? t(text) : text, choices, ...extra.more };
}

// One lesson card per curriculum lesson (two for L02 and L14 to exercise variants).
const lessonCards = [
  card("village.child.chocolate.a", "lesson", "L01", [11, 12], "Chocolate or notebook?", "The fair is in town. You have ₹100.", [
    choice("notebook", "good", "Buy the notebook first, then a small treat", { meters: { joy: 2 } }),
    choice("all_treats", "risky", "Spend it all on treats", { cash: -50, meters: { joy: 6 } }),
  ]),
  card("village.child.piggy.a", "lesson", "L02", [11, 13], "The piggy bank", t("{cast:mentor} gives you a clay piggy bank.", "{cast:mentor} आपको मिट्टी का गुल्लक देती हैं।"), [
    choice("save", "good", "Put ₹100 in it first", { jar: { goal: 100 }, flags: { add: ["has_piggy"] } }),
    choice("spend", "risky", "Save later", { cash: -100, meters: { joy: 4 } }),
  ]),
  card("village.child.piggy.b", "lesson", "L02", [12, 13], "The broken piggy bank", "Your sibling broke the piggy bank.", [
    choice("rebuild", "good", "Start again with ₹50", { jar: { goal: 50 } }),
    choice("give_up", "risky", "Give up saving", {}),
  ], { more: { requires: { notFlags: ["has_piggy"] } } }),
  card("village.child.price_rise.a", "lesson", "L03", [12, 14], "₹10 becomes ₹12", "Last year a chocolate cost ₹10. Today it costs ₹12.", [
    choice("notice", "good", "Ask why prices rise", { gyaan: 1 }),
    choice("ignore", "neutral", "Shrug and buy it", {}),
  ]),
  {
    ...card("village.child.tin_box.a", "lesson", "L04", [12, 14], "Tin box or bank?", t("The bank offers a minor's account with interest paid every year.", "बैंक नाबालिग का खाता देता है जिस पर हर साल ब्याज मिलता है।"), [
      choice("bank", "good", "Open the bank account", { open: { product: "bank", amount: 0 }, flags: { add: ["has_bank"] } }),
      choice("tin", "risky", "Keep the tin box", { flags: { add: ["tin_box"] } }, { echo: [1, "The tin box never grows."] }),
    ]),
    clarity: [{ phrase: t("interest paid every year", "हर साल ब्याज"), truth: t("About 3% a year on what you keep there."), lesson: "L04" }],
  },
  card("village.child.chakravaddi.a", "lesson", "L05", [13, 14], "Chakravaddi", "Interest on interest: [[chakravaddi]].", [
    choice("learn", "good", "Work out the numbers", { gyaan: 2 }),
    choice("skip", "neutral", "Skip the maths", {}),
  ]),
  card("village.child.free_coins.a", "lesson", "L06", [11, 14], "Free game coins!", "A message says: share the OTP and get 500 free coins.", [
    choice("ignore", "good", "Never share an OTP", {}),
    choice("share", "bad", "Share the OTP", { cash: -200 }, { echo: [2, "Someone else now knows your number."] }),
  ]),
  {
    ...card("village.teen.phone_emi.a", "lesson", "L07", [15, 17], "Only ₹699 a month!", "{cast:friend} shows off a new phone. \"Zero down payment, only ₹699 a month on [[emi]] for 12 months. Easy!\"", [
      choice("buy", "risky", "Buy it on EMI", { loan: { source: "bnpl_emi", principal: 7500, months: 12, emi: 699, fee: 1200 }, meters: { joy: 8 }, flags: { add: ["owns_phone"] } }, { echo: [2, "₹699 feels small. Twelve of them don't."] }),
      choice("save", "good", "Save ₹700 a month instead", { flags: { add: ["saving_for_phone"] }, schedule: [{ inYears: 1, card: "village.teen.phone_bought_cash.a" }] }, { default: true }),
    ], { speaker: "friend" }),
    clarity: [{ phrase: t("Zero down payment"), truth: t("Nothing today, but a ₹1,200 processing fee is added to your first bill."), lesson: "L07" }],
    document: "doc.phone_emi",
  },
  card("village.teen.tuition.a", "lesson", "L08", [15, 18], "Teach or play?", "A neighbour asks you to tutor her son every evening.", [
    choice("teach", "good", "Tutor for ₹2,000 a month", { income: { monthly: 2000, source: "tuition" }, meters: { joy: -2 } }),
    choice("play", "risky", "Keep evenings free", { meters: { joy: 3 } }),
  ]),
  card("village.teen.upi_collect.a", "lesson", "L09", [15, 18], "A collect request", "A stranger sends a UPI collect request to 'send you a prize'.", [
    choice("decline", "good", "Decline: you never enter a PIN to receive", {}),
    choice("pay", "bad", "Enter the PIN", { cash: -1000 }),
  ]),
  card("village.teen.good_debt.a", "lesson", "L10", [17, 18], "Good debt, bad debt", "A college seat, or a loan app's quick cash?", [
    choice("edu", "good", "Ask the bank about an education loan", { loan: { source: "education", principal: 40000 }, flags: { add: ["studying"] } }),
    choice("app", "risky", "Take quick cash from a loan app", { loan: { source: "loan_app", principal: 5000 }, cash: -5000 }),
  ]),
  card("village.teen.betting.a", "lesson", "L11", [15, 19], "Double your money", "An app promises to double your money on cricket.", [
    choice("walk", "good", "The house always wins: walk away", {}),
    choice("bet", "bad", "Bet ₹1,500", { cash: -1500, flags: { add: ["bettor"] }, schedule: [{ inYears: 1, card: "village.teen.betting_debt.a" }] }, { echo: [3, "Chasing losses starts with one bet."] }),
  ]),
  card("village.young.payslip.a", "lesson", "L12", [19, 21], "Your first payslip", "The factory offers a job with PF and a payslip.", [
    choice("formal", "good", "Take the job with a payslip", { income: { monthly: 11000, source: "job_factory" }, open: { product: "bank" } }),
    choice("cash", "risky", "Take cash work, no papers", { income: { monthly: 10000, source: "cash_work" } }),
  ]),
  card("village.young.emergency.a", "lesson", "L13", [19, 22], "A rainy-day jar", "{cast:mentor} says: keep three months of expenses aside.", [
    choice("save", "good", "Put ₹3,000 in the emergency jar", { jar: { emergency: 3000 } }),
    choice("spend", "risky", "Buy new clothes instead", { cash: -3000, meters: { joy: 5 } }),
  ]),
  card("village.young.borrow.a", "lesson", "L14", [19, 24], "₹10,000 for the roof", "The roof leaks. Where do you borrow ₹10,000?", [
    choice("shg", "good", "The women's SHG at ₹1 per ₹100", { loan: { source: "shg", principal: 10000 }, cash: -10000 }),
    choice("sahukar", "risky", "The moneylender: ₹2 per ₹100 per month", { loan: { source: "moneylender", principal: 10000 }, cash: -10000 }),
  ]),
  card("village.young.borrow.b", "lesson", "L14", [21, 24], "A credit card offer", "The bank offers you a credit card.", [
    choice("full", "good", "Use it and pay in full", {}),
    choice("revolve", "risky", "Pay the minimum on a ₹8,000 phone", { loan: { source: "credit_card", principal: 8000 }, meters: { joy: 4 } }),
  ], { more: { requires: { flags: ["has_bank"] } } }),
  card("village.young.mule.a", "lesson", "L15", [18, 23], "Easy ₹5,000", "{cast:tempter} wants to 'borrow' your bank account for a week.", [
    choice("refuse", "good", "Refuse: it's illegal and traceable", {}),
    choice("lend", "bad", "Lend the account", { cash: 5000, flags: { add: ["money_mule"] }, schedule: [{ inYears: 2, card: "village.young.mule_police.a" }] }),
  ], { speaker: "tempter" }),
  card("village.young.insurance.a", "lesson", "L16", [20, 24], "A small premium", "₹20 a year for accident cover, and health cover for the family.", [
    choice("insure", "good", "Buy accident and health cover", { open: [{ product: "insurance_accident" }, { product: "insurance_health" }] }),
    choice("skip", "risky", "Nothing will happen to us", {}),
  ]),
  card("village.young.start_early.a", "lesson", "L17", [20, 24], "Start small, start early", "₹2,000 now, or wait until you earn more?", [
    choice("sip", "good", "Start an index-fund SIP", { open: { product: "sip_index", amount: 2000 } }),
    choice("rd", "good", "Start a recurring deposit", { open: { product: "rd", amount: 2000 } }),
    choice("wait", "risky", "Wait a few years", {}),
  ]),
  card("village.adult.wedding.a", "lesson", "L18", [24, 28], "A cousin's wedding", "Everyone expects a big gift.", [
    choice("modest", "good", "Give what the budget allows", { cash: -5000, meters: { family: 3 } }),
    choice("big", "risky", "Borrow for a grand gift", { loan: { source: "moneylender", principal: 30000 }, cash: -30000, meters: { family: 8, joy: 4 } }),
  ]),
  card("village.adult.crash.a", "lesson", "L19", [25, 30], "Markets fall", "The news says markets fell 30%.", [
    choice("hold", "good", "Hold and keep the SIP going", { meters: { joy: -2 } }),
    choice("sell", "bad", "Sell everything now", { close: { product: "sip_index" } }),
  ]),
  card("village.adult.hospital.a", "lesson", "L20", [25, 30], "Hospital", "Father needs an operation.", [
    choice("govt", "good", "Government hospital with the health card", { shock: { kind: "health", cost: 40000 } }),
    choice("private", "risky", "Private hospital on credit", { shock: { kind: "health", cost: 80000 } }),
  ]),
  card("village.adult.misselling.a", "lesson", "L21", [26, 30], "An 'investment' policy", "{cast:agent} sells a plan that is 'insurance plus returns'.", [
    choice("term", "good", "Term cover plus a low-cost fund", { open: [{ product: "insurance_term" }, { product: "sip_index", amount: 5000 }] }),
    choice("plan", "risky", "Sign the plan", { cash: -25000, flags: { add: ["bought_ulip"] } }),
  ], { speaker: "agent" }),
  card("village.adult.ponzi.a", "lesson", "L22", [24, 32], "Guaranteed 5% a month", "{cast:tempter} is back with a scheme.", [
    choice("no", "good", "Too good to be true: say no", {}),
    choice("yes", "bad", "Put in ₹20,000", { cash: -20000, schedule: [{ inYears: 1, card: "village.adult.ponzi_collapse.a" }] }),
  ], { speaker: "tempter" }),
  {
    ...card("village.settle.plot.a", "lesson", "L23", [31, 35], "A plot near the road", "The seller wants ₹2,00,000. The papers look fine.", [
      choice("buy", "good", "Buy with savings and a home loan", { loan: { source: "home", principal: 100000 }, open: { product: "land", amount: 200000 } }),
      choice("wait", "neutral", "Keep saving", {}, { default: true }),
    ]),
    document: "doc.plot_sale",
  },
  card("village.settle.pension.a", "lesson", "L24", [33, 36], "When you are 60", "A pension scheme and a nominee form.", [
    choice("enrol", "good", "Enrol and add a nominee", { open: { product: "pension", amount: 5000 }, flags: { add: ["nominee"] } }),
    choice("later", "risky", "Later", {}),
  ]),
];

const crossroads = [
  card("village.teen.crossroads_path.a", "crossroads", "L10", [17, 18], "After school", "Study, work, or learn a skill?", [
    choice("study", "good", "Study with an education loan", { loan: { source: "education", principal: 60000 }, flags: { add: ["studying"] } }),
    choice("work", "neutral", "Work at the rice mill", { income: { monthly: 6000, source: "job_mill" } }),
    choice("skill", "good", "A 6-month electrician course", { cash: -800, flags: { add: ["skilled"] }, schedule: [{ inYears: 2, card: "village.young.skill_payoff.a" }] }),
  ]),
  card("village.adult.crossroads_move.a", "crossroads", "L18", [25, 27], "The city calls", "A job in the city pays more.", [
    choice("move", "neutral", "Move for work", { income: { monthly: 20000, source: "city_job" }, meters: { family: -8 } }),
    choice("stay", "good", "Stay with family", { meters: { family: 5 } }),
    choice("send_home", "neutral", "Stay and send money to your parents", { cash: -10000, meters: { family: 8 } }),
  ]),
  {
    ...card("village.settle.crossroads_dream.a", "crossroads", "L23", [33, 35], "The dream", "It is time to decide how to pay for your dream.", [
      choice("wait", "good", "Keep saving until the goal jar is full", { jar: { goal: 5000 } }),
      choice("loan", "neutral", "Take a home loan", { loan: { source: "home", principal: 400000 }, open: { product: "land", amount: 500000 }, flags: { add: ["goal_reached"] } }),
      choice("cash", "neutral", "Buy a smaller plot from savings", { open: { product: "land", amount: 150000 } }),
    ]),
    document: "doc.plot_sale",
  },
];

const consequences = [
  card("village.teen.phone_bought_cash.a", "consequence", "L07", [15, 19], "Bought in cash", "You buy the phone outright.", [
    choice("ok", "good", "Enjoy it", { cash: -700, flags: { add: ["owns_phone"] }, meters: { joy: 6 } }),
    choice("keep", "neutral", "Keep saving", {}),
  ]),
  card("village.teen.betting_debt.a", "consequence", "L11", [16, 21], "The app wants more", "You lost. The app offers a loan to win it back.", [
    choice("stop", "good", "Stop and tell family", { meters: { family: -3 }, flags: { remove: ["bettor"] } }),
    choice("chase", "bad", "Chase the loss", { loan: { source: "loan_app", principal: 3000 }, cash: -3000 }),
  ]),
  card("village.young.mule_police.a", "consequence", "L15", [19, 26], "A notice", "The police trace the money through your account.", [
    choice("cooperate", "good", "Cooperate and call 1930", { cash: -2000, flags: { add: ["legal_notice"] } }),
    choice("hide", "bad", "Hide", { flags: { add: ["legal_trouble"] } }),
  ]),
  card("village.settle.plot_dispute.a", "consequence", "L23", [32, 36], "Someone else owns it", "Another family shows the same plot's papers.", [
    choice("court", "neutral", "Go to court", { cash: -15000 }),
    choice("settle", "neutral", "Settle and lose half", { close: { product: "land" } }),
  ]),
  card("village.young.skill_payoff.a", "consequence", "L08", [18, 22], "Electrician", "Your course pays off.", [
    choice("work", "good", "Take the wiring job", { income: { monthly: 12000, source: "electrician" } }),
    choice("wait", "neutral", "Keep looking", {}),
  ]),
  card("village.adult.ponzi_collapse.a", "consequence", "L22", [25, 34], "The office is shut", "The scheme's office is locked.", [
    choice("report", "good", "Report it to the police", { gyaan: 2 }),
    choice("recruit", "bad", "Recruit others to get your money back", { flags: { add: ["fraud"] } }),
  ]),
];

const crisis = ["joy_low", "joy_high", "family_low", "family_high"].map((key) => {
  const [meter, end] = key.split("_");
  const sign = end === "low" ? 1 : -1;
  return card(`village.any.crisis_${key}.a`, "crisis", "L01", [11, 36], `Crisis: ${key}`, `Your ${meter} is at the edge.`, [
    choice("care", "good", "Take care of it", { meters: { [meter]: 30 * sign } }),
    choice("spend", "risky", "Spend your way out", { cash: -500, meters: { [meter]: 15 * sign } }),
  ], { more: { requires: { flags: [`crisis_${key}`] }, repeatable: true } });
});

const teachbacks = [
  card("village.teen.teach_needs.a", "teachback", "L01", [15, 22], "Your sister asks", "{cast:sibling} asks: is a new bag a need or a want?", [
    choice("explain", "good", "Explain needs and wants", {}),
    choice("shrug", "neutral", "Shrug", {}),
  ], { speaker: "sibling" }),
  card("village.adult.teach_emergency.a", "teachback", "L13", [23, 32], "A friend's emergency", "{cast:friend} asks how you handled the hospital bill.", [
    choice("explain", "good", "Tell them about the emergency jar", {}),
    choice("lender", "risky", "Point them to the moneylender", {}),
  ], { speaker: "friend" }),
  card("village.adult.teach_sip.a", "teachback", "L17", [25, 34], "Should I wait?", "{cast:sibling} asks when to start saving.", [
    choice("now", "good", "Start now, even small", {}),
    choice("later", "risky", "Wait until you earn more", {}),
  ], { speaker: "sibling" }),
  card("village.young.teach_otp.a", "teachback", "L06", [16, 26], "The OTP call", "{cast:sibling} got a call asking for an OTP.", [
    choice("hangup", "good", "Hang up and call 1930", {}),
    choice("share", "bad", "Share it", {}),
  ], { speaker: "sibling" }),
];

const fillers = [
  card("village.child.festival.a", "windfall", "L02", [11, 18], "Festival money", "Relatives give you ₹300.", [
    choice("save", "good", "Save half", { cash: 300, jar: { goal: 150 } }),
    choice("spend", "neutral", "Spend it", { cash: 300, meters: { joy: 4 } }),
  ]),
  card("village.teen.lottery_sms.a", "scam", "L22", [15, 30], "You won ₹25 lakh!", "Pay ₹2,000 'tax' to claim it.", [
    choice("delete", "good", "Delete the message", {}),
    choice("pay", "bad", "Pay the tax", { cash: -2000 }),
  ]),
  card("village.young.flood.a", "calamity", "L20", [22, 34], "The river rises", "Floods damage the crop.", [
    choice("claim", "good", "Claim crop insurance", { shock: { kind: "flood", cost: 30000 } }),
    choice("borrow", "risky", "Borrow to replant", { shock: { kind: "flood", cost: 30000 }, meters: { family: -2 } }),
  ]),
  card("village.young.bike_repair.a", "random", "L13", [19, 36], "Bike repair", "Your bike needs ₹2,000 of repairs.", [
    choice("pay", "good", "Pay from the emergency jar", { jar: { emergency: -2000 }, cash: -2000 }),
    choice("ignore", "risky", "Ignore it", { meters: { health: -2 } }),
  ]),
  card("village.adult.bonus.a", "windfall", "L18", [25, 36], "A bonus", "Diwali bonus of ₹5,000.", [
    choice("save", "good", "Put it in the goal jar", { cash: 5000, jar: { goal: 5000 } }),
    choice("party", "neutral", "Celebrate", { cash: 5000, meters: { joy: 5 } }),
  ]),
  card("village.adult.gold_offer.a", "random", "L19", [24, 36], "Gold for the family", "Mother suggests buying gold.", [
    choice("some", "neutral", "Buy a little", { open: { product: "gold", amount: 5000 } }),
    choice("none", "neutral", "Not now", {}),
  ]),
  card("village.adult.chit.a", "random", "L22", [24, 34], "The neighbourhood chit", "An unregistered chit promises a big pot.", [
    choice("join", "risky", "Join it", { open: { product: "chit", amount: 10000 }, flags: { add: ["chit_unregistered"] } }),
    choice("skip", "good", "Only a registered chit", {}),
  ]),
  card("village.settle.repay.a", "random", "L14", [28, 36], "Pay it down", "You could prepay your costliest loan.", [
    choice("prepay", "good", "Prepay the moneylender", { repay: { loan: "moneylender", amount: "all" } }),
    choice("keep", "neutral", "Keep the cash", {}),
  ]),
  card("village.young.fd.a", "random", "L17", [22, 36], "Fixed deposit", "The bank offers 6.8% on an FD.", [
    choice("fd", "good", "Open an FD of ₹5,000", { open: { product: "fd", amount: 5000 } }),
    choice("no", "neutral", "Not now", {}),
  ]),
  card("village.adult.crop_cover.a", "random", "L16", [22, 34], "Crop cover", "The agriculture officer explains crop insurance.", [
    choice("buy", "good", "Insure the crop", { open: { product: "insurance_crop" } }),
    choice("no", "risky", "Skip it", {}),
  ]),
  card("village.adult.kcc.a", "random", "L14", [22, 34], "Kisan Credit Card", "Seeds and fertiliser on a KCC loan.", [
    choice("kcc", "good", "Use the KCC at 7%", { loan: { source: "kcc", principal: 20000 }, cash: -20000 }),
    choice("sahukar", "risky", "Borrow from the sahukar", { loan: { source: "moneylender", principal: 20000 }, cash: -20000 }),
  ]),
];

const documents = [
  {
    id: "doc.phone_emi",
    type: "emi_agreement",
    title: t("EMI agreement — phone"),
    verify: { cost: 100, label: t("Ask the bank to explain the agreement") },
    variants: [
      { id: "clean", weight: 5, lines: [{ id: "l1", text: t("12 monthly instalments of ₹699") }] },
      {
        id: "hidden_fee",
        weight: 5,
        lines: [
          { id: "l1", text: t("12 monthly instalments of ₹699") },
          { id: "l2", text: t("Processing charges as applicable"), redFlag: "hidden_fee", explain: t("A ₹1,200 fee hides here.") },
        ],
      },
    ],
  },
  {
    id: "doc.plot_sale",
    type: "sale_deed",
    title: t("Sale deed — Plot 14, Survey No. 212"),
    verify: { cost: 2000, label: t("Pay the village lawyer to check the land records") },
    variants: [
      { id: "clean", weight: 6, lines: [{ id: "l1", text: t("Seller: K. Ramulu, son of K. Venkaiah") }] },
      {
        id: "double_sold",
        weight: 4,
        lines: [
          { id: "l1", text: t("Seller: K. Ramulu, son of K. Venkaiah") },
          { id: "l2", text: t("Encumbrance: see attached"), redFlag: "no_ec", explain: t("No encumbrance certificate is attached.") },
        ],
        consequence: { inYears: 1, card: "village.settle.plot_dispute.a" },
      },
    ],
  },
];

const wants = [
  { id: "want.chocolate", stage: "child", title: t("Chocolate"), price: 10, joy: 1 },
  { id: "want.cricket_bat", stage: "child", title: t("Cricket bat"), price: 300, joy: 5 },
  { id: "want.game_topup", stage: "child", title: t("Game top-up"), price: 100, joy: 3, echo: { level: 1, hint: t("Top-ups add up.") } },
  { id: "want.clothes", stage: "teen", title: t("New clothes"), price: 800, joy: 4 },
  { id: "want.movie", stage: "teen", title: t("Movie with friends"), price: 200, joy: 3 },
  { id: "want.recharge", stage: "teen", title: t("Phone recharge"), price: 300, joy: 2 },
  { id: "want.trip", stage: "young", title: t("Trip with friends"), price: 4000, joy: 8 },
  { id: "want.eating_out", stage: "young", title: t("Eating out"), price: 1500, joy: 4 },
  { id: "want.vacation", stage: "adult", title: t("Family vacation"), price: 12000, joy: 10 },
  { id: "want.gadget", stage: "adult", title: t("Gadget"), price: 8000, joy: 6, echo: { level: 1, hint: t("A new one comes out every year.") } },
  { id: "want.home_upgrade", stage: "settle", title: t("Home upgrade"), price: 15000, joy: 8 },
  { id: "want.family_trip", stage: "settle", title: t("Family trip"), price: 10000, joy: 8 },
];

const goalText = (g) => t(`Your ${g} dream`);
const endings = Object.fromEntries(ENDINGS.map((e) => [e, Object.fromEntries(GOALS.map((g) => [g, t(`${e} for ${g}`)]))]));
endings.storyteller = t("And that is how {cast:mentor} told it.");

export const fixtureContent = {
  lessons: CURRICULUM.map((l) => ({ id: l.id, pillar: l.pillar, ages: l.ages, title: t(l.name), summary: t(l.name), keyNumber: t("₹100") })),
  glossary: {
    emi: { name: t("EMI", "ईएमआई"), short: t("A fixed monthly payment on a loan.") },
    chakravaddi: { name: t("chakravaddi"), short: t("Interest on interest.") },
  },
  goals: [...GOALS].map((id) => ({ id, title: goalText(id), description: goalText(id) })),
  wants,
  documents,
  quiz: { pre: [], post: [] },
  faq: [{ id: "faq.emi", q: t("What is an EMI?"), a: t("A fixed monthly payment."), lesson: "L07" }],
  minigames: { sahukar: { id: "sahukar", borrowers: [] } },
  storylines: {
    village: {
      id: "village",
      playable: true,
      title: t("The village"),
      tagline: t("No money, no knowledge."),
      persona: t("A farm family in Telangana."),
      cast: {
        mentor: { name: t("Ammamma"), role: "mentor" },
        friend: { name: t("Ravi"), role: "friend" },
        tempter: { name: t("Pandu"), role: "tempter" },
        sibling: { name: t("Chinni"), role: "sibling" },
        agent: { name: t("Mr. Rao"), role: "agent" },
      },
      intro: [t("Once upon a time…")],
      start: { cash: 100, meters: { joy: 60, family: 60 } },
      cards: [...lessonCards, ...crossroads, ...consequences, ...crisis, ...teachbacks, ...fillers],
      endings,
    },
    city: {
      id: "city",
      playable: false,
      title: t("The city"),
      tagline: t("Coming soon"),
      persona: t("A family in a city basti."),
      cast: {},
      intro: [],
      start: {},
      cards: [],
      endings: {},
    },
  },
};

export default fixtureContent;
