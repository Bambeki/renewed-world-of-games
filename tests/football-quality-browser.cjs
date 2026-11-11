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
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && /shader|THREE\.WebGL/.test(m.text()))
        errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });
    const base = process.env.WEB_URL || "http://localhost:4000",
      key = `quality${Date.now()}`;
    await page.goto(base + "/register");
    await page.getByLabel("Email", { exact: true }).fill(key + "@example.com");
    await page.getByLabel("Username", { exact: true }).fill(key);
    await page
      .getByLabel("Password", { exact: true })
      .fill("FootballQuality2026!");
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto(base + "/matches");
    await page.clock.install();
    const asset = page.waitForResponse((r) =>
      r.url().endsWith("/assets/football/player.glb"),
    );
    await page
      .getByRole("button", { name: "Play 3D match", exact: true })
      .click();
    const response = await asset;
    expect(response.status()).toBe(200);
    const bytes = await response.body();
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    const region = page.getByRole("region", {
      name: "3D football exhibition",
      exact: true,
    });
    await expect(
      region.getByRole("button", { name: "Start 3D match", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    const controls = region.getByRole("group", {
      name: "3D match controls",
      exact: true,
    });
    await region.getByLabel("Graphics quality", { exact: true }).selectOption("performance");
    await expect(
      region.getByRole("img", { name: "Live tactical minimap", exact: true }),
    ).toBeVisible();
    await region.getByLabel("3D camera", { exact: true }).selectOption("close");
    await region.getByRole("button", { name: "Kick off", exact: true }).click();
    await page.clock.runFor(2300);
    const before = [
      Number(await controls.getAttribute("data-controlled-x")),
      Number(await controls.getAttribute("data-controlled-z")),
    ];
    const poseBefore = await controls
      .locator("canvas")
      .getAttribute("data-player-pose");
    const stick = region.getByRole("button", {
      name: "360 degree movement stick",
      exact: true,
    });
    await stick.scrollIntoViewIfNeeded();
    const rect = await stick.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      rect.x + rect.width * 0.75,
      rect.y + rect.height * 0.65,
    );
    await page.clock.runFor(700);
    await page.mouse.up();
    expect(
      Number(await controls.getAttribute("data-controlled-x")),
    ).toBeGreaterThan(before[0] + 0.4);
    expect(
      Number(await controls.getAttribute("data-controlled-z")),
    ).toBeGreaterThan(before[1] + 0.2);
    expect(
      await controls.locator("canvas").getAttribute("data-player-pose"),
    ).not.toBe(poseBefore);
    await region
      .getByRole("button", { name: "Pause 3D match", exact: true })
      .click();
    await page.clock.runFor(2200);
    const paused = await controls.getAttribute("data-controlled-x");
    await page.clock.runFor(500);
    expect(await controls.getAttribute("data-controlled-x")).toBe(paused);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.clock.runFor(300);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `overflow at ${width}`,
      ).toBe(false);
    }
    page.once("dialog", (d) => d.accept());
    await region
      .getByRole("button", { name: "Close 3D match", exact: true })
      .click();
    await page.goto(base + "/training");
    await page.route("**/assets/football/player.glb", (route) => route.abort());
    await page
      .getByRole("button", { name: "Play 3D match", exact: true })
      .click();
    await expect(
      page.getByText(/The player assets or 3D graphics could not load/),
    ).toBeVisible();
    await page.unroute("**/assets/football/player.glb");
    await page
      .getByRole("button", { name: "Retry 3D graphics", exact: true })
      .click();
    await expect(
      region.getByRole("button", { name: "Kick off", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await region.getByRole("button", { name: "Kick off", exact: true }).click();
    await page.clock.runFor(2300);
    await page.keyboard.down(" ");
    await page.clock.runFor(300);
    await page.keyboard.up(" ");
    await page.clock.runFor(20);
    await expect(controls).toHaveAttribute("data-shots", "1");
    await region
      .getByRole("button", { name: "Pause 3D match", exact: true })
      .click();
    await page.clock.runFor(30);
    const frozenPose = await controls
      .locator("canvas")
      .getAttribute("data-player-pose");
    await page.clock.runFor(400);
    expect(
      await controls.locator("canvas").getAttribute("data-player-pose"),
    ).toBe(frozenPose);
    expect(errors).toEqual([]);
    console.log(
      "PASS football quality Chromium: skinned asset and real bone animation, diagonal analogue-stick movement, minimap, paused skeleton, asset-failure retry, training shot, close camera and 3 widths; no page/shader/5xx errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
