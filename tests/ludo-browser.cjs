const { chromium, expect } = require("@playwright/test");
const { newLudo } = require("../shared/dist/ludo");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    window.__ludoDice = [];
    Object.defineProperty(crypto, "getRandomValues", {
      value: (array) => {
        if (window.__ludoDice.length) {
          array[0] = window.__ludoDice.shift() - 1;
          return array;
        }
        return original(array);
      },
    });
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
  });
  const base = process.env.WEB_URL || "http://localhost:4000";
  const getSave = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("rwog_ludo_v1")));
  const roll = async (die) => {
    await page.evaluate((die) => window.__ludoDice.push(die), die);
    await page.getByRole("button", { name: "Roll die", exact: true }).click();
  };
  const load = async (state) => {
    await page.evaluate(
      (s) => localStorage.setItem("rwog_ludo_v1", JSON.stringify(s)),
      state,
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "The board", exact: true }),
    ).toBeVisible();
  };
  await page.goto(base + "/");
  await page.getByRole("link", { name: "Play Ludo with friends" }).click();
  await expect(page).toHaveURL(/ludo/);
  await expect(
    page.getByRole("heading", { name: "Who’s playing?", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Player 1 name").fill("Alice");
  await page.getByLabel("Player 2 name").fill("Bob");
  await page.getByRole("button", { name: "Start Ludo", exact: true }).click();
  await expect(page.getByRole("button", { name: /token \d:/ })).toHaveCount(8);
  await roll(3);
  await expect(page.locator('p[role="status"]')).toContainText("Bob, roll next");
  await roll(6);
  await expect(
    page
      .getByRole("group", { name: "Available moves", exact: true })
      .getByRole("button"),
  ).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Roll die", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Bob Yellow token 1: yard", exact: true })
    .click();
  await expect(page.locator('p[role="status"]')).toContainText(
    "Six earns another roll",
  );
  await roll(2);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Move token 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move token 1", exact: true }).click();
  expect((await getSave()).players[1].tokens[0]).toBe(2);
  await expect(page.locator('p[role="status"]')).toContainText("Alice, roll next");
  // A real move captures using two players' different relative coordinates.
  let fixture = newLudo(2, ["Alice", "Bob"]);
  fixture.players[0].tokens[0] = 0;
  fixture.players[1].tokens[0] = 27;
  await load(fixture);
  await roll(1);
  await page.getByRole("button", { name: "Move token 1", exact: true }).click();
  expect((await getSave()).players[1].tokens[0]).toBe(-1);
  await expect(page.locator('p[role="status"]')).toContainText("captured 1 token");
  fixture = newLudo(2, ["Alice", "Bob"]);
  fixture.players[0].tokens = [55, 56, 56, 56];
  await load(fixture);
  await roll(1);
  await page.getByRole("button", { name: "Move token 1", exact: true }).click();
  await expect(page.locator('p[role="status"]')).toContainText("Alice wins");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Play again", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Roll die", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  expect((await getSave()).winner).toBe(null);
  expect((await getSave()).players[0].tokens).toEqual([-1, -1, -1, -1]);
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The board", exact: true }),
  ).toBeVisible();
  for (const count of [3, 4]) {
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await page
      .getByLabel("Players", { exact: true })
      .selectOption(String(count));
    await page.getByRole("button", { name: "Start Ludo", exact: true }).click();
    await expect(page.getByRole("button", { name: /token \d:/ })).toHaveCount(
      count * 4,
    );
  }
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("group", { name: "Ludo board", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `Ludo overflows at ${width}`,
    ).toBe(false);
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR || "/tmp"}/ludo-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() =>
    localStorage.setItem("rwog_ludo_v1", "broken json"),
  );
  await page.reload();
  await expect(page.locator('p[role="alert"]')).toContainText("could not be restored");
  await expect(
    page.getByRole("button", { name: "Start Ludo", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    "PASS Ludo browser: 2/3/4 players, legal dice/moves, board clicks, capture, pending-move reload, win/resume/rematch, reset confirmation, malformed saves, 3 viewport widths; no page exceptions or HTTP 5xx.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
