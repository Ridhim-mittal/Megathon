import { test, expect } from "@playwright/test";

// ?seed=demo gives the same life every run.
async function start(page, { lang = "English" } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?seed=demo");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose your language" })).toBeVisible();
  await page.getByRole("button", { name: lang }).click();
  return errors;
}

// Storyline → intro → dream and look → chapter 1 title card → budget.
async function toFirstChapter(page) {
  await expect(page.getByRole("heading", { name: "Choose your life" })).toBeVisible();
  await expect(page.getByText("Coming soon")).toBeVisible();
  await page.getByRole("button", { name: "Live this life" }).click();
  await expect(page.getByText("MEET YOUR FAMILY")).toBeVisible();
  await page.getByRole("button", { name: "Skip the story" }).click();
  await expect(page.getByRole("heading", { name: "What is your big dream?" })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Start my life at 11" });
  await expect(startButton).toBeDisabled();
  await page.getByRole("radiogroup", { name: "What is your big dream?" }).getByRole("radio").first().click();
  await page.getByRole("radio", { name: "Girl" }).click();
  await page.getByLabel("What should Ammamma call you?").fill("Sravani");
  await startButton.click();
  await expect(page.getByRole("heading", { name: "School life" })).toBeVisible();
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("heading", { name: "Give every rupee a home" })).toBeVisible();
}

// Live whatever opens (card, outcome, mini-game) until we are back on the map.
async function liveEvent(page) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator(".card-view").count()) {
      await page.keyboard.press("1");
      await expect(page.locator(".outcome-view")).toBeVisible();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    } else if (await page.locator(".minigame-view").count()) {
      await page.getByRole("button", { name: "Skip the desk" }).click();
    } else if (await page.locator(".mapgame.phase-map").count()) {
      return;
    } else {
      await page.waitForTimeout(100);
    }
  }
}

test("start → dream → chapter 1 → walk to a place → live its event → finish the chapter", async ({ page }) => {
  test.setTimeout(120000);
  const errors = await start(page);
  await toFirstChapter(page);

  // Budget: the HUD shows the chapter and age; jars move in steps and must cover needs.
  await expect(page.locator(".hud-chapter")).toContainText("School life");
  await expect(page.locator(".hud-chapter")).toContainText("Age 11");
  const needs = page.locator(".jar-card.peach output");
  const before = await needs.innerText();
  await page.getByRole("button", { name: /^Remove ₹10 from Needs$/ }).click();
  await expect(needs).not.toHaveText(before);
  await page.getByRole("button", { name: /^Add ₹10 to Little joys$/ }).click();
  await page.getByRole("button", { name: "Live this year" }).click();

  // The village: a quest log lists the places with events.
  await expect(page.locator(".mapgame.phase-map")).toBeVisible();
  await expect(page.locator(".map-canvas")).toBeVisible();
  const quest = page.locator(".quest-log");
  await expect(quest).toBeVisible();
  const first = quest.locator(".quest-go").first();
  await expect(first).toBeVisible();

  // Walk there: the event card opens at the door.
  await first.click();
  await expect(page.locator(".event-card")).toBeVisible({ timeout: 20000 });
  await page.locator(".choice").first().click();
  await expect(page.getByText("WHAT HAPPENED")).toBeVisible();
  const why = page.getByRole("button", { name: "Why?" });
  if (await why.count()) {
    await why.click();
    await expect(page.locator(".why-text")).toBeVisible();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await liveEvent(page);

  // Live every remaining event, then go home to finish the chapter.
  for (let i = 0; i < 12 && !(await page.locator(".quest-finish").count()); i++) {
    await quest.locator(".quest-go").first().click();
    await expect(page.locator(".game-window")).toBeVisible({ timeout: 20000 });
    await liveEvent(page);
  }
  await page.locator(".quest-finish").click();
  await page.getByRole("button", { name: "Finish chapter" }).click({ timeout: 20000 });
  await expect(page.getByText("CHAPTER COMPLETE")).toBeVisible();
  await expect(page.locator(".years-list li")).toHaveCount(4);
  await page.getByRole("button", { name: "Start chapter 2" }).click();
  await expect(page.getByRole("heading", { name: "College life" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the player walks with the arrow keys", async ({ page }) => {
  await start(page);
  await toFirstChapter(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await expect(page.locator(".mapgame.phase-map")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "स्कूल के दिन" })).toBeVisible();
  await page.getByRole("button", { name: "चलो चलें" }).click();
  await expect(page.getByRole("heading", { name: "हर रुपये को घर दें" })).toBeVisible();
  // Nothing in the HUD overflows horizontally.
  for (const selector of [".map-hud", ".game-window"]) {
    const overflow = await page.locator(selector).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, selector).toBeLessThanOrEqual(1);
  }
  await page.getByRole("combobox", { name: "भाषा" }).selectOption("te");
  await expect(page.getByRole("heading", { name: "ప్రతి రూపాయికి ఒక ఇల్లు ఇవ్వండి" })).toBeVisible();
});

test("progress is saved: the title offers Continue after a reload", async ({ page }) => {
  await start(page);
  await toFirstChapter(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await expect(page.locator(".mapgame.phase-map")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue my life" })).toBeVisible();
  await page.getByRole("button", { name: "Continue my life" }).click();
  await expect(page.locator(".hud-chapter")).toContainText("Age 11");
  await expect(page.locator(".quest-log")).toBeVisible();
});

test("Ask Ammamma answers offline", async ({ page }) => {
  await start(page);
  await toFirstChapter(page);
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
    await toFirstChapter(page);
    const win = await page.locator(".game-window").boundingBox();
    expect(win.x + win.width).toBeLessThanOrEqual(size.width);
    expect(win.y + win.height).toBeLessThanOrEqual(size.height);
    await expect(page.getByRole("button", { name: "Live this year" })).toBeInViewport();
    await page.getByRole("button", { name: "Live this year" }).click();
    const quest = await page.locator(".quest-log").boundingBox();
    expect(quest.y + quest.height).toBeLessThanOrEqual(size.height);
  });
}
