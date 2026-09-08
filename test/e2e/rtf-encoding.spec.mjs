import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';


test.describe('RTF text encoding', () => {
  test('Windows-1252 hex escapes download as the intended Unicode text', async ({ page }) => {
    await page.goto('/rtf-to-txt');
    await page.locator('#file-input').setInputFiles(fixture('windows-1252.rtf'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#doc-results')).toBeVisible({ timeout: 30000 });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#dl-doc').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('windows-1252.txt');

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');

    expect(text).toBe('Café costs € 5.\n“Quoted” — done.\nUnicode snowman: ☃');
    expect(text).not.toMatch(/[\u0080-\u009F]/);
  });
});
