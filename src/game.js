export const ALLOWANCE = 2000;
export const REPAIR = 600;
export const GOAL = 12000;
export const MIN_NEEDS = 800;
export const STEP = 100;
export const INITIAL_BUDGET = Object.freeze({
  needs: 800,
  wants: 400,
  emergency: 200,
  goal: 600,
});
export const money = (value) => `₹${value.toLocaleString("en-IN")}`;
export const total = (budget) =>
  Object.values(budget).reduce((sum, n) => sum + n, 0);
export function validBudget(budget) {
  return (
    budget &&
    ["needs", "wants", "emergency", "goal"].every(
      (key) =>
        Number.isInteger(budget[key]) &&
        budget[key] >= 0 &&
        budget[key] % STEP === 0,
    ) &&
    Object.keys(budget).length === 4 &&
    total(budget) === ALLOWANCE &&
    budget.needs >= MIN_NEEDS
  );
}
// Both timelines receive exactly the same shock. All numbers are illustrative.
export function resolveMonth(budget, approach = "savings") {
  if (!validBudget(budget))
    throw new Error(
      "Allocate the full allowance and cover essential needs first.",
    );
  if (!["savings", "borrow"].includes(approach))
    throw new Error("Unknown repair approach.");
  const emergencyUsed = Math.min(budget.emergency, REPAIR);
  const shortfall = REPAIR - emergencyUsed;
  const goalUsed =
    approach === "savings" ? Math.min(budget.goal, shortfall) : 0;
  const borrowed = shortfall - goalUsed;
  const interest = Math.round(borrowed * 0.1);
  return {
    budget: { ...budget },
    approach,
    emergencyUsed,
    goalUsed,
    borrowed,
    interest,
    debt: borrowed + interest,
    emergencyLeft: budget.emergency - emergencyUsed,
    goalLeft: budget.goal - goalUsed,
    nextAllowance: ALLOWANCE - borrowed - interest,
    // Future debt is included so borrowing never looks like free savings.
    netPosition:
      budget.emergency -
      emergencyUsed +
      budget.goal -
      goalUsed -
      borrowed -
      interest,
  };
}
