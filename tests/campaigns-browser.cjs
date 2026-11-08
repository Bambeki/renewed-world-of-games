const { chromium, expect } = require("@playwright/test");
const { adventurePlan, romanPlan } = require("./campaign-driver.cjs");
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
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });
    const base = process.env.WEB_URL || "http://localhost:4000";
    await page.goto(base + "/games");
    await expect(
      page.getByRole("heading", {
        name: "Choose your next world.",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Play Jack & Rose →", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Jack & Rose: Lost Signals",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Move east", exact: true }).click();
    const saved = await page.getByTestId("adventure-active").textContent();
    await page.reload();
    await expect(page.getByTestId("adventure-active")).toHaveText(saved);
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Restart mission", exact: true })
      .click();
    await expect(page.getByText("Actions: 1", { exact: true })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Restart mission", exact: true })
      .click();
    for (let level = 0; level < 3; level++) {
      await page
        .getByRole("group", { name: "Adventure map controls", exact: true })
        .focus();
      for (const a of adventurePlan(level).actions) {
        const key =
          a.type === "switch"
            ? "r"
            : a.type === "interact"
              ? "e"
              : a.dx === 1
                ? "ArrowRight"
                : a.dx === -1
                  ? "ArrowLeft"
                  : a.dy === 1
                    ? "ArrowDown"
                    : "ArrowUp";
        await page.keyboard.press(key);
      }
      await expect(
        page.getByRole("region", { name: "Adventure result", exact: true }),
      ).toContainText(level === 2 ? "Campaign complete" : "Mission complete");
      if (level < 2)
        await page
          .getByRole("button", { name: "Next mission", exact: true })
          .click();
    }
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Adventure result", exact: true }),
    ).toContainText("Campaign complete");
    await page
      .getByRole("button", { name: "Play campaign again", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Mission 1: The silent harbour",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(base + "/games/rome");
    await expect(
      page.getByRole("heading", { name: "Standards of Rome", exact: true }),
    ).toBeVisible();
    for (let mission = 0; mission < 3; mission++) {
      const plan = romanPlan(mission);
      expect(plan.state.status).toBe("won");
      let current = 1;
      const { loadEngine } = require("./campaign-driver.cjs");
      const engine = loadEngine("rome");
      let state = engine.newRome(mission);
      for (const a of plan.actions) {
        if (a.type === "select") {
          const u = state.units.find((u) => u.id === a.id);
          await page
            .getByRole("button", {
              name: new RegExp(`^Tile ${u.x + 1},${u.y + 1}, Roman `),
            })
            .click();
          current = a.id;
        } else if (a.type === "cell")
          await page
            .getByRole("button", {
              name: new RegExp(`^Tile ${a.x + 1},${a.y + 1}(,|$)`),
            })
            .click();
        else if (a.type === "recruit")
          await page
            .getByRole("button", { name: new RegExp(`^Recruit ${a.kind} ·`) })
            .click();
        else
          await page
            .getByRole("button", { name: "End turn", exact: true })
            .click();
        state = engine.romeAction(state, a);
      }
      expect(current).toBeGreaterThan(0);
      await expect(
        page.getByRole("region", { name: "Roman battle result", exact: true }),
      ).toContainText(mission === 2 ? "Campaign secured" : "Battle won");
      if (mission < 2)
        await page
          .getByRole("button", { name: "Next battle", exact: true })
          .click();
    }
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Roman battle result", exact: true }),
    ).toContainText("Campaign secured");
    await page
      .getByRole("button", { name: "Play campaign again", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Recruit archer · 8 gold", exact: true })
      .click();
    await expect(page.getByTestId("roman-gold")).toHaveText("Gold: 4");
    await page.reload();
    await expect(page.getByTestId("roman-gold")).toHaveText("Gold: 4");
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", { name: "Restart battle", exact: true })
      .click();
    await expect(page.getByTestId("roman-gold")).toHaveText("Gold: 4");
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Restart battle", exact: true })
      .click();
    await expect(page.getByTestId("roman-gold")).toHaveText("Gold: 12");
    await page
      .getByRole("button", { name: /^Tile 2,3, Roman legionary/ })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Tile 3,3", exact: true }).focus();
    await page.keyboard.press(" ");
    await expect(
      page.getByRole("button", { name: /^Tile 3,3, Roman legionary/ }),
    ).toBeVisible();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of ["/games", "/games/adventure", "/games/rome"]) {
        await page.goto(base + route);
        await expect(page.locator("h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          `${route} overflow at ${width}`,
        ).toBe(false);
        if (process.env.CAMPAIGN_SCREENSHOTS)
          await page.screenshot({
            path:
              process.env.CAMPAIGN_SCREENSHOTS +
              `/${route.split("/").at(-1)}-${width}.png`,
            fullPage: true,
          });
      }
    }
    for (const [route, key] of [
      ["adventure", "rwog.adventure.v1"],
      ["rome", "rwog.rome.v1"],
    ]) {
      await page.evaluate((k) => localStorage.setItem(k, "{bad-json"), key);
      await page.goto(base + "/games/" + route);
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "The saved campaign was corrupted" }),
      ).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    }
    const touch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const mobile = await touch.newPage();
    mobile.on("pageerror", (e) => errors.push(e.message));
    await mobile.goto(base + "/games/adventure");
    await mobile.getByRole("button", { name: "Move east", exact: true }).tap();
    await mobile
      .getByRole("button", { name: "Switch explorer", exact: true })
      .tap();
    await expect(mobile.getByTestId("adventure-active")).toHaveText(
      "Playing as Rose",
    );
    await expect(mobile.getByText("Actions: 1", { exact: true })).toBeVisible();
    await mobile.goto(base + "/games/rome");
    await mobile
      .getByRole("button", { name: /^Tile 2,3, Roman legionary/ })
      .tap();
    await mobile.getByRole("button", { name: "Tile 3,3", exact: true }).tap();
    await expect(
      mobile.getByRole("button", { name: /^Tile 3,3, Roman legionary/ }),
    ).toBeVisible();
    await touch.close();
    expect(errors).toEqual([]);
    console.log(
      "PASS campaigns Chromium: catalog, all 3 adventure missions and all 3 Roman battles via normal controls, completion, replay, reset cancel/confirm for both games, save/reload, corrupted saves, keyboard and emulated touch, 3 routes × 3 widths; no page/5xx errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
