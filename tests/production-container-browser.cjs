const { chromium, expect } = require('@playwright/test');

(async () => {
  const base = process.env.CONTAINER_WEB_URL || 'https://localhost:4443';
  const origin = new URL(base).origin;
  const browser = await chromium.launch({ headless: true });
  try {
    // Caddy uses its local CA for this isolated localhost CI endpoint only.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage(), errors = [], apiRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/v1/')) apiRequests.push(request.url()); });
    const key = `container${Date.now()}`, email = `${key}@example.com`, password = 'ContainerJourney2026!';
    const response = await page.goto(base + '/register');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-powered-by']).toBeUndefined();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Username', { exact: true }).fill(key);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/login/);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${key}'s Team`, exact: true })).toBeVisible();
    await page.goto(base + '/matches');
    await expect(page.getByRole('button', { name: 'Play 3D match', exact: true })).toBeVisible();
    const asset = await context.request.get(base + '/assets/football/player.glb');
    expect(asset.ok()).toBe(true);
    expect((await asset.body()).subarray(0, 4).toString()).toBe('glTF');
    expect(apiRequests.length).toBeGreaterThan(3);
    expect(apiRequests.every(url => new URL(url).origin === origin)).toBe(true);
    expect(errors).toEqual([]);
    console.log('PASS production HTTPS journey: Caddy TLS, same-origin API, registration/login/logout, club and match data, security headers and bundled player asset through the production image.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
