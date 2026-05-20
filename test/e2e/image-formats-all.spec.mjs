import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('AVIF pages (no fixture)', () => {
  test('avif-to-jpg page loads correctly', async ({ page }) => {
    await page.goto('/avif-to-jpg');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('avif-to-jpg config has correct attributes', async ({ page }) => {
    await page.goto('/avif-to-jpg');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/avif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
  });

  test('avif-to-jpg quality slider is present', async ({ page }) => {
    await page.goto('/avif-to-jpg');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('avif-to-jpg file input accepts avif', async ({ page }) => {
    await page.goto('/avif-to-jpg');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /avif/);
  });

  test('avif-to-jpg wrong format shows error', async ({ page }) => {
    await page.goto('/avif-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });

  test('avif-to-png page loads correctly', async ({ page }) => {
    await page.goto('/avif-to-png');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('avif-to-png config has correct attributes', async ({ page }) => {
    await page.goto('/avif-to-png');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/avif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/png');
    await expect(config).toHaveAttribute('data-target-ext', 'png');
  });

  test('avif-to-png quality slider is present', async ({ page }) => {
    await page.goto('/avif-to-png');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('avif-to-png wrong format shows error', async ({ page }) => {
    await page.goto('/avif-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });

  test('avif-to-webp page loads correctly', async ({ page }) => {
    await page.goto('/avif-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('avif-to-webp config has correct attributes', async ({ page }) => {
    await page.goto('/avif-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/avif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('avif-to-webp quality slider is present', async ({ page }) => {
    await page.goto('/avif-to-webp');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('avif-to-pdf page loads correctly', async ({ page }) => {
    await page.goto('/avif-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('avif-to-pdf config has correct attributes', async ({ page }) => {
    await page.goto('/avif-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/avif');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });
});

test.describe('ICO pages (no fixture)', () => {
  test('ico-to-jpg page loads correctly', async ({ page }) => {
    await page.goto('/ico-to-jpg');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('ico-to-jpg config has correct attributes', async ({ page }) => {
    await page.goto('/ico-to-jpg');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/x-icon');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
  });

  test('ico-to-jpg quality slider is present', async ({ page }) => {
    await page.goto('/ico-to-jpg');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('ico-to-jpg file input accepts ico', async ({ page }) => {
    await page.goto('/ico-to-jpg');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /icon|ico/);
  });

  test('ico-to-png page loads correctly', async ({ page }) => {
    await page.goto('/ico-to-png');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('ico-to-png config has correct attributes', async ({ page }) => {
    await page.goto('/ico-to-png');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/x-icon');
    await expect(config).toHaveAttribute('data-target-mime', 'image/png');
    await expect(config).toHaveAttribute('data-target-ext', 'png');
  });

  test('ico-to-png quality slider is present', async ({ page }) => {
    await page.goto('/ico-to-png');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('ico-to-webp page loads correctly', async ({ page }) => {
    await page.goto('/ico-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('ico-to-webp config has correct attributes', async ({ page }) => {
    await page.goto('/ico-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/x-icon');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('ico-to-pdf page loads correctly', async ({ page }) => {
    await page.goto('/ico-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('ico-to-pdf config has correct attributes', async ({ page }) => {
    await page.goto('/ico-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/x-icon');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });
});

test.describe('TIFF pages (no fixture)', () => {
  test('tiff-to-jpg page loads correctly', async ({ page }) => {
    await page.goto('/tiff-to-jpg');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('tiff-to-jpg config has correct attributes', async ({ page }) => {
    await page.goto('/tiff-to-jpg');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/tiff');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
  });

  test('tiff-to-jpg quality slider is present', async ({ page }) => {
    await page.goto('/tiff-to-jpg');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('tiff-to-jpg file input accepts tiff', async ({ page }) => {
    await page.goto('/tiff-to-jpg');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /tiff/);
  });

  test('tiff-to-png page loads correctly', async ({ page }) => {
    await page.goto('/tiff-to-png');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('tiff-to-png config has correct attributes', async ({ page }) => {
    await page.goto('/tiff-to-png');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/tiff');
    await expect(config).toHaveAttribute('data-target-mime', 'image/png');
    await expect(config).toHaveAttribute('data-target-ext', 'png');
  });

  test('tiff-to-png quality slider is present', async ({ page }) => {
    await page.goto('/tiff-to-png');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('tiff-to-webp page loads correctly', async ({ page }) => {
    await page.goto('/tiff-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('tiff-to-webp config has correct attributes', async ({ page }) => {
    await page.goto('/tiff-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/tiff');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('tiff-to-pdf page loads correctly', async ({ page }) => {
    await page.goto('/tiff-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('tiff-to-pdf config has correct attributes', async ({ page }) => {
    await page.goto('/tiff-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/tiff');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });
});

test.describe('SVG pages (no fixture)', () => {
  test('svg-to-jpg page loads correctly', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('svg-to-jpg config has correct attributes', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/svg+xml');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
  });

  test('svg-to-jpg quality slider is present', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('svg-to-jpg file input accepts svg', async ({ page }) => {
    await page.goto('/svg-to-jpg');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /svg/);
  });

  test('svg-to-png page loads correctly', async ({ page }) => {
    await page.goto('/svg-to-png');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('svg-to-png config has correct attributes', async ({ page }) => {
    await page.goto('/svg-to-png');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/svg+xml');
    await expect(config).toHaveAttribute('data-target-mime', 'image/png');
    await expect(config).toHaveAttribute('data-target-ext', 'png');
  });

  test('svg-to-png quality slider is present', async ({ page }) => {
    await page.goto('/svg-to-png');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('svg-to-webp page loads correctly', async ({ page }) => {
    await page.goto('/svg-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('svg-to-webp config has correct attributes', async ({ page }) => {
    await page.goto('/svg-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/svg+xml');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('svg-to-pdf page loads correctly', async ({ page }) => {
    await page.goto('/svg-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('svg-to-pdf config has correct attributes', async ({ page }) => {
    await page.goto('/svg-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/svg+xml');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });
});

test.describe('PNG to GIF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/png-to-gif');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/png-to-gif');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/png');
    await expect(config).toHaveAttribute('data-target-mime', 'image/gif');
    await expect(config).toHaveAttribute('data-target-ext', 'gif');
  });

  test('quality slider is present', async ({ page }) => {
    await page.goto('/png-to-gif');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('file input accepts png', async ({ page }) => {
    await page.goto('/png-to-gif');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /png/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/png-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/png-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.gif$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/png-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('JPG to GIF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-mime', 'image/gif');
    await expect(config).toHaveAttribute('data-target-ext', 'gif');
  });

  test('quality slider is present', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('file input accepts jpg', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /jpeg/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.gif$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/jpg-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('WebP to GIF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/webp-to-gif');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/webp-to-gif');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/webp');
    await expect(config).toHaveAttribute('data-target-mime', 'image/gif');
    await expect(config).toHaveAttribute('data-target-ext', 'gif');
  });

  test('quality slider is present', async ({ page }) => {
    await page.goto('/webp-to-gif');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('file input accepts webp', async ({ page }) => {
    await page.goto('/webp-to-gif');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /webp/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/webp-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/webp-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.gif$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/webp-to-gif');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('GIF to WebP', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/gif-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/gif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('quality slider is present', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('file input accepts gif', async ({ page }) => {
    await page.goto('/gif-to-webp');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /gif/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.webp$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/gif-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('GIF to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/gif');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });

  test('file input accepts gif', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /gif/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/gif-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('WebP to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/webp');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });

  test('file input accepts webp', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /webp/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.webp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/webp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('BMP to WebP', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/bmp');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('quality slider is present', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('file input accepts bmp', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /bmp/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.webp$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/bmp-to-webp');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('BMP to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has correct attributes', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/bmp');
    await expect(config).toHaveAttribute('data-target-mime', 'application/pdf');
    await expect(config).toHaveAttribute('data-target-ext', 'pdf');
  });

  test('file input accepts bmp', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /bmp/);
  });

  test('converts file and shows done', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    await expect(page.locator('.btn-download').first()).toBeVisible();
  });

  test('download produces correct extension', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.bmp'));
    await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-download').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('wrong format shows error', async ({ page }) => {
    await page.goto('/bmp-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });
});

test.describe('HEIC pages (no fixture)', () => {
  test('heic-to-jpg page loads correctly', async ({ page }) => {
    await page.goto('/heic-to-jpg');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('heic-to-jpg config has correct attributes', async ({ page }) => {
    await page.goto('/heic-to-jpg');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/heic,image/heif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/jpeg');
    await expect(config).toHaveAttribute('data-target-ext', 'jpg');
  });

  test('heic-to-jpg quality slider is present', async ({ page }) => {
    await page.goto('/heic-to-jpg');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('heic-to-jpg file input accepts heic', async ({ page }) => {
    await page.goto('/heic-to-jpg');
    const input = page.locator('#file-input');
    await expect(input).toHaveAttribute('accept', /heic|heif/);
  });

  test('heic-to-jpg wrong format shows error', async ({ page }) => {
    await page.goto('/heic-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('.file-item__status.error').first().waitFor({ timeout: 10000 });
  });

  test('heic-to-png page loads correctly', async ({ page }) => {
    await page.goto('/heic-to-png');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('heic-to-png config has correct attributes', async ({ page }) => {
    await page.goto('/heic-to-png');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/heic,image/heif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/png');
    await expect(config).toHaveAttribute('data-target-ext', 'png');
  });

  test('heic-to-png quality slider is present', async ({ page }) => {
    await page.goto('/heic-to-png');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('heic-to-webp page loads correctly', async ({ page }) => {
    await page.goto('/heic-to-webp');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('heic-to-webp config has correct attributes', async ({ page }) => {
    await page.goto('/heic-to-webp');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-source-formats', 'image/heic,image/heif');
    await expect(config).toHaveAttribute('data-target-mime', 'image/webp');
    await expect(config).toHaveAttribute('data-target-ext', 'webp');
  });

  test('heic-to-webp quality slider is present', async ({ page }) => {
    await page.goto('/heic-to-webp');
    await expect(page.locator('#quality-slider')).toBeVisible();
    await expect(page.locator('#quality-value')).toBeVisible();
  });

  test('heic-to-pdf page loads correctly', async ({ page }) => {
    await page.goto('/heic-to-pdf');
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('heic-to-pdf config has img-to-pdf mode', async ({ page }) => {
    await page.goto('/heic-to-pdf');
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-pdf-mode', 'img-to-pdf');
  });
});
