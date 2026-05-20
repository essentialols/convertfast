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
