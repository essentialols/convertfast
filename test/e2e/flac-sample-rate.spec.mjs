import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { fixture, expectDownloadOnClick } from './helpers.mjs';

async function convertFlacToWav(page, fixtureName) {
  await page.goto('/flac-to-wav');

  await page.locator('#file-input').setInputFiles(fixture(fixtureName));
  await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

  const download = await expectDownloadOnClick(page, '.btn-download');
  expect(download.suggestedFilename()).toMatch(/\.wav$/);

  const outputPath = await download.path();
  expect(outputPath).toBeTruthy();
  const wav = await readFile(outputPath);

  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
  return { channels: wav.readUInt16LE(22), sampleRate: wav.readUInt32LE(24) };
}

// An AudioContext resamples to the device's default rate, which is usually
// 44100 or 48000. Asserting one fixture would silently pass on whichever
// machine already defaults to that rate, so both rates are checked: whatever
// the default is, at least one of these two has to survive resampling.
test.describe('FLAC to WAV sample-rate preservation', () => {
  test('keeps a 48 kHz FLAC at 48 kHz in the downloaded WAV', async ({ page }) => {
    const { channels, sampleRate } = await convertFlacToWav(page, 'stereo-48000.flac');
    expect(channels).toBe(2);
    expect(sampleRate).toBe(48000);
  });

  test('keeps a 44.1 kHz FLAC at 44.1 kHz in the downloaded WAV', async ({ page }) => {
    const { channels, sampleRate } = await convertFlacToWav(page, 'mono-44100.flac');
    expect(channels).toBe(1);
    expect(sampleRate).toBe(44100);
  });

  test('the two fixtures do not both match the browser default rate', async ({ page }) => {
    await page.goto('/flac-to-wav');
    const defaultRate = await page.evaluate(() => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const rate = ctx.sampleRate;
      ctx.close();
      return rate;
    });
    // Guards the two tests above: if the default ever became something other
    // than 44100/48000 they would both stop proving anything.
    expect([44100, 48000]).toContain(defaultRate);
  });
});
