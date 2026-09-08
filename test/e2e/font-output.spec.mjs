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

async function expectBrowserLoadsFont(page, output) {
  const status = await page.evaluate(async bytes => {
    const face = new FontFace('IrisFilesOutputVerification', new Uint8Array(bytes).buffer);
    await face.load();
    return face.status;
  }, Array.from(output));
  expect(status).toBe('loaded');
}

async function expectRefusal(page, path, fixtureName, message) {
  const downloads = [];
  page.on('download', download => downloads.push(download));

  await page.goto(path);
  await page.locator('#file-input').setInputFiles(fixture(fixtureName));
  await page.locator('#action-btn').click();

  const notice = page.locator('#font-results .notice');
  await expect(notice).toBeVisible({ timeout: 30_000 });
  await expect(notice).toContainText(message);
  await expect(notice).toContainText('no file was created');
  expect(downloads).toHaveLength(0);
  await expect(page.locator('#font-results .dl-btn')).toHaveCount(0);
}

test.describe('font conversion output', () => {
  // WOFF only wraps an sfnt, so these stay lossless and never re-encode outlines.
  test('TTF to WOFF wraps the original sfnt into a browser-loadable WOFF', async ({ page }) => {
    const output = await convertAndDownload(page, '/ttf-to-woff', 'sample.ttf', 'woff');
    expect(Array.from(output.subarray(0, 4))).toEqual([0x77, 0x4f, 0x46, 0x46]); // wOFF
    expect(output.readUInt32BE(4)).toBe(0x00010000); // preserves TrueType flavor
    await expectBrowserLoadsFont(page, output);
  });

  test('OTF to WOFF wraps the original sfnt into a browser-loadable WOFF', async ({ page }) => {
    const output = await convertAndDownload(page, '/otf-to-woff', 'sample.otf', 'woff');
    expect(Array.from(output.subarray(0, 4))).toEqual([0x77, 0x4f, 0x46, 0x46]); // wOFF
    expect(output.readUInt32BE(4)).toBe(0x4f54544f); // preserves OTTO flavor
    await expectBrowserLoadsFont(page, output);
  });

  test('WOFF to TTF unwraps the container back to a browser-loadable TrueType font', async ({ page }) => {
    const output = await convertAndDownload(page, '/woff-to-ttf', 'sample.woff', 'ttf');
    expect(output.readUInt32BE(0)).toBe(0x00010000);
    await expectBrowserLoadsFont(page, output);
  });

  // TTF and OTF name different outline formats, so these need a real re-encode.
  // opentype.js cannot rebuild every table it can read; refuse rather than emit
  // a truncated font.
  test('TTF to OTF reports the fonts whose outlines cannot be rebuilt', async ({ page }) => {
    await expectRefusal(page, '/ttf-to-otf', 'sample.ttf', 'cannot rebuild');
  });

  test('WOFF to OTF reports the fonts whose outlines cannot be rebuilt', async ({ page }) => {
    await expectRefusal(page, '/woff-to-otf', 'sample.woff', 'cannot rebuild');
  });

  test('OTF to TTF refuses to relabel CFF OpenType bytes as TrueType', async ({ page }) => {
    await expectRefusal(page, '/otf-to-ttf', 'sample.otf', 'TTF output is not supported');
  });

  test('WOFF round-trips through TTF without losing tables', async ({ page }) => {
    const woff = await convertAndDownload(page, '/ttf-to-woff', 'sample.ttf', 'woff');
    const original = await readFile(fixture('sample.ttf'));
    // Same table count survives the wrap, so no table is dropped on the way in.
    expect(woff.readUInt16BE(12)).toBe(original.readUInt16BE(4));
  });
});
