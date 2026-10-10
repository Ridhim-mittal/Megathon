// Scam ads inside the arcade, like the ads in free mobile games. Clicking one opens a fake site
// that runs a real-world scam pattern; walking away or reporting the ad is always possible.
// Practice only: what the scam "takes" is shown, never taken from the life's money.
//
//   spin     "Spin & win ₹10,000": a prize that needs your UPI PIN (a PIN only ever SENDS money)
//   task     "Earn ₹3,000 a day playing games": pay to join, then pay again to "withdraw"
//   autopay  "Pro pass for ₹1": the small print approves ₹999 a month

export const ADS = [
  { id: "spin", brand: "LuckySpin Rewards", domain: "luckyspin-rewardz.xyz", payee: "luckyspin.claim@okpay" },
  { id: "task", brand: "GameKamao", domain: "gamekamao-earn.in.net", payee: "gamekamao.vip@ybl-pay" },
  { id: "autopay", brand: "ArcadePro Pass", domain: "arcadepro-pass.co", payee: "arcadepro.autopay@upi-pay" },
];
export const adById = Object.fromEntries(ADS.map((a) => [a.id, a]));

// What each paid step costs in the scam (in rupees).
export const COSTS = {
  spin: { pin: 5000 },
  task: { join: 99, vip: 999 },
  autopay: { months: 3, monthly: 999, first: 1 },
};

// The next ad to show: rotate so the same one never shows twice in a row.
export function nextAd(lastId = null, rng = Math.random) {
  const pool = ADS.filter((a) => a.id !== lastId);
  return pool[Math.floor(rng() * pool.length)];
}

// A full-screen ad before "Play again": sometimes, never twice in a row, never on the first play.
export function wantsInterstitial(plays, lastHadAd, rng = Math.random) {
  return plays > 0 && !lastHadAd && rng() < 0.4;
}

// What a scam took, given the steps the player went through.
export function lostIn(adId, steps) {
  const c = COSTS[adId];
  if (adId === "spin") return steps.includes("pin") ? c.pin : 0;
  if (adId === "task") return (steps.includes("join") ? c.join : 0) + (steps.includes("vip") ? c.vip : 0);
  if (adId === "autopay") return steps.includes("mandate") ? c.first + c.monthly * c.months : 0;
  return 0;
}
