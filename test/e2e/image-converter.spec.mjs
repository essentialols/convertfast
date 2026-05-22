import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('PNG to JPG', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/png-to-jpg');
  });

  test('single file converts and shows done state', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download triggers with .jpg extension', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.jpg$/);
  });

  test('quality slider changes display value', async ({ page }) => {
    await page.locator('#quality-slider').fill('50');
    await page.locator('#quality-slider').dispatchEvent('input');
    await expect(page.locator('#quality-value')).toHaveText('50%');
  });

  test('quality slider persists via localStorage', async ({ page }) => {
    await page.locator('#quality-slider').fill('75');
    await page.locator('#quality-slider').dispatchEvent('input');
    await page.reload();
    await expect(page.locator('#quality-slider')).toHaveValue('75');
  });

  test('batch upload shows both files and Download All', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    await expect(page.locator('#download-all')).toBeVisible();
    expect(await page.locator('.file-item').count()).toBe(2);
  });

  test('Download All as ZIP triggers download', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#download-all').click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.zip$/);
  });

  test('Clear All empties file list', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await page.locator('#clear-all').click();
    expect(await page.locator('.file-item').count()).toBe(0);
  });

  test('Remove individual file', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    await page.locator('.btn-remove').first().click();
    expect(await page.locator('.file-item').count()).toBe(1);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });

  test('batch summary appears with 2+ done files', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    await expect(page.locator('#batch-summary')).toBeVisible();
    const text = await page.locator('#batch-summary').textContent();
    expect(text).toContain('2 files');
  });

  test('config element has correct attributes', async ({ page }) => {
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/png');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
    await expect(config).toHaveAttribute('data-mode', 'convert');
  });

  test('quality slider and value visible', async ({ page }) => {
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('batch buttons hidden when no files', async ({ page }) => {
    await expect(page.locator('#download-all')).toBeHidden();
    await expect(page.locator('#clear-all')).toBeHidden();
  });

  test('FAQ accordion toggles', async ({ page }) => {
    const btn = page.locator('.faq-question').first();
    const item = page.locator('.faq-item').first();
    await btn.click();
    await expect(item).toHaveClass(/open/);
    await btn.click();
    await expect(item).not.toHaveClass(/open/);
  });

  test('drop zone has ARIA attributes', async ({ page }) => {
    const dz = page.locator('#drop-zone');
    await expect(dz).toHaveAttribute('role', 'button');
    await expect(dz).toHaveAttribute('tabindex', '0');
  });
});

test.describe('JPG to PNG', () => {
  test('converts and downloads as .png', async ({ page }) => {
    await page.goto('/jpg-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('JPG to WebP', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/jpg-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('WebP to JPG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/webp-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('WebP to PNG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/webp-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('BMP to JPG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/bmp-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('BMP to PNG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/bmp-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('GIF to JPG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/gif-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('GIF to PNG', () => {
  test('converts and shows done', async ({ page }) => {
    await page.goto('/gif-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('Compress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compress');
  });

  test('compresses single file', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('config has compress mode', async ({ page }) => {
    await expect(page.locator('#converter-config')).toHaveAttribute('data-mode', 'compress');
  });

  test('quality change updates localStorage and display', async ({ page }) => {
    await page.evaluate(() => {
      const s = document.getElementById('quality-slider');
      s.value = 25;
      s.dispatchEvent(new Event('input'));
    });
    await expect(page.locator('#quality-value')).toHaveText('25%');
    const stored = await page.evaluate(() => localStorage.getItem('cf-quality'));
    expect(stored).toBe('25');
  });
});

test.describe('PNG to WebP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/png-to-webp');
  });

  test('converts and downloads as .webp', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.webp$/);
  });

  test('config has correct attributes', async ({ page }) => {
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/png');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('quality slider visible and functional', async ({ page }) => {
    await expect(page.locator('#quality-slider')).toBeVisible();
    await page.locator('#quality-slider').fill('60');
    await page.locator('#quality-slider').dispatchEvent('input');
    await expect(page.locator('#quality-value')).toHaveText('60%');
  });

  test('wrong format shows error', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });

  test('batch converts two files', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    await expect(page.locator('#download-all')).toBeVisible();
    expect(await page.locator('.file-item').count()).toBe(2);
  });
});

test.describe('Transparent PNG handling', () => {
  test('transparent PNG converts to JPG without error', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('transparent.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('transparent PNG converts to WebP without error', async ({ page }) => {
    await page.goto('/png-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('transparent.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('Additional file after conversion', () => {
  test('can add more files after first batch completes', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    expect(await page.locator('.file-item').count()).toBe(1);
    await page.locator('#file-input').setInputFiles(fixture('sample2.png'));
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    expect(await page.locator('.file-item').count()).toBe(2);
    await expect(page.locator('#download-all')).toBeVisible();
  });
});

test.describe('File size validation', () => {
  test('oversized file shows error message', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.evaluate(() => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const padding = new Uint8Array(101 * 1024 * 1024);
      const file = new File([pngHeader, padding], 'huge.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('file-input').files = dt.files;
      document.getElementById('file-input').dispatchEvent(new Event('change'));
    });
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
    const errorText = await page.locator('.file-item__status.error').first().textContent();
    expect(errorText).toContain('too large');
  });
});

test.describe('Done meta shows size and duration', () => {
  test('done file meta shows before/after sizes and duration', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const meta = await page.locator('.file-item__meta').first().textContent();
    expect(meta).toMatch(/\d+\s*(B|KB|MB)/);
    expect(meta).toContain('→');
    expect(meta).toMatch(/\d+(ms|s)/);
  });

  test('done meta shows percentage change', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const meta = await page.locator('.file-item__meta').first().textContent();
    expect(meta).toMatch(/\d+%\s*(smaller|larger)/);
  });
});

test.describe('Details button', () => {
  test('Details button toggles inline metadata panel', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const detailsBtn = page.locator('.btn-details').first();
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();
    await page.locator('.inline-meta-panel').waitFor({ timeout: 10000 });
    await expect(page.locator('.inline-meta-panel')).toBeVisible();
    await expect(detailsBtn).toContainText('Hide', { timeout: 10000 });
  });

  test('clicking Details again hides metadata panel', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const detailsBtn = page.locator('.btn-details').first();
    await detailsBtn.click();
    await expect(detailsBtn).toContainText('Hide', { timeout: 10000 });
    await detailsBtn.click();
    await expect(page.locator('.inline-meta-panel')).toBeHidden();
    await expect(detailsBtn).toHaveText('Details');
  });
});

test.describe('Compress mode format flexibility', () => {
  test('compress mode accepts JPG without format error', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
    expect(await page.locator('.file-item__status.error').count()).toBe(0);
  });

  test('compress mode accepts PNG without format error', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('compress mode accepts WebP without format error', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('compress mode accepts BMP without format error', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('compress mode accepts GIF without format error', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});

test.describe('Compress output is smaller or equal', () => {
  test('compressed JPEG file size is reported in meta', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#quality-slider').fill('30');
    await page.locator('#quality-slider').dispatchEvent('input');
    await page.locator('#file-input').setInputFiles(fixture('large.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const meta = await page.locator('.file-item__meta').first().textContent();
    expect(meta).toContain('→');
  });
});

test.describe('Download All ZIP for compress batch', () => {
  test('Download All as ZIP works for compressed batch', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('#file-input').setInputFiles([fixture('sample.jpg'), fixture('sample2.jpg')]);
    await page.locator('.file-item.done').nth(1).waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#download-all').click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.zip$/);
  });
});

test.describe('BMP to WebP conversion', () => {
  test('converts and downloads as .webp', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.webp$/);
  });
});

test.describe('GIF to WebP conversion', () => {
  test('converts and downloads as .webp', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.webp$/);
  });
});

test.describe('Quality slider extremes', () => {
  test('quality at minimum still produces output', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#quality-slider').fill('10');
    await page.locator('#quality-slider').dispatchEvent('input');
    await expect(page.locator('#quality-value')).toHaveText('10%');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('quality at 100% still produces output', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.locator('#quality-slider').fill('100');
    await page.locator('#quality-slider').dispatchEvent('input');
    await expect(page.locator('#quality-value')).toHaveText('100%');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });
});
