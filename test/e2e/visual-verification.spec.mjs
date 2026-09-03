import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

const evidenceDir = 'artifacts/visual';

async function verifyPngToJpg(page, viewport, screenshotName) {
  await page.setViewportSize(viewport);

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/png-to-jpg');
  await page.locator('#file-input').setInputFiles(fixture('sample.png'));
  await page.locator('.file-item.done').first().waitFor({ timeout: 15_000 });

  await expect(page.locator('.btn-download').first()).toBeVisible();
  await expect(page.locator('.file-item__meta').first()).toContainText('→');

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(pageErrors).toEqual([]);

  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/${screenshotName}`, fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.locator('.btn-download').first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/i);

  const outputPath = await download.path();
  expect(outputPath).toBeTruthy();
  const output = await readFile(outputPath);
  expect(Array.from(output.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);
}

test.describe('rendered browser verification evidence', () => {
  test('PNG to JPG works and renders on desktop', async ({ page }) => {
    await verifyPngToJpg(page, { width: 1440, height: 900 }, 'png-to-jpg-desktop.png');
  });

  test('PNG to JPG works and renders on mobile', async ({ page }) => {
    await verifyPngToJpg(page, { width: 390, height: 844 }, 'png-to-jpg-mobile.png');
  });
});
