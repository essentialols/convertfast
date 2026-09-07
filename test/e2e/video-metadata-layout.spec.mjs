import { test, expect } from '@playwright/test';
import { fixture, dropFile } from './helpers.mjs';

const LONG_METADATA = 'IrisFiles_Private_Video_Metadata_' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(6);

test.describe('Video metadata layout', () => {
  test.setTimeout(90_000);

  test('long unbroken metadata values stay inside a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/video-metadata');

    await dropFile(page, '#drop-zone', fixture('sample.webm'));
    const value = page.locator('#metadata-panel .meta-value').first();
    await expect(value).toBeVisible({ timeout: 10_000 });

    // Media metadata can contain long hashes, encoder IDs, titles, or comments.
    // Exercise the rendered production value element with a worst-case token.
    await value.evaluate((el, text) => { el.textContent = text; }, LONG_METADATA);

    expect(await value.evaluate(el => getComputedStyle(el).overflowWrap)).toBe('anywhere');
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )).toBe(true);
  });
});
