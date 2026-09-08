import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';


test.describe('RTF input validation', () => {
  test('rejects plain text even when it is disguised with an RTF filename and MIME type', async ({ page }) => {
    await page.goto('/rtf-to-txt');
    await page.locator('#file-input').setInputFiles({
      name: 'not-actually-rtf.rtf',
      mimeType: 'application/rtf',
      buffer: Buffer.from('Plain text pretending to be an RTF document.'),
    });

    await expect(page.locator('#doc-results')).toContainText(
      'This file does not appear to be a valid RTF document.'
    );
    await expect(page.locator('.file-item')).toHaveCount(0);
    await expect(page.locator('#action-btn')).toBeHidden();
    await expect(page.locator('#dl-doc')).toHaveCount(0);
  });

  test('accepts a genuine RTF document and still produces a text download', async ({ page }) => {
    await page.goto('/rtf-to-txt');
    await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
    await expect(page.locator('#action-btn')).toBeVisible();
    await page.locator('#action-btn').click();
    await expect(page.locator('#dl-doc')).toBeVisible({ timeout: 10000 });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#dl-doc').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample.txt');

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString('utf8')).toBe(
      'Hello World. This is a test document.'
    );
  });

  test('a rejected replacement does not leave the previous file convertible', async ({ page }) => {
    await page.goto('/rtf-to-txt');
    await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
    await expect(page.locator('#action-btn')).toBeVisible();

    await page.locator('#file-input').setInputFiles({
      name: 'second.rtf',
      mimeType: 'application/rtf',
      buffer: Buffer.from('Still not RTF.'),
    });

    await expect(page.locator('#doc-results')).toContainText(
      'This file does not appear to be a valid RTF document.'
    );
    await expect(page.locator('.file-item')).toHaveCount(0);
    await expect(page.locator('#action-btn')).toBeHidden();
  });

  test('clearing during validation is not undone when the check finishes', async ({ page }) => {
    await page.goto('/rtf-to-txt');
    await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
    await expect(page.locator('#action-btn')).toBeVisible();
    await page.locator('#clear-all').click();

    // Re-select, then clear again before the validation read can settle.
    await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
    await page.locator('#clear-all').click();

    await page.waitForTimeout(500);
    await expect(page.locator('.file-item')).toHaveCount(0);
    await expect(page.locator('#action-btn')).toBeHidden();
  });
});
