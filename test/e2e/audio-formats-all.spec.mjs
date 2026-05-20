import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('Audio Formats - MP3 Source', () => {
  test.describe('MP3 to WAV', () => {
    const route = '/mp3-to-wav';
    const targetFormat = 'wav';
    const targetExt = '.wav';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('MP3 to OGG', () => {
    const route = '/mp3-to-ogg';
    const targetFormat = 'ogg';
    const targetExt = '.ogg';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('MP3 to FLAC', () => {
    const route = '/mp3-to-flac';
    const targetFormat = 'flac';
    const targetExt = '.flac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('MP3 to M4A', () => {
    const route = '/mp3-to-m4a';
    const targetFormat = 'm4a';
    const targetExt = '.m4a';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('MP3 to AAC', () => {
    const route = '/mp3-to-aac';
    const targetFormat = 'aac';
    const targetExt = '.aac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });
});

test.describe('Audio Formats - WAV Source', () => {
  test.describe('WAV to MP3', () => {
    const route = '/wav-to-mp3';
    const targetFormat = 'mp3';
    const targetExt = '.mp3';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('WAV to OGG', () => {
    const route = '/wav-to-ogg';
    const targetFormat = 'ogg';
    const targetExt = '.ogg';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('WAV to FLAC', () => {
    const route = '/wav-to-flac';
    const targetFormat = 'flac';
    const targetExt = '.flac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('WAV to M4A', () => {
    const route = '/wav-to-m4a';
    const targetFormat = 'm4a';
    const targetExt = '.m4a';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('WAV to AAC', () => {
    const route = '/wav-to-aac';
    const targetFormat = 'aac';
    const targetExt = '.aac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });
});

test.describe('Audio Formats - OGG Source', () => {
  test.describe('OGG to WAV', () => {
    const route = '/ogg-to-wav';
    const targetFormat = 'wav';
    const targetExt = '.wav';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('OGG to MP3', () => {
    const route = '/ogg-to-mp3';
    const targetFormat = 'mp3';
    const targetExt = '.mp3';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('converts file and shows done', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.file-item.done')).toBeVisible();
    });

    test('download button appears', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await expect(page.locator('.btn-download').first()).toBeVisible();
    });

    test('remove button works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('.btn-remove').first().click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });

    test('clear all works', async ({ page }) => {
      await page.locator('#file-input').setInputFiles(fixture(sourceFixture));
      await page.locator('.file-item.done').first().waitFor({ timeout: 45000 });
      await page.locator('#clear-all').click();
      await expect(page.locator('.file-item')).toHaveCount(0);
    });
  });

  test.describe('OGG to FLAC', () => {
    const route = '/ogg-to-flac';
    const targetFormat = 'flac';
    const targetExt = '.flac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('OGG to M4A', () => {
    const route = '/ogg-to-m4a';
    const targetFormat = 'm4a';
    const targetExt = '.m4a';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('OGG to AAC', () => {
    const route = '/ogg-to-aac';
    const targetFormat = 'aac';
    const targetExt = '.aac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });
});

test.describe('Audio Formats - FLAC Source', () => {
  test.describe('FLAC to WAV', () => {
    const route = '/flac-to-wav';
    const targetFormat = 'wav';
    const targetExt = '.wav';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('FLAC to MP3', () => {
    const route = '/flac-to-mp3';
    const targetFormat = 'mp3';
    const targetExt = '.mp3';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('FLAC to OGG', () => {
    const route = '/flac-to-ogg';
    const targetFormat = 'ogg';
    const targetExt = '.ogg';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('FLAC to M4A', () => {
    const route = '/flac-to-m4a';
    const targetFormat = 'm4a';
    const targetExt = '.m4a';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('FLAC to AAC', () => {
    const route = '/flac-to-aac';
    const targetFormat = 'aac';
    const targetExt = '.aac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });
});

test.describe('Audio Formats - M4A Source', () => {
  test.describe('M4A to WAV', () => {
    const route = '/m4a-to-wav';
    const targetFormat = 'wav';
    const targetExt = '.wav';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('M4A to MP3', () => {
    const route = '/m4a-to-mp3';
    const targetFormat = 'mp3';
    const targetExt = '.mp3';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('M4A to OGG', () => {
    const route = '/m4a-to-ogg';
    const targetFormat = 'ogg';
    const targetExt = '.ogg';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('M4A to FLAC', () => {
    const route = '/m4a-to-flac';
    const targetFormat = 'flac';
    const targetExt = '.flac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('M4A to AAC', () => {
    const route = '/m4a-to-aac';
    const targetFormat = 'aac';
    const targetExt = '.aac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });
});

test.describe('Audio Formats - AAC Source', () => {
  test.describe('AAC to WAV', () => {
    const route = '/aac-to-wav';
    const targetFormat = 'wav';
    const targetExt = '.wav';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('AAC to MP3', () => {
    const route = '/aac-to-mp3';
    const targetFormat = 'mp3';
    const targetExt = '.mp3';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('AAC to OGG', () => {
    const route = '/aac-to-ogg';
    const targetFormat = 'ogg';
    const targetExt = '.ogg';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('AAC to FLAC', () => {
    const route = '/aac-to-flac';
    const targetFormat = 'flac';
    const targetExt = '.flac';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });

  test.describe('AAC to M4A', () => {
    const route = '/aac-to-m4a';
    const targetFormat = 'm4a';
    const targetExt = '.m4a';

    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test.setTimeout(60000);

    test('page loads with drop zone', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
    });

    test('config has correct target format', async ({ page }) => {
      const config = page.locator('#converter-config');
      await expect(config).toHaveAttribute('data-target-format', targetFormat);
      await expect(config).toHaveAttribute('data-target-ext', targetExt);
    });

    test('file input is present', async ({ page }) => {
      await expect(page.locator('#file-input')).toBeVisible();
    });

    test('batch buttons hidden initially', async ({ page }) => {
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
    });

    test('page structure is correct', async ({ page }) => {
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('#file-input')).toBeVisible();
      await expect(page.locator('#converter-config')).toBeVisible();
      await expect(page.locator('#download-all')).toBeHidden();
      await expect(page.locator('#clear-all')).toBeHidden();
      await expect(page.locator('#file-list')).toBeVisible();
    });
  });
});
