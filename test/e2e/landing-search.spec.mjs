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

  test('does not invent self-conversions', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#tools-filter');

    for (const query of ['PNG to PNG', 'HEIC to HEIC', 'JPG to JPG']) {
      await search.fill(query);
      await expect(page.locator('.convert-row:visible')).toHaveCount(0);
    }

    // The task routes that carry their target only in the href still match.
    await search.fill('PDF to OCR');
    await expect(page.locator('a[href="/pdf-ocr"]')).toBeVisible();
  });
});
