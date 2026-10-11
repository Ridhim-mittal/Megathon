// Swipe Bazaar (lesson: peer pressure & borrowing). Every number you might want to balance lives
// here; the game logic in SwipeBazaar.jsx only reads this object. Prices are in ₹.
//
// The idea: swiping an item BUYS or ACCEPTS it; letting it fall means saying NO.

export const SWIPE_CONFIG = {
  rounds: 3, // one round = one month
  monthSeconds: 26, // play time per month
  income: 3000, // pocket money / part-time pay at the start of each month

  // Needs: each one flies once a month. Swipe to pay. An unpaid need costs a fine next month.
  needs: [
    { id: "food", icon: "🍚", price: 600 },
    { id: "fees", icon: "📚", price: 800 },
    { id: "bus", icon: "🚌", price: 300 },
    { id: "recharge", icon: "📶", price: 200 },
  ],
  needFine: 200, // per unpaid need, taken at the start of next month

  // Wants: cost money now, small Status boost.
  wants: [
    { id: "sneakers", icon: "👟", price: 1200, status: 12 },
    { id: "outing", icon: "🍕", price: 500, status: 8 },
    { id: "earphones", icon: "🎧", price: 800, status: 10 },
    { id: "movie", icon: "🎬", price: 350, status: 6 },
  ],

  // "Pay later" items: ₹0 now, big Status boost, then an EMI every following month.
  emiItems: [
    { id: "phone", icon: "📱", price: 15000, months: 12, monthly: 1800, status: 28 }, // 21,600 total
    { id: "bike", icon: "🛵", price: 45000, months: 24, monthly: 2400, status: 34 }, // 57,600 total
    { id: "clothes", icon: "👕", price: 4000, months: 6, monthly: 800, status: 18 }, // 4,800 total
  ],
  lateFee: 300, // when an EMI can't be paid in full at the start of a month

  // Loan-app bombs: cash now, hidden fee, heavy repayments, threats.
  loanApp: { cash: 5000, hiddenFee: 750, months: 4, monthly: 1900, status: 6, lateFee: 500 },

  // Savings coin: moves money into savings and builds a combo.
  coin: { amount: 200, comboBonusEvery: 3, comboBonus: 60 },

  // Waves, tossed the way classic slicing games do it: early waves are single items, then pairs,
  // clusters, fans, quick streams and crossing throws. The next wave comes once the screen has
  // (mostly) cleared. Difficulty builds over the whole game, not per month.
  waves: {
    rampWaves: 18, // waves until full difficulty (roughly the whole game)
    size: [1, 6], // most items in one wave, first wave → full difficulty
    gap: [1.0, 0.35], // pause after a wave clears, in seconds
    maxWait: 3.4, // start the next wave anyway if items are still up this long after the last toss
    streamEvery: [0.32, 0.14], // seconds between tosses in a stream
    trapChance: [0.15, 0.55], // chance a wave hides a trap (pay-later item or loan app)
    // When each toss pattern unlocks (game progress 0 → 1).
    patterns: { single: 0, pair: 0.06, clump: 0.15, fan: 0.22, stream: 0.32, cross: 0.45 },
  },
  // Inside a wave: non-trap items are wants or savings coins; traps are pay-later items or loan apps.
  mix: { want: 0.5, emiTrap: 0.68 },
  apex: [0.16, 0.45], // how high a toss peaks, as a share of the field height from the top

  // Status meter (0–100): wants and EMIs raise it, and it drains by itself. EMIs don't drain.
  statusDrain: 3.2, // points per second

  // "Think first": slows time and shows every item's true total cost.
  thinkUses: 3,
  thinkSeconds: 4.5,
  thinkSlowdown: 0.3, // game speed while thinking

  // Physics (in field pixels; the field is 640 × 360).
  gravity: 520,
  friendBubbleChance: 0.75, // chance a tempting item comes with a friend's push

  // Final score = savings + cash − EMI still owed − fines. Stars at these scores.
  stars: [900, 2200, 3600],
};
