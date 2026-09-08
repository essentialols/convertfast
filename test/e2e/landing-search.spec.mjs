import { test, expect } from '@playwright/test';

test.describe('Landing page tool search', () => {
  test('understands natural directional conversion queries', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#tools-filter');
    const summary = page.locator('#tools-filter-summary');

    await search.fill('AVIF to PNG');
    await expect(summary).toHaveText('1 matching conversion');
    await expect(page.locator('.convert-row:visible')).toHaveCount(1);
    await expect(page.locator('.convert-row:visible .convert-source')).toHaveText('AVIF');
    await expect(page.locator('a[href="/avif-to-png"]')).toBeVisible();

    await search.fill('JPEG to PNG');
    await expect(summary).toHaveText('1 matching conversion');
    await expect(page.locator('.convert-row:visible .convert-source')).toHaveText('JPG');
    await expect(page.locator('a[href="/jpg-to-png"]')).toBeVisible();

    await search.fill('AVIF -> PNG');
    await expect(summary).toHaveText('1 matching conversion');
    await expect(page.locator('.convert-row:visible .convert-source')).toHaveText('AVIF');
  });

  test('preserves task and partial-term searches and gives useful empty feedback', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#tools-filter');
    const summary = page.locator('#tools-filter-summary');

    await search.fill('meta');
    expect(await page.locator('.convert-row:visible').count()).toBeGreaterThan(0);

    await search.fill('definitely-not-a-real-tool');
    await expect(page.locator('.convert-row:visible')).toHaveCount(0);
    await expect(summary).toHaveText('No matching conversions. Try a format like PNG or a task like compress.');
  });

  test('keeps every tool visible for queries that are only filler words', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#tools-filter');
    const total = await page.locator('.convert-row').count();
    expect(total).toBeGreaterThan(0);

    for (const query of ['convert', 'file', 'convert file', 'convert files to']) {
      await search.fill(query);
      expect(await page.locator('.convert-row:visible').count(), `query: ${query}`).toBe(total);
    }
  });

  test('matches on the target alone when the source is only filler', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tools-filter').fill('files to png');

    const visible = await page.locator('.convert-row:visible').count();
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(await page.locator('.convert-row').count());
    await expect(page.locator('a[href="/jpg-to-png"]')).toBeVisible();
  });
});
