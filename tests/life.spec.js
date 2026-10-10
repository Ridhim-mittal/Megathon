import { test, expect } from "@playwright/test";

async function begin(page, seed) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (seed !== undefined) {
    await page.getByText("Life seed").click();
    await page.getByTestId("seed").fill(String(seed));
  }
  await page.getByTestId("play").click();
  await expect(page.getByTestId("current-year")).toBeVisible();
}

const act = async (click) => (await click, true);
test.use({ actionTimeout: 10_000 });
const vis = (loc) => loc.first().isVisible().catch(() => false);

// Does one sensible thing on whatever screen is showing. Returns false at the ending.
async function step(page, { untilAge, pick = 0 } = {}) {
  if (await vis(page.getByTestId("ending"))) return false;
  if (await vis(page.getByTestId("unroll"))) return act(page.getByTestId("unroll").getByRole("button").click());
  if (await vis(page.getByTestId("crossroads"))) return act(page.locator("[data-testid^=cross-]").nth(pick).click());
  if (await vis(page.getByTestId("roleflip"))) {
    const rf = page.getByTestId("roleflip");
    if (await vis(rf.getByTestId("rf-reveal"))) return act(rf.getByRole("button").last().click());
    if (await vis(rf.getByTestId("rf-offer-long"))) return act(rf.getByTestId("rf-offer-long").click());
    return act(rf.getByRole("button").first().click());
  }
  if (await vis(page.getByTestId("event-card"))) return act(page.getByTestId("event-card").locator("[data-testid^=option-]").nth(pick).click());
  if (await vis(page.getByRole("dialog", { name: "Phone inbox" }))) return act(page.getByRole("button", { name: "Flag 🚩" }).click());
  if (await vis(page.getByTestId("phone-prompt"))) return act(page.getByTestId("phone-prompt").click());
  if (await vis(page.getByTestId("pots"))) return act(page.getByRole("button", { name: "Seal the pots" }).click());
  if (await vis(page.getByTestId("actions"))) return act(page.getByRole("button", { name: "Done — live the year" }).click());
  if (await vis(page.getByTestId("year-end"))) {
    const age = Number(await page.getByTestId("current-year").getAttribute("data-age"));
    if (untilAge && age >= untilAge) return false;
    return act(page.getByTestId("next-year").click());
  }
  await page.waitForTimeout(100);
  return true;
}

async function playTo(page, opts) {
  for (let i = 0; i < 600 && (await step(page, opts)); i++);
}

test("a whole life at 360px: scroll, HUD, ending, parallel life and 100 lives", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page, 7);
  for (const id of ["hud-wallet", "hud-debt", "hud-goal", "hud-health", "hud-family", "hud-peace", "hud-gyaan", "wheel", "house", "phone", "mentor"])
    await expect(page.getByTestId(id)).toBeVisible();
  await playTo(page, { untilAge: 19 });
  expect(await page.locator("[data-testid^=year-]").count()).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await playTo(page);
  await expect(page.getByTestId("ending-title")).not.toBeEmpty();
  const stats = page.getByTestId("end-stats");
  await expect(stats).toContainText("House goal");
  await expect(stats).toContainText("No leaderboard");
  await expect(page.getByTestId("review")).toContainText("Luck");
  await page.getByRole("tab", { name: "Parallel Life" }).click();
  await page.getByTestId("turning-point").first().click();
  await page.getByTestId("alternative").first().click();
  await expect(page.getByTestId("scroll-mine")).toBeVisible();
  await expect(page.getByTestId("scroll-other")).toBeVisible();
  await expect(page.locator(".diverge")).toHaveCount(2);
  await expect(page.getByTestId("final-compare")).toBeVisible();
  await page.getByTestId("scroll-mine").evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect.poll(() => page.getByTestId("scroll-other").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.getByTestId("run-hundred").click();
  await expect(page.getByTestId("hundred")).toContainText("/100 lives");
  await page.getByRole("tab", { name: "Letter to" }).click();
  await page.getByRole("textbox", { name: "Letter to my 17-year-old self" }).fill("Save first, then spend.\nRead the big red number.");
  await page.getByRole("button", { name: "Save letter" }).click();
  await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByTestId("teacher-export").click();
  expect((await download).suggestedFilename()).toContain("lakshyam-summary");
  expect(errors).toEqual([]);
});

test("pots: coins, sliders and drag; seal waits for every coin", async ({ page }) => {
  await begin(page, 1);
  const seal = page.getByRole("button", { name: /Seal the pots|Place all coins first/ });
  await expect(seal).toBeEnabled();
  await page.getByRole("button", { name: "Take from Wants" }).click();
  await expect(page.getByTestId("pot-wants-pct")).toHaveText("15%");
  await expect(seal).toBeDisabled();
  await expect(page.getByTestId("coin-tray")).toContainText("Loose coins: 1");
  await page.getByTestId("coin-tray").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const coin = page.getByTestId("coin-tray").getByRole("button").first();
  const pot = page.getByTestId("pot-goal");
  const a = await coin.boundingBox();
  const b = await pot.boundingBox();
  await page.mouse.move(a.x + 8, a.y + 8);
  await page.mouse.down();
  await page.mouse.move(b.x + 30, b.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("pot-goal-pct")).toHaveText("20%");
  await page.getByRole("slider", { name: "Needs" }).fill("4");
  await expect(page.getByText(/Needs below 40%/)).toBeVisible();
  await page.getByRole("slider", { name: "Needs" }).fill("10");
  await expect(seal).toBeEnabled();
  await seal.click();
  await expect(page.getByTestId("actions")).toBeVisible();
  await expect(page.getByTestId("tool-sip")).toContainText("Opens at 22");
});

test("events preview costs, loans show the big red total, seeds grow into threads", async ({ page }) => {
  await begin(page, 10);
  for (let i = 0; i < 50 && !(await vis(page.getByTestId("event-card"))); i++) await step(page);
  // Age 17, seed 10: the phone card. The EMI option shows its loan terms before the tap.
  await expect(page.getByTestId("event-card")).toHaveAttribute("data-card", "phone_upgrade");
  const emi = page.getByTestId("option-emi");
  await expect(emi).toContainText("₹0");
  await expect(emi).toContainText("?");
  await expect(emi.getByTestId("loan-total")).toBeVisible();
  await expect(emi).toContainText("TOTAL YOU WILL PAY");
  await expect(emi).toContainText("a year");
  await expect(page.getByTestId("option-used")).toContainText("−₹4,000");
  await emi.click();
  await expect(page.getByTestId("hud-debt")).not.toContainText("₹0");
  await page.getByTestId("next-year").click();
  await expect(page.getByTestId("year-17").locator("[data-seed-id]")).toHaveCount(1);
  await playTo(page, { untilAge: 18 });
  await expect(page.getByTestId("current-year").locator("[data-thread-target]")).toHaveCount(1);
  await expect(page.locator("[data-testid=threads] [data-thread]")).toHaveCount(1);
});

test("phone inbox: Tenali hint, flagging a scam gives Gyaan and a real fact", async ({ page }) => {
  await begin(page, 3);
  for (let i = 0; i < 200 && !(await vis(page.getByTestId("phone-prompt"))); i++) await step(page);
  await expect(page.getByTestId("phone-badge")).toBeVisible();
  await page.getByTestId("phone").click();
  await expect(page.getByTestId("message")).toContainText("bank account");
  await page.getByRole("button", { name: /Ask Tenali Rama/ }).click();
  await expect(page.getByTestId("tenali")).toBeVisible();
  const gyaan = Number((await page.getByTestId("hud-gyaan").innerText()).match(/\d+/)[0]);
  await page.getByRole("button", { name: "Flag 🚩" }).click();
  await expect(page.getByTestId("toast")).toContainText("Good catch");
  await expect(page.getByTestId("toast")).toContainText("1930");
  await expect.poll(async () => Number((await page.getByTestId("hud-gyaan").innerText()).match(/\d+/)[0])).toBeGreaterThan(gyaan);
});

test("language and region switch live; progress survives a reload", async ({ page }) => {
  await begin(page, 5);
  await page.getByRole("button", { name: "Seal the pots" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("lang").selectOption("te");
  await expect(page.getByTestId("hud-wallet")).toContainText("పర్సు");
  await page.getByTestId("region").selectOption("north");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("mentor")).toHaveAccessibleName(/నానీ/);
  await page.reload();
  await expect(page.getByTestId("continue")).toBeVisible();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("actions")).toBeVisible();
});

test("assumptions panel shows ranges with Sheikh Chilli's pot", async ({ page }) => {
  await begin(page, 2);
  await page.getByRole("button", { name: "Assumptions" }).click();
  await expect(page.getByTestId("assumptions")).toContainText("1 in 10 families");
  await expect(page.getByText(/Likely range/).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /not promises/ }).first()).toBeVisible();
});

test("chitti auction: 30 seconds, NPC bids, what you gave up", async ({ page }) => {
  await page.clock.install();
  await begin(page, 4);
  await playTo(page, { untilAge: 19 });
  await page.getByTestId("next-year").click();
  for (let i = 0; i < 100 && !(await vis(page.getByTestId("actions"))); i++) await step(page);
  await page.getByTestId("tool-chitti").click();
  await page.getByRole("button", { name: /Start auction/ }).click();
  await page.clock.runFor(8000);
  await expect(page.getByTestId("chitti-auction")).toContainText("Member");
  await page.getByRole("button", { name: /discount/ }).click();
  await page.clock.runFor(24000);
  await expect(page.getByTestId("chitti-result")).toContainText("like paying");
  await page.getByRole("button", { name: "Back to my year" }).click();
  await expect(page.getByTestId("actions")).toContainText("2 of 3 left");
});
