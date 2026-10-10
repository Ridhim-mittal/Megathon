// Fixed tables from docs/GAME_SPEC.md (sections 3, 4, 5 and 7). These are the contract:
// change them only when the spec changes.

export const START_AGE = 11;
export const END_AGE = 36;

export const STAGES = [
  { id: "child", from: 11, to: 14 },
  { id: "teen", from: 15, to: 18 },
  { id: "young", from: 19, to: 24 },
  { id: "adult", from: 25, to: 30 },
  { id: "settle", from: 31, to: 36 },
];
export const STAGE_IDS = STAGES.map((s) => s.id);

export function stageOf(age) {
  if (age <= START_AGE) return "child";
  return (STAGES.find((s) => age >= s.from && age <= s.to) ?? STAGES[STAGES.length - 1]).id;
}

export const PILLARS = ["PLAN", "SAVE", "INVEST", "SAFE"];

// Section 4. `ages` is the window inside which the lesson card must be drawn.
export const CURRICULUM = [
  { id: "L01", ages: [11, 12], pillar: "PLAN", name: "Needs vs wants" },
  { id: "L02", ages: [11, 13], pillar: "SAVE", name: "Saving habit and goals" },
  { id: "L03", ages: [12, 14], pillar: "PLAN", name: "Inflation" },
  { id: "L04", ages: [12, 14], pillar: "SAVE", name: "Bank vs tin box" },
  { id: "L05", ages: [13, 14], pillar: "SAVE", name: "Simple vs compound interest" },
  { id: "L06", ages: [11, 14], pillar: "SAFE", name: "Online safety" },
  { id: "L07", ages: [15, 17], pillar: "PLAN", name: "Peer pressure and EMIs" },
  { id: "L08", ages: [15, 18], pillar: "PLAN", name: "Earning and opportunity cost" },
  { id: "L09", ages: [15, 18], pillar: "SAFE", name: "UPI safely" },
  { id: "L10", ages: [17, 18], pillar: "PLAN", name: "Education/career crossroads" },
  { id: "L11", ages: [15, 19], pillar: "SAFE", name: "Betting and easy-money apps" },
  { id: "L12", ages: [19, 21], pillar: "PLAN", name: "First income" },
  { id: "L13", ages: [19, 22], pillar: "SAVE", name: "Emergency fund" },
  { id: "L14", ages: [19, 24], pillar: "SAVE", name: "Borrowing compared" },
  { id: "L15", ages: [18, 23], pillar: "SAFE", name: "Money mule" },
  { id: "L16", ages: [20, 24], pillar: "SAFE", name: "Insurance basics" },
  { id: "L17", ages: [20, 24], pillar: "INVEST", name: "Risk vs return; start early" },
  { id: "L18", ages: [24, 28], pillar: "PLAN", name: "Lifestyle inflation and social spending" },
  { id: "L19", ages: [25, 30], pillar: "INVEST", name: "Diversification and crashes" },
  { id: "L20", ages: [25, 30], pillar: "SAVE", name: "Calamity" },
  { id: "L21", ages: [26, 30], pillar: "INVEST", name: "Fees and mis-selling" },
  { id: "L22", ages: [24, 32], pillar: "SAFE", name: "Too good to be true" },
  { id: "L23", ages: [31, 35], pillar: "PLAN", name: "The big purchase" },
  { id: "L24", ages: [33, 36], pillar: "PLAN", name: "Planning ahead" },
];
export const LESSON_IDS = CURRICULUM.map((l) => l.id);
export const lessonById = Object.fromEntries(CURRICULUM.map((l) => [l.id, l]));

export const CARD_KINDS = [
  "lesson",
  "random",
  "crossroads",
  "consequence",
  "crisis",
  "teachback",
  "scam",
  "calamity",
  "windfall",
];
// Kinds the engine may draw to fill empty slots in a year.
export const FILLER_KINDS = ["random", "scam", "calamity", "windfall", "teachback"];
// Kinds whose choices must carry `outcome` and `why`.
export const EXPLAINED_KINDS = ["lesson", "crossroads", "teachback"];

export const QUALITIES = ["good", "neutral", "risky", "bad"];
export const LESSON_STATUSES = ["unseen", "seen", "applied", "missed"];
export const METERS = ["joy", "health", "family", "gyaan"];
export const LANGS = ["en", "hi", "te"];

export const JARS = ["needs", "wants", "emergency", "goal", "invest"];
export const SAVING_JARS = ["emergency", "goal"];

export const PRODUCTS = [
  "bank",
  "fd",
  "rd",
  "ppf",
  "sip_index",
  "gold",
  "chit",
  "land",
  "vehicle",
  "insurance_health",
  "insurance_term",
  "insurance_crop",
  "insurance_accident",
  "pension",
];
export const INSURANCE_PRODUCTS = [
  "insurance_health",
  "insurance_term",
  "insurance_crop",
  "insurance_accident",
];
// Products the invest jar can flow into each year.
export const INVESTABLE = ["fd", "rd", "ppf", "sip_index", "gold", "chit", "pension"];

export const LOAN_SOURCES = [
  "family",
  "shg",
  "moneylender",
  "loan_app",
  "credit_card",
  "bnpl_emi",
  "gold_loan",
  "bank_personal",
  "education",
  "kcc",
  "mudra",
  "home",
  "vehicle_loan",
];

export const EFFECT_KEYS = [
  "cash",
  "jar",
  "meters",
  "flags",
  "open",
  "close",
  "loan",
  "repay",
  "shock",
  "income",
  "schedule",
  "lesson",
  "gyaan",
  "glasses",
];

export const GOALS = ["house", "business", "education", "vehicle", "parents"];
export const ENDINGS = [
  "dream_on_time",
  "dream_with_debt",
  "dream_close",
  "secure_no_dream",
  "debt_trap",
];
export const ENDING_MODIFIERS = ["wrong_path", "no_safety_net"];

export const PHASES = ["intro", "budget", "shop", "card", "outcome", "minigame", "yearEnd", "ending"];
