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

async function toFirstYear(page) {
  await expect(page.getByRole("heading", { name: "Choose your life" })).toBeVisible();
  await expect(page.getByText("Coming soon")).toBeVisible();
  await page.getByRole("button", { name: "Live this life" }).click();
  await expect(page.getByText("MEET YOUR FAMILY")).toBeVisible();
  await page.getByRole("button", { name: "Skip the story" }).click();
  await expect(page.getByRole("heading", { name: "What is your big dream?" })).toBeVisible();
  const startButton = page.getByRole("button", { name: "Start my life at 11" });
  await expect(startButton).toBeDisabled();
  await page.getByRole("radio").first().click();
  await page.getByLabel("What should Ammamma call you?").fill("Sravani");
  await startButton.click();
  await expect(page.getByRole("heading", { name: "Give every rupee a home" })).toBeVisible();
}

// Play cards (pressing 1 to pick the first choice) until the year-end summary.
async function playYear(page) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator(".yearend-view").count()) return;
    if (await page.locator(".card-view").count()) {
      await page.keyboard.press("1");
      await expect(page.locator(".outcome-view")).toBeVisible();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    } else if (await page.locator(".minigame-view").count()) {
      await page.getByRole("button", { name: "Skip the desk" }).click();
    } else {
      await page.waitForTimeout(100);
    }
  }
}

test("start → choose village → choose dream → play one year → year-end summary", async ({ page }) => {
  const errors = await start(page);
  await toFirstYear(page);

  // Budget: the HUD shows age and stage; jars move in steps and must cover needs.
  await expect(page.locator(".hud-age")).toContainText("Age 11");
  await expect(page.locator(".hud-age")).toContainText("Pocket money");
  const needs = page.locator(".jar-card.peach output");
  const before = await needs.innerText();
  await page.getByRole("button", { name: /^Remove ₹10 from Needs$/ }).click();
  await expect(needs).not.toHaveText(before);
  await page.getByRole("button", { name: /^Add ₹10 to Little joys$/ }).click();
  await page.getByRole("button", { name: "Live this year" }).click();

  // Shop: buying spends the joys jar.
  await expect(page.getByRole("heading", { name: "Treat yourself?" })).toBeVisible();
  const buy = page.locator(".shop-item .secondary-button:not([disabled])").first();
  if (await buy.count()) {
    await buy.click();
    await expect(page.locator(".shop-item.bought")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Done shopping" }).click();

  // A card, its outcome and Why?
  await expect(page.locator(".event-card")).toBeVisible();
  await expect(page.locator(".choice").first()).toBeVisible();
  await page.locator(".choice").first().click();
  await expect(page.getByText("WHAT HAPPENED")).toBeVisible();
  const why = page.getByRole("button", { name: "Why?" });
  if (await why.count()) {
    await why.click();
    await expect(page.locator(".why-text")).toBeVisible();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await playYear(page);
  await expect(page.locator(".yearend-view")).toBeVisible();
  await expect(page.getByText("AGE 11 · THE YEAR'S END")).toBeVisible();
  await expect(page.locator(".headline h2")).not.toBeEmpty();
  await page.getByRole("button", { name: "On to age 12" }).click();
  await expect(page.locator(".hud-age")).toContainText("Age 12");
  expect(errors).toEqual([]);
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
  await expect(page.getByRole("heading", { name: "हर रुपये को घर दें" })).toBeVisible();
  // Nothing in the HUD or the stage panel overflows horizontally.
  for (const selector of [".life-topbar", ".life-stage", ".life-side"]) {
    const overflow = await page.locator(selector).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, selector).toBeLessThanOrEqual(1);
  }
  await page.getByRole("combobox", { name: "भाषा" }).selectOption("te");
  await expect(page.getByRole("heading", { name: "ప్రతి రూపాయికి ఒక ఇల్లు ఇవ్వండి" })).toBeVisible();
});

test("progress is saved: the title offers Continue after a reload", async ({ page }) => {
  await start(page);
  await toFirstYear(page);
  await page.getByRole("button", { name: "Live this year" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue my life" })).toBeVisible();
  await page.getByRole("button", { name: "Continue my life" }).click();
  await expect(page.locator(".hud-age")).toContainText("Age 11");
});

test("Ask Ammamma answers offline", async ({ page }) => {
  await start(page);
  await toFirstYear(page);
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
    await toFirstYear(page);
    const stage = await page.locator(".life-stage").boundingBox();
    expect(stage.x + stage.width).toBeLessThanOrEqual(size.width);
    expect(stage.y + stage.height).toBeLessThanOrEqual(size.height);
    await expect(page.getByRole("button", { name: "Live this year" })).toBeInViewport();
  });
}
