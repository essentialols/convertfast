import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('Landing page', () => {
  test('loads with correct title and navigation', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
    const title = await page.title();
    expect(title).toContain('IrisFiles');
    await expect(page.locator('.logo')).toBeVisible();
    await expect(page.locator('nav a[href="/about"]')).toBeVisible();
  });

  test('has links to main tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/png-to-jpg"]')).toHaveCount(1);
    await expect(page.locator('a[href="/compress"]').first()).toBeVisible();
    await expect(page.locator('a[href="/merge-pdf"]')).toHaveCount(1);
    await expect(page.locator('a[href="/resize-image"]')).toHaveCount(1);
  });
});

test.describe('About page', () => {
  test('loads and displays content', async ({ page }) => {
    const response = await page.goto('/about');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Privacy page', () => {
  test('loads and displays title', async ({ page }) => {
    const response = await page.goto('/privacy');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('drop zone has proper ARIA attributes after JS boot', async ({ page }) => {
    await page.goto('/png-to-jpg');
    await page.waitForLoadState('networkidle');
    const dz = page.locator('#drop-zone');
    await expect(dz).toHaveAttribute('role', 'button', { timeout: 10000 });
    await expect(dz).toHaveAttribute('tabindex', '0');
  });
});

test.describe('FAQ functionality', () => {
  test('FAQ questions toggle open state', async ({ page }) => {
    await page.goto('/png-to-jpg');
    const btn = page.locator('.faq-question').first();
    const item = page.locator('.faq-item').first();
    await btn.click();
    await expect(item).toHaveClass(/open/);
    await btn.click();
    await expect(item).not.toHaveClass(/open/);
  });
});

test.describe('Console errors', () => {
  test('no console errors on tool pages', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/png-to-jpg');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('Clean URLs', () => {
  test('tool page loads without .html extension', async ({ page }) => {
    const response = await page.goto('/png-to-jpg');
    expect(response.status()).toBe(200);
  });
});

test.describe('Responsive design', () => {
  test('renders at mobile width without errors', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/png-to-jpg');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('keeps narrow mobile header readable with touch-sized links', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/png-to-jpg');
    await page.waitForLoadState('networkidle');

    const about = page.locator('.nav a[href="/about"]');
    const support = page.locator('.support-btn');
    const aboutBox = await about.boundingBox();
    const supportBox = await support.boundingBox();

    expect(aboutBox.height).toBeGreaterThanOrEqual(44);
    expect(supportBox.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(support).toHaveCSS('white-space', 'nowrap');
  });

  test('renders at desktop width without errors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/png-to-jpg');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('Console errors across tool categories', () => {
  const toolPages = [
    '/compress',
    '/resize-image',
    '/strip-exif',
    '/image-metadata',
    '/merge-pdf',
    '/split-pdf',
    '/images-to-gif',
    '/heic-to-jpg',
    '/extract-zip',
    '/create-zip',
    '/rtf-to-txt',
    '/compress-audio',
    '/video-metadata',
    '/video-speed',
    '/compress-video',
    '/pdf-ocr',
    '/docx-to-txt',
    '/epub-to-txt',
    '/jpg-to-pdf',
    '/pdf-to-jpg',
  ];

  toolPages.forEach((toolPath) => {
    test(`no console errors on ${toolPath}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(toolPath);
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });
  });
});

test.describe('Navigation from landing page', () => {
  test('clicking a tool link navigates correctly', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="/png-to-jpg"]');
    await link.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#drop-zone')).toBeVisible();
    expect(page.url()).toContain('/png-to-jpg');
  });

  test('about page has back navigation to home', async ({ page }) => {
    await page.goto('/about');
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe('Smart Drop on landing page', () => {
  test('dropping a PNG shows route panel with conversion options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(fixture('sample.png'));
    const routePanel = page.locator('#route-panel, .route-panel').first();
    await routePanel.waitFor({ timeout: 10000 });
    const options = page.locator('.route-option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('404 handling', () => {
  test('nonexistent page returns 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    expect(response.status()).toBe(404);
  });
});

test.describe('Index page structure', () => {
  test('has tool category sections', async ({ page }) => {
    await page.goto('/');
    const sections = page.locator('.tool-group, .category, section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test('has links to audio tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/wav-to-mp3"]')).toHaveCount(1);
    const compressAudioLinks = await page.locator('a[href="/compress-audio"]').count();
    expect(compressAudioLinks).toBeGreaterThan(0);
  });

  test('has links to video tools', async ({ page }) => {
    await page.goto('/');
    const compressVideoLinks = await page.locator('a[href="/compress-video"]').count();
    expect(compressVideoLinks).toBeGreaterThan(0);
  });

  test('has links to PDF tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/split-pdf"]')).toHaveCount(1);
    await expect(page.locator('a[href="/pdf-ocr"]')).toHaveCount(1);
  });

  test('has links to specialized tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/strip-exif"]')).toHaveCount(1);
    await expect(page.locator('a[href="/image-metadata"]')).toHaveCount(1);
  });
});

test.describe('Smart Drop with different file types', () => {
  test('dropping a JPG shows conversion options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(fixture('sample.jpg'));
    const routePanel = page.locator('#route-panel, .route-panel').first();
    await routePanel.waitFor({ timeout: 10000 });
    const options = page.locator('.route-option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dropping a PDF shows PDF-related options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(fixture('sample.pdf'));
    const routePanel = page.locator('#route-panel, .route-panel').first();
    await routePanel.waitFor({ timeout: 10000 });
    const options = page.locator('.route-option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dropping an MP3 shows audio-related options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(fixture('sample.mp3'));
    const routePanel = page.locator('#route-panel, .route-panel').first();
    await routePanel.waitFor({ timeout: 10000 });
    const options = page.locator('.route-option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dropping a video shows video-related options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(fixture('sample.mp4'));
    const routePanel = page.locator('#route-panel, .route-panel').first();
    await routePanel.waitFor({ timeout: 10000 });
    const options = page.locator('.route-option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Logo navigation', () => {
  test('logo links back to home from tool page', async ({ page }) => {
    await page.goto('/png-to-jpg');
    const logo = page.locator('.logo a, a.logo, header a[href="/"]').first();
    await expect(logo).toBeVisible();
    const href = await logo.getAttribute('href');
    expect(href).toBe('/');
  });
});

test.describe('Footer links', () => {
  test('footer has privacy and about links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
    await expect(footer.locator('a[href="/about"]')).toBeVisible();
  });
});
