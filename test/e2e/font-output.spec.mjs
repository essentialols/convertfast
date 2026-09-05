import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

async function convertAndDownload(page, path, fixtureName, expectedExtension) {
  const automaticDownloads = [];
  page.on('download', download => automaticDownloads.push(download));

  await page.goto(path);
  await page.locator('#file-input').setInputFiles(fixture(fixtureName));
  await expect(page.locator('#action-btn')).toBeVisible();
  await page.locator('#action-btn').click();
  await expect(page.locator('#font-results .file-item.done')).toBeVisible({ timeout: 30_000 });

  // Conversion should prepare a result, not trigger opentype.js's own browser download.
  expect(automaticDownloads).toHaveLength(0);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#font-results .dl-btn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${expectedExtension}$`, 'i'));

  const outputPath = await download.path();
  expect(outputPath).toBeTruthy();
  const output = await readFile(outputPath);
  expect(output.length).toBeGreaterThan(1_000);
  return output;
}

async function expectUnsupportedTtf(page, path, fixtureName) {
  const downloads = [];
  page.on('download', download => downloads.push(download));

  await page.goto(path);
  await page.locator('#file-input').setInputFiles(fixture(fixtureName));
  await page.locator('#action-btn').click();

  const notice = page.locator('#font-results .notice');
  await expect(notice).toBeVisible({ timeout: 30_000 });
  await expect(notice).toContainText('TTF output is not supported for this conversion yet');
  await expect(notice).toContainText('no file was created');
  expect(downloads).toHaveLength(0);
  await expect(page.locator('#font-results .dl-btn')).toHaveCount(0);
}

test.describe('font conversion output', () => {
  test('TTF to OTF produces real OTF bytes without an automatic download', async ({ page }) => {
    const output = await convertAndDownload(page, '/ttf-to-otf', 'sample.ttf', 'otf');
    expect(output.subarray(0, 4).toString('ascii')).toBe('OTTO');
  });

  test('WOFF to OTF produces real OTF bytes without an automatic download', async ({ page }) => {
    const output = await convertAndDownload(page, '/woff-to-otf', 'sample.woff', 'otf');
    expect(output.subarray(0, 4).toString('ascii')).toBe('OTTO');
  });

  test('TTF to WOFF produces a WOFF file instead of failing on an empty buffer', async ({ page }) => {
    const output = await convertAndDownload(page, '/ttf-to-woff', 'sample.ttf', 'woff');
    expect(Array.from(output.subarray(0, 4))).toEqual([0x77, 0x4f, 0x46, 0x46]); // wOFF
  });

  test('OTF to WOFF produces a WOFF file instead of failing on an empty buffer', async ({ page }) => {
    const output = await convertAndDownload(page, '/otf-to-woff', 'sample.otf', 'woff');
    expect(Array.from(output.subarray(0, 4))).toEqual([0x77, 0x4f, 0x46, 0x46]); // wOFF
  });

  test('OTF to TTF refuses to relabel CFF OpenType bytes as TrueType', async ({ page }) => {
    await expectUnsupportedTtf(page, '/otf-to-ttf', 'sample.otf');
  });

  test('WOFF to TTF refuses to relabel regenerated CFF OpenType bytes as TrueType', async ({ page }) => {
    await expectUnsupportedTtf(page, '/woff-to-ttf', 'sample.woff');
  });
});
