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

function expectSfnt(output) {
  const signature = output.subarray(0, 4);
  const trueType = signature.equals(Buffer.from([0x00, 0x01, 0x00, 0x00]));
  const cffOpenType = signature.toString('ascii') === 'OTTO';
  expect(trueType || cffOpenType).toBeTruthy();
}

test.describe('font conversion output', () => {
  test('TTF to OTF produces a real serialized font without an automatic download', async ({ page }) => {
    const output = await convertAndDownload(page, '/ttf-to-otf', 'sample.ttf', 'otf');
    expectSfnt(output);
  });

  test('OTF to TTF produces a real serialized font without an automatic download', async ({ page }) => {
    const output = await convertAndDownload(page, '/otf-to-ttf', 'sample.otf', 'ttf');
    expectSfnt(output);
  });

  test('TTF to WOFF produces a WOFF file instead of failing on an empty buffer', async ({ page }) => {
    const output = await convertAndDownload(page, '/ttf-to-woff', 'sample.ttf', 'woff');
    expect(Array.from(output.subarray(0, 4))).toEqual([0x77, 0x4f, 0x46, 0x46]); // wOFF
  });
});
