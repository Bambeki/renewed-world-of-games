const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    const writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });
    page.on("request", (r) => {
      if (r.url().includes("/game") && r.method() !== "GET")
        writes.push(r.url());
    });
    const base = process.env.WEB_URL || "http://localhost:4000";
    const key = `arcade${Date.now()}`;
    await page.goto(base + "/register");
    await page.getByLabel("Email", { exact: true }).fill(key + "@example.com");
    await page.getByLabel("Username", { exact: true }).fill(key);
    await page.getByLabel("Password", { exact: true }).fill("ArcadeTest2026!");
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole("link", { name: "Matches", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Play live exhibition", exact: true }),
    ).toBeVisible();
    const league = await page.evaluate(() =>
      fetch("http://localhost:4001/api/v1/game", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("rwog_token")}`,
        },
      }).then((r) => r.json()),
    );
    await page
      .getByRole("button", { name: "Play live exhibition", exact: true })
      .click();
    const match = page.getByRole("region", {
      name: "Playable football match",
      exact: true,
    });
    const pitch = match.getByRole("group", { name: /Football pitch/ });
    await expect(match).toBeVisible();
    await expect(match.getByTestId("home-score")).toHaveText("0");
    await expect(match.getByTestId("match-clock")).toContainText("Paused");
    await page.clock.install();
    await match
      .getByRole("button", { name: "Start match", exact: true })
      .click();
    const player = match.locator("svg g[transform]").nth(5);
    const before = await player.getAttribute("transform");
    await page.keyboard.down("ArrowDown");
    await page.clock.runFor(300);
    await page.keyboard.up("ArrowDown");
    expect(await player.getAttribute("transform")).not.toBe(before);
    await page.keyboard.press("p");
    await page.clock.runFor(100);
    await match.getByRole("button", { name: "Shoot", exact: true }).click();
    await page.clock.runFor(100);
    await match
      .getByRole("button", { name: "Switch player", exact: true })
      .click();
    await page.clock.runFor(100);
    await match
      .getByRole("button", { name: "Pause match", exact: true })
      .click();
    const paused = await pitch.locator("svg").innerHTML();
    await page.clock.runFor(2000);
    expect(await pitch.locator("svg").innerHTML()).toBe(paused);
    page.once("dialog", (d) => d.dismiss());
    await match
      .getByRole("button", { name: "Restart exhibition", exact: true })
      .click();
    expect(await pitch.locator("svg").innerHTML()).toBe(paused);
    page.once("dialog", (d) => d.accept());
    await match
      .getByRole("button", { name: "Restart exhibition", exact: true })
      .click();
    await expect(match.getByTestId("match-clock")).toContainText("0′ Paused");
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `overflow at ${width}`,
      ).toBe(false);
      await expect(
        match.getByRole("button", { name: "Shoot", exact: true }),
      ).toBeVisible();
      if (process.env.ARCADE_SCREENSHOTS)
        await match.screenshot({
          path: process.env.ARCADE_SCREENSHOTS + `/arcade-${width}.png`,
        });
    }
    await match
      .getByRole("button", { name: "Start match", exact: true })
      .click();
    await match
      .getByRole("button", { name: "Move down", exact: true })
      .scrollIntoViewIfNeeded();
    const point = await match
      .getByRole("button", { name: "Move down", exact: true })
      .boundingBox();
    const touchBefore = await player.getAttribute("transform");
    await page.mouse.move(
      point.x + point.width / 2,
      point.y + point.height / 2,
    );
    await page.mouse.down();
    await page.clock.runFor(300);
    await page.mouse.up();
    expect(await player.getAttribute("transform")).not.toBe(touchBefore);
    await page.clock.runFor(122000);
    await expect(match.getByTestId("match-clock")).toContainText("Full time");
    await expect(match.getByRole("alert")).toContainText("Exhibition complete");
    await expect(
      match.getByRole("button", { name: "Resume match", exact: true }),
    ).toBeDisabled();
    const after = await page.evaluate(() =>
      fetch("http://localhost:4001/api/v1/game", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("rwog_token")}`,
        },
      }).then((r) => r.json()),
    );
    expect(after.season).toEqual(league.season);
    expect(after.team.budget).toBe(league.team.budget);
    expect(writes).toEqual([]);
    await match
      .getByRole("button", { name: "Close match", exact: true })
      .click();
    await expect(match).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log(
      "PASS playable football: keyboard/touch movement, action buttons, pause, reset cancel/confirm, full time, close; 3 viewport widths; league unchanged; no page/5xx errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
