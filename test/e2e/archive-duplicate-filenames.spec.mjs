import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';

test('Create ZIP preserves files whose names collide', async ({ page }) => {
  await page.goto('/create-zip');
  await page.locator('#file-input').setInputFiles([
    { name: 'report.txt', mimeType: 'text/plain', buffer: Buffer.from('first report') },
    { name: 'report (2).txt', mimeType: 'text/plain', buffer: Buffer.from('reserved name') },
    { name: 'report.txt', mimeType: 'text/plain', buffer: Buffer.from('second report') },
  ]);

  await expect(page.locator('.file-item')).toHaveCount(3);
  await page.locator('#action-btn').click();
  await expect(page.locator('#archive-results')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#dl-zip').click();
  const download = await downloadPromise;
  const bytes = await fs.readFile(await download.path());
  const entries = unzipSync(new Uint8Array(bytes));

  expect(Object.keys(entries).sort()).toEqual([
    'report (2).txt',
    'report (3).txt',
    'report.txt',
  ]);
  expect(strFromU8(entries['report.txt'])).toBe('first report');
  expect(strFromU8(entries['report (2).txt'])).toBe('reserved name');
  expect(strFromU8(entries['report (3).txt'])).toBe('second report');
});
