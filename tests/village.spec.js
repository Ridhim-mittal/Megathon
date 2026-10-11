import { test, expect } from "@playwright/test";

// ?seed=demo gives the same life every run.
async function start(page, { lang = "English" } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  // "Who are you?" opens on the title screen: pick a look and a name.
  const hero = page.getByRole("dialog", { name: "Who are you?" });
  await hero.getByRole("radio", { name: "Girl" }).click();
  await expect(hero.getByRole("radio", { name: "Girl" })).toHaveAttribute("aria-checked", "true");
  await hero.getByLabel("What should Ammamma call you?").fill("Sravani");
  await expect(hero).toContainText("Namaste, Sravani!");
  await hero.getByRole("button", { name: "Let's go!" }).click();
  await expect(page.getByRole("heading", { name: "Choose your language" })).toBeVisible();
  await page.getByRole("button", { name: lang }).click();
  return errors;
}

// Storyline → intro → dream → the prologue's title card → budget.
// Every mini-game lives in the Arcade; each one shows a skippable ad as it starts.
async function openFromArcade(page, tile) {
  await page.getByRole("button", { name: "Arcade" }).click();
  await page.getByRole("button", { name: tile }).click();
  await page.getByRole("button", { name: /^Skip ad/ }).click({ timeout: 10000 });
}

async function toPrologue(page) {
  await expect(page.getByRole("heading", { name: "Choose your life" })).toBeVisible();
  await expect(page.getByText("Coming soon")).toBeVisible();
  await page.getByRole("button", { name: "Live this life" }).click();
  await expect(page.getByText("MEET YOUR FAMILY")).toBeVisible();
  await page.getByRole("button", { name: "Skip the story" }).click();
  await expect(page.getByRole("heading", { name: "What is your big dream?" })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Start my life at 11" });
  await expect(startButton).toBeDisabled();
  await page.getByRole("radiogroup", { name: "What is your big dream?" }).getByRole("radio").first().click();
  await expect(page.locator(".dream-you")).toContainText("Sravani");
  await startButton.click();
  await expect(page.getByRole("heading", { name: "The Tin Box" })).toBeVisible();
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("heading", { name: "Give every rupee a home" })).toBeVisible();
}

// Follow the objective: walk there, and pick the choice whose label matches (or the first open one).
async function playScene(page, label) {
  await page.locator(".objective-go").click();
  await expect(page.locator(".card-view")).toBeVisible({ timeout: 20000 });
  const choice = label ? page.locator(".choice:not(.locked)", { hasText: label }) : page.locator(".choice:not(.locked)").first();
  await choice.first().click();
}

// The first scene is Rat Guard: round 1 only offers the tin box (and is lost), then either.
async function playRatGuard(page, second) {
  await page.locator(".objective-go").click();
  const game = page.getByRole("dialog", { name: "Rat Guard" });
  await expect(game).toBeVisible({ timeout: 20000 });
  await expect(game.getByRole("button", { name: /Bank account/ })).toBeDisabled();
  await game.getByRole("button", { name: /Tin box/ }).click();
  await expect(game.locator(".rg-chip").first()).toContainText("SCORE");
  await game.getByRole("button", { name: "Skip" }).click();
  await expect(game.getByText("₹500 chewed")).toBeVisible();
  const pickSecond = game.getByRole("button", { name: second === "bank" ? /Bank account/ : /Tin box/ });
  await expect(pickSecond).toBeEnabled({ timeout: 10000 });
  await pickSecond.click();
  await game.getByRole("button", { name: "Skip" }).click();
  await game.getByRole("button", { name: "Continue" }).click({ timeout: 10000 });
  await expect(game).not.toBeVisible();
}

async function continueOutcome(page) {
  await expect(page.locator(".outcome-view")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("prologue: follow the objective, live three scenes, reach an outcome and its flowchart", async ({ page }) => {
  test.setTimeout(120000);
  const errors = await start(page);
  await toPrologue(page);

  await expect(page.locator(".hud-chapter")).toContainText("Childhood");
  await page.getByRole("button", { name: "Live this year" }).click();

  // The objective says where to go; a trail on the map leads there.
  const objective = page.locator(".objective");
  await expect(objective).toContainText("Walk home. Ammamma is calling you.");
  await expect(objective.getByRole("button", { name: "Go to Home" })).toBeVisible();

  await playRatGuard(page, "bank");
  await expect(objective).toContainText("Kavitha akka");
  await playScene(page, "one for me");
  await continueOutcome(page);
  await expect(objective).toContainText("jatara");
  await playScene(page, "notebook first");
  await continueOutcome(page);

  // The chapter's outcome, and the flowchart of what else could have happened.
  await expect(page.getByRole("heading", { name: "The tin box retired" })).toBeVisible();
  await expect(page.locator(".flowchart")).toBeVisible();
  await expect(page.locator(".flow-node.outcome.reached")).toHaveCount(1);
  await expect(page.locator(".flow-node li.taken")).toHaveCount(3);
  await page.getByRole("tab", { name: "Money & years" }).click();
  await expect(page.locator(".years-list li")).toHaveCount(4);
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.getByRole("heading", { name: "The OTP Heist" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a very bad choice flashes STOP; thinking again keeps the scene open", async ({ page }) => {
  test.setTimeout(150000);
  await start(page);
  await toPrologue(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await playRatGuard(page, "tin");
  await playScene(page, "Buy the steel box");
  await continueOutcome(page);
  await playScene(page, "notebook first");
  await continueOutcome(page);
  await page.getByRole("button", { name: "Next chapter" }).click();
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByRole("button", { name: "Live this year" }).click();
  await playScene(page, "Hide it at home");
  await continueOutcome(page);

  // The OTP call: a countdown, and a STOP before reading the OTP aloud.
  await page.locator(".objective-go").click();
  await expect(page.locator(".timer-bar")).toBeVisible({ timeout: 20000 });
  await page.locator(".choice", { hasText: "Read the OTP aloud" }).click();
  const stop = page.getByRole("alertdialog");
  await expect(stop).toBeVisible();
  await expect(stop).toContainText("Do not share");
  await expect(stop.getByRole("button", { name: "Do it anyway" })).toBeDisabled();
  await stop.getByRole("button", { name: "Think again" }).click();
  await expect(stop).not.toBeVisible();
  await expect(page.locator(".card-view")).toBeVisible();
  await page.locator(".choice", { hasText: "Hang up" }).click();
  await expect(page.getByText("WHAT HAPPENED")).toBeVisible();
});

test("the player walks with the arrow keys", async ({ page }) => {
  await start(page);
  await toPrologue(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await expect(page.locator(".objective")).toBeVisible();
  const labels = page.locator(".map-labels");
  const before = await labels.evaluate((el) => el.style.transform);
  // Down from the front of home: the camera follows the player.
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(1200);
  await page.keyboard.up("ArrowDown");
  await expect.poll(() => labels.evaluate((el) => el.style.transform)).not.toBe(before);
});

test("the language can be switched at any time and Hindi/Telugu fit the layout", async ({ page }) => {
  await start(page, { lang: "తెలుగు" });
  await expect(page.getByRole("heading", { name: "మీ జీవితాన్ని ఎంచుకోండి" })).toBeVisible();
  await page.getByRole("combobox", { name: "భాష" }).selectOption("hi");
  await expect(page.getByRole("heading", { name: "अपनी ज़िंदगी चुनें" })).toBeVisible();
  await page.getByRole("button", { name: "यह ज़िंदगी जिएँ" }).click();
  await page.getByRole("button", { name: "कहानी छोड़ें" }).click();
  await page.getByRole("radio").nth(2).click();
  await page.getByRole("button", { name: "11 साल की उम्र से शुरू करें" }).click();
  await expect(page.getByRole("heading", { name: "टिन का डिब्बा" })).toBeVisible();
  await page.getByRole("button", { name: "शुरू करें" }).click();
  await expect(page.getByRole("heading", { name: "हर रुपये को घर दें" })).toBeVisible();
  for (const selector of [".map-hud", ".game-window"]) {
    const overflow = await page.locator(selector).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, selector).toBeLessThanOrEqual(1);
  }
  await page.getByRole("combobox", { name: "भाषा" }).selectOption("te");
  await expect(page.getByRole("heading", { name: "ప్రతి రూపాయికి ఒక ఇల్లు ఇవ్వండి" })).toBeVisible();
  await page.locator(".window-budget .primary-button").click();
  await expect(page.locator(".objective")).toContainText("అమ్మమ్మ");
});

test("progress is saved: the title offers Continue after a reload", async ({ page }) => {
  await start(page);
  await toPrologue(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await expect(page.locator(".objective")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue my life" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a new life" })).toBeVisible();
  await page.getByRole("button", { name: "Continue my life" }).click();
  await expect(page.locator(".hud-chapter")).toContainText("Age 11");
  await expect(page.locator(".objective")).toContainText("Ammamma");
});

test("Ask Ammamma answers offline", async ({ page }) => {
  await start(page);
  await toPrologue(page);
  await page.getByRole("button", { name: "Ask Ammamma" }).first().click();
  const panel = page.getByRole("dialog", { name: "Ask Ammamma" });
  await expect(panel).toBeVisible();
  await panel.getByLabel(/Ask about money/).fill("What is an EMI?");
  await panel.getByRole("button", { name: "Ask" }).click();
  await expect(panel.locator(".bubble.ammamma").last()).not.toHaveText(/adjusting/, { timeout: 10000 });
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
});

for (const size of [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
]) {
  test(`laptop layout ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await start(page);
    await toPrologue(page);
    const win = await page.locator(".game-window").boundingBox();
    expect(win.x + win.width).toBeLessThanOrEqual(size.width);
    expect(win.y + win.height).toBeLessThanOrEqual(size.height);
    await expect(page.getByRole("button", { name: "Live this year" })).toBeInViewport();
    await page.getByRole("button", { name: "Live this year" }).click();
    const objective = await page.locator(".objective").boundingBox();
    expect(objective.x).toBeGreaterThanOrEqual(0);
    expect(objective.x + objective.width).toBeLessThanOrEqual(size.width);
  });
}

test("the interest race mini-game opens from the title: a wrong run offers Try again, a right run wins", async ({ page }) => {
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openFromArcade(page, /Interest race/);
  const game = page.locator(".ir-layer");
  await expect(game.getByRole("heading", { name: "Interest race" })).toBeVisible();
  await game.getByRole("button", { name: "Start the race" }).click();
  const interest = async () =>
    (await game.locator(".ir-offer").evaluateAll((els) => els.map((e) => [...e.querySelectorAll(".ir-row b")].map((b) => Number(b.textContent.replace(/[^0-9]/g, ""))))))
      .map(([p, r, t]) => (p * r * t) / 100);
  const playRound = async (right) => {
    const si = await interest();
    const best = si.indexOf(Math.max(...si));
    await game.locator(".ir-offer").nth(right ? best : (best + 1) % 3).click();
    await game.locator(".ir-feedback .primary-button").click();
  };
  for (let i = 0; i < 5; i++) await playRound(false);
  await expect(game.getByRole("heading", { name: "So close!" })).toBeVisible();
  await game.getByRole("button", { name: "Try again" }).click();
  for (let i = 0; i < 5; i++) await playRound(true);
  await expect(game.getByRole("heading", { name: "Scholarship won!" })).toBeVisible();
  await expect(game).toContainText("5 of 5 right");
});

test("Rat Guard opens from the title: the bank unlocks after the cutscene, rats bounce off the vault, play again", async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openFromArcade(page, /Rat Guard/);
  const game = page.getByRole("dialog", { name: "Rat Guard" });
  await expect(game.getByRole("button", { name: /Bank account/ })).toBeDisabled();
  await game.getByRole("button", { name: /Tin box/ }).click();
  // Swat a few with Space, then skip to the cutscene.
  await page.waitForTimeout(2500);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press(" ");
    await page.waitForTimeout(400);
  }
  await game.getByRole("button", { name: "Skip" }).click();
  await expect(game.getByText("₹500 chewed")).toBeVisible();
  await game.getByRole("button", { name: /Bank account/ }).click({ timeout: 10000 });
  await expect(game.locator(".rg-chip").nth(1)).toContainText("VAULT");
  // Rats clang off the vault; after five the rest give up.
  await expect(game.getByText("The vault holds!")).toBeVisible({ timeout: 45000 });
  await expect(game.getByText("Not one rupee lost!")).toBeVisible({ timeout: 10000 });
  await expect(game.locator(".rg-final")).toContainText("Rats shooed");
  await game.getByRole("button", { name: "Play again" }).click();
  await expect(game.getByRole("button", { name: /Bank account/ })).toBeDisabled();
  await game.getByRole("button", { name: "Close" }).click();
  await expect(game).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("the title can jump straight to the town of the first job without touching the saved life", async ({ page }) => {
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Visit the town (First Job)" }).click();
  await expect(page.locator(".mapgame")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".hud-chapter")).toContainText("Age 22");
  expect(await page.evaluate(() => window.localStorage.getItem("lakshyam.life"))).toBeNull();
});

test("SIP Garden opens from the arcade: invest in every lane, Auto-SIP, pause, and a report at the end", async ({ page }) => {
  test.setTimeout(150000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?seed=demo&speed=16");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openFromArcade(page, /SIP Garden/);
  const game = page.getByRole("dialog", { name: "SIP Garden" });
  await expect(game.getByRole("heading", { name: "SIP Garden" })).toBeVisible();
  await expect(game.locator(".sg-cast.thieves li")).toHaveCount(4);
  await game.getByRole("button", { name: "Start" }).click();
  await expect(game.locator(".sg-cash")).toContainText("₹400");
  await expect(game.locator(".sg-lane").first()).toContainText("NAV ₹");
  await game.getByRole("button", { name: "Invest ₹100 in Equity fund" }).click();
  await game.getByRole("button", { name: "Invest ₹100 in Debt fund" }).click();
  await page.keyboard.press("3");
  await expect(game.locator(".sg-cash")).not.toContainText("₹400");
  await game.getByRole("button", { name: /Auto-SIP: OFF/i }).click();
  await expect(game.getByRole("button", { name: /Auto-SIP: ON/i })).toBeVisible();
  await game.getByRole("button", { name: "Pause" }).click();
  await expect(game.getByText("Paused")).toBeVisible();
  await game.locator(".sg-paused").getByRole("button", { name: "Resume" }).click();
  // Five years later (sped up): won or lost, the report shows where the money went.
  await expect(game.locator(".sg-end")).toBeVisible({ timeout: 120000 });
  await expect(game.locator(".sg-bars li")).toHaveCount(4);
  await expect(game.locator(".sg-stats")).toContainText("Portfolio worth");
  await expect(game.locator(".sg-sipbox li")).toHaveCount(3);
  await game.getByRole("button", { name: "Play again" }).click();
  await expect(game.getByRole("button", { name: "Start" })).toBeVisible();
  await game.locator(".sg-card").getByRole("button", { name: "Close" }).click();
  await expect(game).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("the price snake opens from the arcade, and a crash shows how prices grew", async ({ page }) => {
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openFromArcade(page, /Price Snake/);
  await expect(page.getByText("Meet Mehngai, the price snake.")).toBeVisible();
  await page.locator(".snake-go").click();
  await expect(page.locator(".snake-weight")).toContainText("₹100");
  // With no turns the snake runs into the wall.
  await expect(page.locator(".snake-result")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".snake-headline")).toBeVisible();
});
