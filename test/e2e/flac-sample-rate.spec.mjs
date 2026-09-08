import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture, expectDownloadOnClick } from './helpers.mjs';

test.describe('FLAC to WAV sample-rate preservation', () => {
  test('keeps a 48 kHz FLAC at 48 kHz in the downloaded WAV', async ({ page }) => {
    await page.goto('/flac-to-wav');

    await page.locator('#file-input').setInputFiles(fixture('stereo-48000.flac'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

    const download = await expectDownloadOnClick(page, '.btn-download');
    expect(download.suggestedFilename()).toMatch(/\.wav$/);

    const outputPath = await download.path();
    expect(outputPath).toBeTruthy();
    const wav = await readFile(outputPath);

    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(48000);
  });
});
