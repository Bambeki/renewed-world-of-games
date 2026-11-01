const { chromium, expect } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });
    page.on("request", (r) => {
      if (r.url().includes("/game") && r.method() !== "GET")
        writes.push(r.url());
    });
    const base = process.env.WEB_URL || "http://localhost:4000",
      key = `three${Date.now()}`;
    await page.goto(base + "/register");
    await page.getByLabel("Email", { exact: true }).fill(key + "@example.com");
    await page.getByLabel("Username", { exact: true }).fill(key);
    await page.getByLabel("Password", { exact: true }).fill("ThreeMatch2026!");
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole("link", { name: "Matches", exact: true }).click();
    const league = await page.evaluate(() =>
      fetch("http://localhost:4001/api/v1/game", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("rwog_token")}`,
        },
      }).then((r) => r.json()),
    );
    await page
      .getByRole("button", { name: "Play 3D match", exact: true })
      .click();
    const match = page.getByRole("region", {
      name: "3D football exhibition",
      exact: true,
    });
    const controls = match.getByRole("group", {
      name: "3D match controls",
      exact: true,
    });
    const canvas = match.locator("canvas");
    await expect(
      match.getByRole("button", { name: "Start 3D match", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await expect(canvas).toHaveCount(1);
    await page.clock.install();
    await match
      .getByRole("button", { name: "Start 3D match", exact: true })
      .click();
    await page.clock.runFor(2300);
    await expect(controls).toHaveAttribute("data-phase", "playing");
    const before = await controls.getAttribute("data-controlled-z");
    await page.keyboard.down("ArrowDown");
    await page.keyboard.down("Shift");
    await page.clock.runFor(600);
    await page.keyboard.up("Shift");
    await page.keyboard.up("ArrowDown");
    expect(await controls.getAttribute("data-controlled-z")).not.toBe(before);
    await page.keyboard.down(" ");
    await page.clock.runFor(500);
    expect(Number(await controls.getAttribute("data-charge"))).toBeGreaterThan(
      0.3,
    );
    await page.keyboard.up(" ");
    await page.clock.runFor(200);
    await expect(controls).toHaveAttribute("data-shots", "1");
    for (const key of ["p", "l", "o", "j", "q", "c"]) {
      await page.keyboard.press(key);
      await page.clock.runFor(120);
    }
    if (process.env.FOOTBALL3D_SCREENSHOTS)
      await controls.screenshot({
        path: process.env.FOOTBALL3D_SCREENSHOTS + "/3d-playing.png",
      });
    const padBefore = await controls.getAttribute("data-controlled-x");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [
          {
            connected: true,
            mapping: "standard",
            axes: [0.8, 0],
            buttons: Array.from({ length: 17 }, () => ({
              pressed: false,
              value: 0,
            })),
          },
        ],
      });
      window.dispatchEvent(new Event("gamepadconnected"));
    });
    await page.clock.runFor(400);
    expect(await controls.getAttribute("data-controlled-x")).not.toBe(
      padBefore,
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [],
      });
      window.dispatchEvent(new Event("gamepaddisconnected"));
    });
    await match
      .getByRole("button", { name: "Pause 3D match", exact: true })
      .click();
    const position = await controls.getAttribute("data-controlled-z");
    await page.clock.runFor(1000);
    expect(await controls.getAttribute("data-controlled-z")).toBe(position);
    for (const camera of ["close", "broadcast", "follow"]) {
      await match.getByLabel("3D camera", { exact: true }).selectOption(camera);
      await page.clock.runFor(500);
      if (process.env.FOOTBALL3D_SCREENSHOTS)
        await controls.screenshot({
          path: process.env.FOOTBALL3D_SCREENSHOTS + `/3d-${camera}.png`,
        });
    }
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.clock.runFor(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `overflow at ${width}`,
      ).toBe(false);
      if (process.env.FOOTBALL3D_SCREENSHOTS)
        await match.screenshot({
          path: process.env.FOOTBALL3D_SCREENSHOTS + `/3d-${width}.png`,
        });
    }
    page.once("dialog", (d) => d.dismiss());
    await match
      .getByRole("button", { name: "Restart 3D exhibition", exact: true })
      .click();
    expect(await controls.getAttribute("data-controlled-z")).toBe(position);
    page.once("dialog", (d) => d.accept());
    await match
      .getByRole("button", { name: "Restart 3D exhibition", exact: true })
      .click();
    await expect(controls).toHaveAttribute("data-phase", "kickoff");
    await match
      .getByRole("button", { name: "Start 3D match", exact: true })
      .click();
    await page.clock.runFor(2300);
    const down = match.getByRole("button", { name: "Run down", exact: true });
    await down.scrollIntoViewIfNeeded();
    const rect = await down.boundingBox(),
      touchBefore = await controls.getAttribute("data-controlled-z");
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.clock.runFor(500);
    await page.mouse.up();
    expect(await controls.getAttribute("data-controlled-z")).not.toBe(
      touchBefore,
    );
    for (const action of [
      "Pass",
      "Through",
      "Lob",
      "Tackle",
      "Skill",
      "Switch",
    ]) {
      await match.getByRole("button", { name: action, exact: true }).click();
      await page.clock.runFor(100);
    }
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(
      match.getByRole("button", { name: "Resume 3D match", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
    });
    await canvas.evaluate((c) =>
      c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
    await expect(
      match.getByText(/The 3D graphics context was lost/),
    ).toBeVisible();
    await match
      .getByRole("button", { name: "Retry 3D graphics", exact: true })
      .click();
    await expect(
      match.getByRole("button", { name: "Resume 3D match", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await expect(canvas).toHaveCount(1);
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
    page.once("dialog", (d) => d.accept());
    await match
      .getByRole("button", { name: "Close 3D match", exact: true })
      .click();
    await expect(match).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log(
      "PASS 3D football Chromium: real WebGL rendering, keyboard movement/sprint/charged shot/actions, pointer controls, pause/reset, three cameras, three widths, tab-hide pause, context-loss retry/disposal, close, unchanged league and no page/5xx errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
