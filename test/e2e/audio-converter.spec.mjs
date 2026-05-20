import { test, expect } from '@playwright/test';
import { fixture, dropFile, expectDownloadOnClick } from './helpers.mjs';

test.describe('Audio Conversion - WAV to MP3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wav-to-mp3');
  });

  test('converts WAV to MP3', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const downloadBtn = page.locator('.btn-download').first();
    await expect(downloadBtn).toBeVisible();
  });

  test('download triggers with MP3 extension', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const download = await expectDownloadOnClick(page, '.btn-download');
    expect(download.suggestedFilename()).toMatch(/\.mp3$/);
  });

  test('batch download shows on 2+ files done', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item').first().waitFor();

    const input = page.locator('#file-input').first();
    await input.setInputFiles(fixture('sample.wav'));

    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);

    const downloadAll = page.locator('#download-all');
    await expect(downloadAll).toBeVisible();
  });
});

test.describe('Audio Conversion - MP3 to WAV', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mp3-to-wav');
  });

  test('converts MP3 to WAV', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const downloadBtn = page.locator('.btn-download').first();
    await expect(downloadBtn).toBeVisible();
  });

  test('download triggers with WAV extension', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const download = await expectDownloadOnClick(page, '.btn-download');
    expect(download.suggestedFilename()).toMatch(/\.wav$/);
  });
});

test.describe('Audio Conversion - OGG to MP3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ogg-to-mp3');
  });

  test('converts OGG to MP3 using FFmpeg', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.ogg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

    const downloadBtn = page.locator('.btn-download').first();
    await expect(downloadBtn).toBeVisible();
  });

  test('download triggers with MP3 extension', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.ogg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

    const download = await expectDownloadOnClick(page, '.btn-download');
    expect(download.suggestedFilename()).toMatch(/\.mp3$/);
  });
});

test.describe('Audio Conversion - OGG to WAV', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ogg-to-wav');
  });

  test('converts OGG to WAV using FFmpeg', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.ogg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

    const downloadBtn = page.locator('.btn-download').first();
    await expect(downloadBtn).toBeVisible();
  });
});

test.describe('Audio Conversion - WAV to OGG', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wav-to-ogg');
  });

  test('converts WAV to OGG using FFmpeg', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });

    const downloadBtn = page.locator('.btn-download').first();
    await expect(downloadBtn).toBeVisible();
  });
});

test.describe('Audio Conversion - File Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wav-to-mp3');
  });

  test('clear all removes all files', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const clearBtn = page.locator('#clear-all');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    const fileItems = page.locator('.file-item');
    await expect(fileItems).toHaveCount(0);
  });

  test('remove button removes single file', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.wav'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const removeBtn = page.locator('.btn-remove').first();
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    const fileItems = page.locator('.file-item');
    await expect(fileItems).toHaveCount(0);
  });

  test('batch summary shows after multiple files done', async ({ page }) => {
    await page.goto('/mp3-to-wav');

    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 30000 });

    const input = page.locator('#file-input').first();
    await input.setInputFiles(fixture('sample.wav'));

    await page.locator('.file-item').nth(1).locator('.file-item__status:has-text("Done")').waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);

    const batchSummary = page.locator('#batch-summary');
    await expect(batchSummary).toBeVisible();
  });
});

test.describe('Audio Compression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compress-audio');
  });

  test('compression interface loads correctly', async ({ page }) => {
    const actionBtn = page.locator('#action-btn');
    const qualityDropdown = page.locator('#compress-quality');

    await expect(actionBtn).toBeDisabled();
    await expect(qualityDropdown).toBeVisible();
  });

  test('uploads file and shows action button', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('#audio-file').waitFor({ timeout: 10000 });

    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeEnabled();
  });

  test('compresses file with quality selection', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('#audio-file').waitFor({ timeout: 10000 });

    await page.locator('#compress-quality').selectOption('medium');
    await page.locator('#action-btn').click();

    await page.locator('#audio-file.done').waitFor({ timeout: 45000 });

    const downloadBtn = page.locator('.btn-download');
    await expect(downloadBtn).toBeVisible();
  });

  test('shows file size before and after compression', async ({ page }) => {
    test.setTimeout(60000);

    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('#audio-file').waitFor({ timeout: 10000 });

    await page.locator('#action-btn').click();
    await page.locator('#audio-file.done').waitFor({ timeout: 45000 });

    const sizeInfo = page.locator('.file-item__size, [class*="size"]');
    await expect(sizeInfo.first()).toBeVisible();
  });

  test('clear all resets compression interface', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('#audio-file').waitFor({ timeout: 10000 });

    const clearBtn = page.locator('#clear-all');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    const audioFile = page.locator('#audio-file');
    await expect(audioFile).not.toBeVisible();

    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeDisabled();
  });

  test('quality dropdown updates before compression', async ({ page }) => {
    await dropFile(page, '#drop-zone', fixture('sample.mp3'));
    await page.locator('#audio-file').waitFor({ timeout: 10000 });

    const qualityDropdown = page.locator('#compress-quality');

    await qualityDropdown.selectOption('low');
    await expect(qualityDropdown).toHaveValue('low');

    await qualityDropdown.selectOption('high');
    await expect(qualityDropdown).toHaveValue('high');
  });
});

test.describe('Audio Converter Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wav-to-mp3');
  });

  test('converter config has correct target format attributes', async ({ page }) => {
    const config = page.locator('#converter-config');

    const targetFormat = await config.getAttribute('data-target-format');
    const targetExt = await config.getAttribute('data-target-ext');

    expect(targetFormat).toBe('mp3');
    expect(targetExt).toBe('mp3');
  });

  test('target format updates on different conversion pages', async ({ page }) => {
    await page.goto('/ogg-to-mp3');

    const config = page.locator('#converter-config');
    const targetFormat = await config.getAttribute('data-target-format');
    const targetExt = await config.getAttribute('data-target-ext');

    expect(targetFormat).toBe('mp3');
    expect(targetExt).toBe('mp3');
  });

  test('target format correct for FFmpeg formats', async ({ page }) => {
    await page.goto('/wav-to-ogg');

    const config = page.locator('#converter-config');
    const targetFormat = await config.getAttribute('data-target-format');

    expect(targetFormat).toMatch(/ogg|flac|m4a|aac/);
  });
});
