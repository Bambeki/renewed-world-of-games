const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
  });
  const base = process.env.WEB_URL || "http://localhost:4000";
  const key = `browser${Date.now()}`;
  const email = `${key}@example.com`,
    password = "BrowserTest2026!";
  await page.goto(base + "/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.goto(base + "/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Username", { exact: true }).fill(key);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `${key}'s Team`, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Squad", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(18);
  await page.locator("tbody tr a").first().click();
  await expect(
    page.getByRole("heading", { name: "Attributes", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Starting XI", exact: true }).click();
  await page.getByLabel("Formation", { exact: true }).selectOption("4-3-3");
  await page
    .getByRole("button", { name: "Save starting XI", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Starting XI saved");
  await page.reload();
  await expect(page.getByLabel("Formation", { exact: true })).toHaveValue(
    "4-3-3",
  );
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await page
    .getByRole("button", { name: "Simulate league matchday 1", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Matchday complete");
  await expect(
    page.getByRole("region", { name: "Match report" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "League", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.locator("tr.your-club td").nth(2)).toHaveText("1");
  await page.getByRole("link", { name: "Transfers", exact: true }).click();
  await page.getByRole("button", { name: "Sign Silva", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Transfer completed");
  await expect(
    page.getByRole("button", { name: "Sign Silva", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Transfer activity", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".fixtures article")
    .filter({ hasText: "Amari Silva" })
    .getByRole("button", { name: "Sell player", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Transfer completed");
  await expect(
    page.locator(".fixtures article").filter({ hasText: "Amari Silva" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Club settings", exact: true }).click();
  await page.getByLabel("Team name", { exact: true }).fill("Browser United");
  await page.getByRole("button", { name: "Save club", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Club identity saved");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/dashboard",
      "/lineup",
      "/matches",
      "/league",
      "/transfers",
      "/squad",
      "/team",
    ]) {
      await page.goto(base + route);
      if (route === "/") await expect(page.getByRole("heading", {name:/Build your club/})).toBeVisible();
      else if (route === "/squad")
        await expect(page.locator("tbody tr")).toHaveCount(18);
      else if (route === "/team")
        await expect(page.getByLabel("Team name", { exact: true })).toHaveValue(
          "Browser United",
        );
      else
        await expect(
          page.getByRole("heading", { name: "Browser United", exact: true }),
        ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${route} overflows at ${width}`).toBe(false);
    }
  }
  await page.goto(base + "/dashboard");
  await expect(
    page.getByRole("heading", { name: "Browser United", exact: true }),
  ).toBeVisible();
  if (process.env.SCREENSHOT_DIR) {
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/dashboard-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/dashboard-desktop.png",
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  expect(errors).toEqual([]);
  console.log(
    "PASS browser journey: registration, login, squad/details, lineup save/reload, match/report, standings, buy/sell, club edit, logout; 8 routes × 3 viewport widths; no page errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
