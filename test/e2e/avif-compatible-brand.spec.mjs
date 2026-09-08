import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('AVIF with mif1 major brand and avif compatible brand converts to PNG', async ({ page }) => {
  const source = Buffer.from(await readFile(fixture('sample.avif')));
  expect(source.subarray(4, 8).toString('ascii')).toBe('ftyp');
  const ftypSize = source.readUInt32BE(0);
  expect(ftypSize).toBeGreaterThanOrEqual(20);

  // A valid AVIF may use generic mif1 as its major brand while declaring avif
  // in the compatible-brand list. Preserve the encoded image and vary only ftyp.
  const variant = Buffer.from(source);
  variant.write('mif1', 8, 4, 'ascii');
  variant.write('avif', 16, 4, 'ascii');

  await page.goto('/avif-to-png');
  await page.locator('#file-input').setInputFiles({
    name: 'Résumé_日本語_mif1-compatible.avif',
    mimeType: 'image/avif',
    buffer: variant,
  });

  await expect(page.locator('.file-item.done').first()).toBeVisible({ timeout: 10_000 });

  const downloadPromise = page.waitForEvent('download');
  await page.locator('.btn-download').first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Résumé_日本語_mif1-compatible.png');

  const outputPath = await download.path();
  expect(outputPath).toBeTruthy();
  const output = await readFile(outputPath);
  expect(output.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  expect(output.readUInt32BE(16)).toBeGreaterThan(0);
  expect(output.readUInt32BE(20)).toBeGreaterThan(0);
});
