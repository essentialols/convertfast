import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

test.describe('SVG conversion', () => {
  test('real SVG converts to a valid JPG with the source dimensions', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.svg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    const outputPath = await download.path();
    expect(outputPath).not.toBeNull();
    const bytes = await readFile(outputPath);

    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(jpegDimensions(bytes)).toEqual({ width: 512, height: 384 });
  });

  test('SVG detection uses contents, not the filename or browser MIME type', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    const svgBytes = await readFile(fixture('sample.svg'));
    await page.locator('#file-input').setInputFiles({
      name: 'vector.bin',
      mimeType: 'application/octet-stream',
      buffer: svgBytes,
    });
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('non-SVG content is still rejected on the SVG converter', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
    await expect(page.locator('.btn-download')).toHaveCount(0);
  });
});
