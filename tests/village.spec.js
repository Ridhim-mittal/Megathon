import { test, expect } from "@playwright/test";

async function enterVillage(page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Your first chapter" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Go home and divide your money" }),
  ).toBeVisible();
}
async function openJars(page) {
  await page
    .getByRole("button", { name: "Go home and divide your money" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A place for every rupee." }),
  ).toBeVisible();
}

test("Play enters the village; home opens jars; leaving preserves the budget", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enterVillage(page);
  await expect(
    page.getByRole("dialog", { name: "Your first chapter" }),
  ).not.toBeVisible();
  await page.mouse.click(650, 520);
  await expect
    .poll(() =>
      page.locator(".player-character").evaluate((el) => el.style.left),
    )
    .not.toBe("45%");
  await page.getByRole("button", { name: "Talk to Ammamma" }).click();
  await expect(page.locator(".dialogue-copy")).toContainText("Some for today");
  await page.getByRole("button", { name: "Kirana shop", exact: true }).click();
  await expect(page.locator(".dialogue-copy")).toContainText("shop can wait");
  await openJars(page);
  await page
    .getByRole("button", { name: "Remove ₹100 from My big dream", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Let’s live this month" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Your first chapter" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Go home and divide your money" }),
  ).toBeFocused();
  await openJars(page);
  await expect(page.locator(".purple output")).toHaveText("₹500");
  await page
    .getByRole("button", { name: "Add ₹100 to Just in case", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to village", exact: true })
    .click();
  await page.getByRole("button", { name: "Return to title screen" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await openJars(page);
  await expect(page.locator(".green output")).toHaveText("₹300");
  await expect(page.locator(".purple output")).toHaveText("₹500");
  expect(errors).toEqual([]);
});

test("repair and fair parallel-life comparison work inside the game panel", async ({
  page,
}) => {
  await enterVillage(page);
  await openJars(page);
  await page
    .getByRole("button", {
      name: "Remove ₹100 from Everyday needs",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Add ₹100 to Little joys", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Let’s live this month" }),
  ).toBeDisabled();
  await expect(page.locator(".action-row")).toContainText("at least ₹800");
  await page
    .getByRole("button", { name: "Remove ₹100 from Little joys", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add ₹100 to Everyday needs", exact: true })
    .click();
  await page.getByRole("button", { name: "Let’s live this month" }).click();
  await page.getByRole("button", { name: /Protect my laptop jar/ }).click();
  await expect(page.locator(".summary-card")).toContainText("₹440");
  await page.getByRole("button", { name: "Try a parallel life" }).click();
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", {
        name: "Remove ₹100 from My big dream",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Add ₹100 to Just in case", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Try this little plan" }).click();
  await expect(page.locator(".choice-button")).toHaveCount(1);
  await page
    .getByRole("button", { name: /Same approach: Protect my laptop jar/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your new plan avoided ₹40 in interest.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a new story" }).click();
  await page.getByRole("button", { name: "Let’s live this month" }).click();
  await page.getByRole("button", { name: /Use my savings first/ }).click();
  await expect(page.locator(".summary-card")).toContainText("₹200");
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
]) {
  test(`village and jars fit a ${viewport.width}×${viewport.height} laptop window`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await enterVillage(page);
    await page
      .getByRole("button", { name: "How to play", exact: true })
      .click();
    await expect(page.locator(".guide-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".guide-dialog")).not.toBeVisible();
    await openJars(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    const panel = page.locator(".game-panel");
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await expect(
      page.getByRole("button", { name: "Let’s live this month" }),
    ).toBeInViewport();
  });
}
