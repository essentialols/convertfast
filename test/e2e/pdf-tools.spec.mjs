import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('JPG to PDF', () => {
  test('upload JPG and convert to PDF', async ({ page }) => {
    await page.goto('/jpg-to-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.jpg'));

    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();

    const dlButton = page.locator('#dl-single');
    await expect(dlButton).toBeVisible();
  });
});

test.describe('PNG to PDF', () => {
  test('upload PNG and convert to PDF', async ({ page }) => {
    await page.goto('/png-to-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.png'));

    const actionBtn = page.locator('#action-btn');
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();
  });
});

test.describe('PDF to JPG', () => {
  test('upload PDF and convert to JPG', async ({ page }) => {
    await page.goto('/pdf-to-jpg');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.pdf'));

    const actionBtn = page.locator('#action-btn');
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();

    const dlButtons = page.locator('.dl-btn');
    await expect(dlButtons).toHaveCount(1);
  });
});

test.describe('PDF to PNG', () => {
  test('upload PDF and convert to PNG', async ({ page }) => {
    await page.goto('/pdf-to-png');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.pdf'));

    const actionBtn = page.locator('#action-btn');
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();
  });
});

test.describe('Merge PDF', () => {
  test('single PDF upload disables action button', async ({ page }) => {
    await page.goto('/merge-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.pdf'));

    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeDisabled();
  });

  test('multiple PDF upload enables action button', async ({ page }) => {
    await page.goto('/merge-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);

    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeEnabled();
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();

    const dlButton = page.locator('#dl-single');
    await expect(dlButton).toBeVisible();
  });

  test('drag handles are visible', async ({ page }) => {
    await page.goto('/merge-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);

    const dragHandles = page.locator('.drag-handle');
    await expect(dragHandles).toHaveCount(2);
  });
});

test.describe('Split PDF', () => {
  test('upload PDF and split pages', async ({ page }) => {
    await page.goto('/split-pdf');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.pdf'));

    const actionBtn = page.locator('#action-btn');
    await actionBtn.click();

    const pdfResults = page.locator('#pdf-results');
    await expect(pdfResults).toBeVisible();

    const dlButtons = page.locator('.dl-btn');
    await expect(dlButtons.count()).toBeGreaterThan(0);
  });
});

test.describe('Clear all', () => {
  test('upload file and clear all resets state', async ({ page }) => {
    await page.goto('/pdf-to-jpg');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(fixture('sample.pdf'));

    const fileList = page.locator('#file-list');
    await expect(fileList).not.toBeEmpty();

    const clearBtn = page.locator('#clear-all');
    await clearBtn.click();

    await expect(fileList).toBeEmpty();
  });
});

test.describe('Merge PDF download', () => {
  test('merged PDF download has .pdf extension', async ({ page }) => {
    await page.goto('/merge-pdf');
    await page.locator('#file-input').setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#dl-single').click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe('JPG to PDF download', () => {
  test('download has .pdf extension', async ({ page }) => {
    await page.goto('/jpg-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.jpg'));
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#dl-single').click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe('PDF to JPG download', () => {
  test('download has .jpg extension', async ({ page }) => {
    await page.goto('/pdf-to-jpg');
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.dl-btn').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.jpg$/);
  });
});

test.describe('PDF to PNG download', () => {
  test('download has .png extension', async ({ page }) => {
    await page.goto('/pdf-to-png');
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.dl-btn').first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('PNG to PDF', () => {
  test('upload PNG and convert, download has .pdf extension', async ({ page }) => {
    await page.goto('/png-to-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#dl-single').click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe('Split PDF download', () => {
  test('split produces downloadable pages', async ({ page }) => {
    await page.goto('/split-pdf');
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    await page.locator('#action-btn').click();
    await page.locator('#pdf-results').waitFor({ timeout: 15000 });
    const dlButtons = page.locator('.dl-btn');
    const count = await dlButtons.count();
    expect(count).toBeGreaterThan(0);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      dlButtons.first().click(),
    ]);
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
