// Every number the engine uses lives here.
//
// ALL VALUES ARE ILLUSTRATIVE teaching assumptions for a poor Indian family, not predictions,
// promises or advice. They are rounded from public ranges (RBI, CPI data, government scheme
// pages, typical bank and lender rates as of the mid-2020s) and simplified so a teenager can
// follow the arithmetic. The UI shows them in the "How this world works" panel.
//
// Money is in whole rupees (₹). Rates are yearly fractions (0.07 = 7% a year) unless noted.
// Wages and card amounts are nominal: they already include the rises a person sees over a
// career. Goal costs and shop prices are given at age-11 prices and grow with `priceIndex`.

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
  return Object.freeze(o);
}

export const ASSUMPTIONS = deepFreeze({
  illustrative: true,

  // Consumer-price inflation, drawn once per year from this range (seeded, the same in a
  // Parallel Life). India's CPI has mostly moved between 4% and 7%; the RBI targets 4% ± 2%.
  inflation: { min: 0.04, max: 0.065 },

  // Monthly income by stage when no card has set a job (`income.source === "stage"`).
  // village: pocket money and festival money (child), helping on the farm and odd jobs (teen),
  // farm labour or a first local job near the MGNREGA / minimum-wage band of ₹300–450 a day
  // (young), then slow growth. city: daily-wage, auto and gig work pays a little more but
  // costs more (rent is inside `needs`).
  wages: {
    village: { child: 200, teen: 1500, young: 9000, adult: 14000, settle: 18000 },
    city: { child: 300, teen: 2500, young: 12000, adult: 17000, settle: 22000 },
  },
  // Yearly raise on any income (stage or job): roughly keeps pace with inflation.
  wageRaise: 0.05,

  // Story mode: the yearly surprise inside a chapter (see yearSurprise in engine.js). Costs are
  // in today's rupees, per stage; inflation scales them.
  surprise: {
    chance: 0.75,
    cost: { child: [150, 350], teen: [400, 900], young: [2000, 5000], adult: [5000, 12000], settle: [6000, 15000] },
    kinds: ["health", "repair", "school", "family"],
  },

  budget: {
    // ₹ granularity of the budget sliders, per stage.
    step: { child: 10, teen: 50, young: 100, adult: 100, settle: 100 },
    // Minimum share of gross monthly income that must go to needs (food, school, rent, fuel).
    // A child's family covers most needs; an adult pays for a household.
    minNeedsPct: { child: 0.2, teen: 0.3, young: 0.5, adult: 0.5, settle: 0.45 },
    // A starting split offered the first time a jar layout appears. Editable, not advice.
    starter: {
      child: { needs: 0.3, wants: 0.4, emergency: 0.1, goal: 0.2, invest: 0 },
      teen: { needs: 0.4, wants: 0.3, emergency: 0.1, goal: 0.2, invest: 0 },
      young: { needs: 0.6, wants: 0.15, emergency: 0.1, goal: 0.15, invest: 0 },
      adult: { needs: 0.6, wants: 0.15, emergency: 0.1, goal: 0.15, invest: 0 },
      settle: { needs: 0.55, wants: 0.15, emergency: 0.1, goal: 0.2, invest: 0 },
    },
    // The invest jar unlocks once this lesson has been seen.
    investUnlockLesson: "L17",
    // Where the invest jar goes unless the player picks (or a card opens) another product.
    defaultInvestIn: "rd",
    // Spending no wants at all makes life grey; spending most of the income on wants
    // worries the family.
    stingyJoy: -3,
    // Wants money the shop did not take is spent on small treats at year end. Joy gained:
    // this many points per 100% of yearly income spent that way, at most treatsJoyMax.
    treatsJoyPerIncome: 20,
    treatsJoyMax: 10,
    lavishShare: 0.5,
    lavishFamily: -2,
    // When EMIs leave less than the needs minimum, the household goes short.
    squeezedHealth: -4,
    squeezedFamily: -2,
  },

  // Holdings. `rate` is a fixed yearly return; `mean`/`sd` are seeded yearly draws.
  products: {
    // Savings account: 2.5–3.5% at most banks. Jars earn this too once a bank account is open;
    // without one they sit in the tin box and earn nothing.
    bank: { rate: 0.03 },
    // Fixed and recurring deposits: 6–7.5% at banks and the post office. Breaking one early
    // costs about 1% of the amount.
    fd: { rate: 0.068, earlyPenalty: 0.01 },
    rd: { rate: 0.065, earlyPenalty: 0.01 },
    // Public Provident Fund: 7.1% tax-free, 15-year lock-in. Simplified: closing early costs 5%.
    ppf: { rate: 0.071, lockYears: 15, earlyPenalty: 0.05 },
    // A broad index fund via SIP: long-run Indian equity ~10–12% a year with large swings.
    // Bad years: a crash of 15–35% roughly once in eight years, and one is guaranteed between
    // ages 25 and 30 so lesson L19 meets a real crash.
    sip_index: {
      mean: 0.11,
      sd: 0.14,
      min: -0.35,
      max: 0.45,
      crashChance: 0.12,
      crash: [-0.35, -0.15],
      crashWindow: [25, 30],
    },
    // Gold: ~8–10% a year over long periods, with flat or falling years. Buying jewellery or
    // coins costs ~3% over the metal price (spread and making charges).
    gold: { mean: 0.09, sd: 0.12, min: -0.2, max: 0.35, buySpread: 0.03 },
    // Registered chit fund: bidding returns of roughly 5–9%. An unregistered chit (flag
    // `chit_unregistered`) can collapse; the foreman runs away with the pot.
    chit: { min: 0.05, max: 0.09, earlyPenalty: 0.05, collapseChance: 0.15, collapseFlag: "chit_unregistered" },
    // Village land: slow appreciation, rare dips. Selling costs stamp duty, broker and fees.
    land: { mean: 0.07, sd: 0.05, min: -0.05, max: 0.2, sellCost: 0.03 },
    // Vehicles lose ~10–15% of their value each year.
    vehicle: { depreciation: 0.12, sellCost: 0.02 },
    // Pension (NPS / Atal Pension Yojana style): ~8% a year, locked until 60. Simplified:
    // closing early loses 20%.
    pension: { rate: 0.08, earlyPenalty: 0.2 },
    // Mutual funds (fictional, returns already net of the yearly expense ratio):
    // a short-term debt fund: 6–7.5% with small swings, expense ratio ~0.4%;
    // an active equity fund: the index ± the manager's luck, minus a ~1.8% expense ratio, so on
    // average it trails the cheap index fund (lesson L21).
    mf_debt: { mean: 0.066, sd: 0.012, min: 0.03, max: 0.09, expenseRatio: 0.004 },
    mf_active: { trackingSd: 0.05, expenseRatio: 0.018 },
    // Single stocks of fictional companies: beta × the index + their own news. One bad-news year
    // (−30% to −60%) happens to each company with this chance per year, which is why one stock is
    // riskier than a fund holding fifty (lesson L19). Brokerage is a flat fee per trade.
    stock_kisan: { beta: 1.1, sd: 0.15, badNewsChance: 0.06 },
    stock_chai: { beta: 0.8, sd: 0.1, badNewsChance: 0.04 },
    stock_spark: { beta: 1.5, sd: 0.3, badNewsChance: 0.1 },
    stock_power: { beta: 0.6, sd: 0.08, badNewsChance: 0.03 },
  },

  // The phone's invest app. Investing in market products needs a phone and age 18 (PAN, KYC
  // and a bank account in your own name). The expense ratio is shown, never charged twice.
  market: {
    minAge: 18,
    brokerage: 20,
    badNews: [-0.6, -0.3],
    risk: { sip_index: 3, mf_debt: 1, mf_active: 3, stock_kisan: 4, stock_chai: 3, stock_spark: 5, stock_power: 2, fd: 1, rd: 1, gold: 2 },
    expenseRatio: { sip_index: 0.002, mf_debt: 0.004, mf_active: 0.018 },
  },

  // Chapter mode: optional "life happens" events per chapter, and the phone gift.
  chapters: {
    fillers: { child: 1, teen: 2, young: 2, adult: 3, settle: 2 },
    // A phone arrives as a gift at the start of this stage if the player has none.
    phoneGiftStage: "young",
    phoneFlag: "owns_phone",
    // Scams whose loss lands later, as phone messages: victims of a phishing link or a
    // pump-and-dump find out from a debit alert or a price crash, not at the moment they click.
    // Card id → choice ids. Scams where you knowingly hand money over stay immediate.
    delayedScams: {
      "village.young.kyc_sms.a": ["click"],
      "village.young.vip_tips.a": ["buy_big"],
    },
    // The loss lands this many events after the choice, or when the chapter ends.
    scamDelayEvents: 2,
    // The phone's inbox keeps the latest messages only.
    inboxSize: 60,
  },

  // Order in which money is found when you must pay. `spend` is a choice you make, `shock` a
  // bill you cannot refuse (insurance has already paid its share), `auto` EMIs and premiums.
  // Only liquid holdings appear: PPF, pension, land and vehicles are never sold automatically.
  payOrder: {
    spend: ["cash", "wallet", "bank", "goal", "emergency", "fd", "rd", "chit", "gold", "sip_index", "mf_debt", "mf_active", "stock_power", "stock_chai", "stock_kisan", "stock_spark"],
    shock: ["emergency", "cash", "wallet", "bank", "goal", "fd", "rd", "chit", "gold", "sip_index", "mf_debt", "mf_active", "stock_power", "stock_chai", "stock_kisan", "stock_spark"],
    auto: ["cash", "wallet", "bank", "emergency", "goal", "fd", "rd", "chit", "gold", "sip_index", "mf_debt", "mf_active", "stock_power", "stock_chai", "stock_kisan", "stock_spark"],
    open: ["cash", "wallet", "bank", "goal", "emergency"],
  },

  // Loans by source.
  //   method: "reducing" = interest on what is still owed (banks);
  //           "flat"     = interest on the original amount every month ("₹2 per ₹100 per month");
  //           "bullet"   = interest every month, the whole principal at the end.
  //   disburse: "cash" = the money comes to you; "direct" = it goes straight to the seller or
  //             college, so nothing lands in your cash (phone EMI, card swipe, college fees).
  //   feePct: processing fee as a share of principal, billed with the first year's payments.
  loans: {
    // Relatives: usually no interest, but it costs goodwill (family meter).
    family: { rateYearly: 0, method: "flat", months: 12, feePct: 0, disburse: "cash", familyCost: -3 },
    // Self-help group: about ₹1 per ₹100 per month on the reducing balance.
    shg: { rateYearly: 0.12, method: "reducing", months: 12, feePct: 0.01, disburse: "cash" },
    // Village moneylender (sahukar): "₹2 per ₹100 per month", charged on the full amount.
    moneylender: { rateYearly: 0.24, perHundredPerMonth: 2, method: "flat", months: 12, feePct: 0, disburse: "cash" },
    // Instant loan apps: ~3% a month flat plus a 10% "processing fee" taken up front.
    loan_app: { rateYearly: 0.36, method: "flat", months: 6, feePct: 0.1, disburse: "cash" },
    // Credit-card revolving credit: ~3.5% a month.
    credit_card: { rateYearly: 0.42, method: "reducing", months: 12, feePct: 0, disburse: "direct" },
    // Shop EMI / buy-now-pay-later: "no-cost" offers hide ~14–18% in fees and price markups.
    bnpl_emi: { rateYearly: 0.16, method: "flat", months: 12, feePct: 0.05, disburse: "direct" },
    // Gold loan from a bank or NBFC: 9–12%, interest monthly, gold returned at the end.
    gold_loan: { rateYearly: 0.1, method: "bullet", months: 12, feePct: 0.005, disburse: "cash" },
    // Bank personal loan: 11–16% for a salaried borrower with a credit history.
    bank_personal: { rateYearly: 0.13, method: "reducing", months: 36, feePct: 0.02, disburse: "cash" },
    // Education loan: ~9–11%, paid to the college; repayment starts after the course
    // (interest is added to the loan during the 4-year moratorium).
    education: { rateYearly: 0.095, method: "reducing", months: 84, feePct: 0, disburse: "direct", moratoriumMonths: 48 },
    // Kisan Credit Card crop loan: 7% (4% with prompt repayment), repaid after harvest.
    kcc: { rateYearly: 0.07, method: "bullet", months: 12, feePct: 0, disburse: "cash" },
    // MUDRA small-business loan: ~9–12% reducing.
    mudra: { rateYearly: 0.1, method: "reducing", months: 60, feePct: 0, disburse: "cash" },
    // Home loan: 8–9.5% over 20 years. The money comes to you; buy the house with `open`.
    home: { rateYearly: 0.085, method: "reducing", months: 240, feePct: 0.005, disburse: "cash" },
    // Vehicle loan: 9–12% over 5 years. The money comes to you; buy the vehicle with `open`.
    vehicle_loan: { rateYearly: 0.1, method: "reducing", months: 60, feePct: 0.01, disburse: "cash" },
  },
  // A loan at or above this yearly rate counts as high-interest debt.
  highInterestRate: 0.2,

  // When a bill cannot be paid from savings, the engine borrows from the most expensive source
  // the player can reach. A moneylender is always reachable; a loan app needs a phone.
  forcedBorrowing: {
    candidates: ["loan_app", "moneylender"],
    access: {
      loan_app: { minAge: 18, anyFlag: ["owns_phone", "has_smartphone"], orStoryline: ["city"] },
      moneylender: {},
    },
  },

  // Insurance. Premiums are yearly and grow with prices; a different cover scales the premium.
  insurance: {
    // Private health cover of ₹3 lakh for a young adult: roughly ₹5,000–7,000 a year.
    // (Families eligible for Ayushman Bharat PM-JAY get ₹5 lakh free; content can model that
    // with a flag and no premium.)
    insurance_health: { cover: 300000, premiumYearly: 6000 },
    // Term life cover like PMJJBY: ₹2 lakh for ₹436 a year.
    insurance_term: { cover: 200000, premiumYearly: 436 },
    // Crop insurance like PMFBY: the farmer pays ~2% of the sum insured for a kharif crop.
    insurance_crop: { cover: 50000, premiumYearly: 1000 },
    // Accident cover like PMSBY: ₹2 lakh for ₹20 a year.
    insurance_accident: { cover: 200000, premiumYearly: 20 },
  },
  // Which policies pay for which shock kind, in order.
  shockCover: {
    health: ["insurance_health"],
    hospital: ["insurance_health"],
    accident: ["insurance_accident", "insurance_health"],
    death: ["insurance_term"],
    crop: ["insurance_crop"],
    flood: ["insurance_crop"],
    drought: ["insurance_crop"],
  },

  // Goal costs at age-11 prices (they grow with inflation, ~3.4× by age 36):
  // house: making a village home pakka or a small flat's down payment;
  // business: a small shop, tailoring or repair unit; education: a degree for you or a
  // sibling without loans; vehicle: an auto-rickshaw or a tractor share that earns;
  // parents: a corpus for their old age.
  goals: { house: 250000, business: 120000, education: 150000, vehicle: 100000, parents: 200000 },
  // Holdings that count toward a goal besides the goal jar and investments.
  goalAssets: { house: ["land"], vehicle: ["vehicle"], business: [], education: [], parents: [] },
  // Content sets this flag when the dream is bought (e.g. the 33–35 crossroads).
  goalReachedFlag: "goal_reached",

  meters: {
    start: { joy: 60, health: 75, family: 60, gyaan: 5 },
    // Change at every new year: life wears joy and family down unless you look after them.
    drift: { joy: -4, family: -2, health: 0, gyaan: 0 },
    healthDriftFromAge: 28,
    healthDrift: -1,
  },

  // Ammamma's glasses.
  glasses: { start: 3, perStage: 1 },

  gyaan: {
    seen: 1,
    applied: 3,
    documentOpened: 1,
    redFlagCaught: 1,
    minigame: 3,
    // Ask Ammamma and the glossary: +1 each, at most this many per year.
    mentor: 1,
    glossary: 1,
    freePerYear: 3,
  },

  // Cards per year by stage: [min, max], seeded. Required lesson cards and crossroads can push
  // a year above the max; random and flavour cards fill up to it.
  cardsPerYear: { child: [1, 1], teen: [1, 2], young: [2, 2], adult: [2, 3], settle: [2, 2] },
  // Teach-back cards for a missed lesson are this many times likelier to be drawn.
  teachbackMissedWeight: 3,

  // Sahukar's chair happens once, at a seeded age in this range (teen or young stage).
  minigameAges: [17, 22],

  // A crisis card is drawn when joy or family hits 0 or 100; at most one per year, and the
  // same crisis waits this many years before it can return.
  crisis: { cooldownYears: 2 },

  endings: {
    // Debt is "manageable" when EMIs take at most this share of income and there is no more
    // high-interest debt than one month's income.
    manageableEmiShare: 0.4,
    manageableHighInterestMonths: 1,
    // High-interest debt "dominates" above this many months of income and above liquid savings.
    debtTrapMonths: 3,
    // "Secure": an emergency fund of this many months of needs, some insurance, no
    // high-interest debt.
    secureEmergencyMonths: 3,
    closePct: 0.75,
  },
  // Flags (or any flag starting with `legal_`) that add the `wrong_path` ending modifier.
  wrongPathFlags: ["money_mule", "fraud", "legal_trouble"],

  // Habit echoes at year end.
  habits: {
    wantsShareHigh: 0.5,
    wantsShareTarget: 0.25,
    emergencyMinMonths: 1,
    emergencyFromAge: 19,
    emiShareHigh: 0.4,
    idleCashFromAge: 13,
    idleCashMin: 2000,
    investFromAge: 22,
    investExampleMonthly: 500,
  },
});

export default ASSUMPTIONS;
