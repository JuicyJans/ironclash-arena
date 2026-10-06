import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('main menu → garage → campaign level 1 loads without console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByText('Trykk en tast for å starte')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('navigation', { name: 'Hovedmeny' })).toBeVisible();
  await page
    .getByRole('button', { name: /Garasje/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Garasje' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Våpen' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Drivverk' }).click();
  await expect(page.getByText('Hjul').first()).toBeVisible();
  await page.getByRole('button', { name: 'Tilbake' }).click();

  await page.getByRole('button', { name: /Kampanje/ }).click();
  await expect(page.getByRole('heading', { name: 'Kampanje' })).toBeVisible();
  await page.getByRole('button', { name: 'Kjemp!' }).click();
  await expect(page.getByText('VS', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Kjør' })).toBeVisible();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);
  const screen = await page.evaluate(
    () =>
      (window as unknown as { __ironclash: { store: { get(): { screen: string } } } }).__ironclash.store.get()
        .screen,
  );
  expect(screen).toBe('match');
  expect(errors).toEqual([]);
});

test('language can be switched to English', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: 'EN' }).click();
  await expect(page.getByRole('button', { name: /Campaign/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Quick match/ })).toBeVisible();
});

test('20 practice matches in a row do not leak memory', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'performance.memory is Chromium-only');
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await page.goto('/');
  await page.keyboard.press('Enter');
  const heap = () =>
    page.evaluate(
      () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
    );
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() =>
      (window as unknown as { __ironclash: { store: { set(p: object): void } } }).__ironclash.store.set({
        screen: 'practice',
      }),
    );
    await page.getByRole('button', { name: 'Start øving' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Avslutt kamp' }).click();
    await expect(page.getByRole('navigation', { name: 'Hovedmeny' })).toBeVisible();
    if (i === 2 || i === 19) {
      await page.waitForTimeout(1500);
      samples.push(await heap());
    }
  }
  console.info(
    `heap after match 3: ${(samples[0]! / 1e6).toFixed(1)} MB, after match 20: ${(samples[1]! / 1e6).toFixed(1)} MB`,
  );
  // Allow some growth for JIT/caches, but no per-match leak (≈ textures, sims, listeners).
  const [early, late] = samples as [number, number];
  if (early > 0) expect(late - early).toBeLessThan(60 * 1024 * 1024);
  expect(errors).toEqual([]);
});
