import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';

test.describe('Converter drop zone compaction', () => {
  test('compacts after a valid file is added and expands after Clear All', async ({ page }) => {
    await page.goto('/png-to-jpg');
    const dropZone = page.locator('#drop-zone');
    const fileInput = page.locator('#file-input');

    await expect(dropZone).not.toHaveClass(/compact/);
    await fileInput.setInputFiles(fixture('sample.png'));

    await expect(dropZone).toHaveClass(/compact/);
    await expect(page.locator('.file-item')).toHaveCount(1);
    await expect(page.locator('.btn-download')).toBeVisible({ timeout: 10000 });

    await page.locator('#clear-all').click();
    await expect(page.locator('.file-item')).toHaveCount(0);
    await expect(dropZone).not.toHaveClass(/compact/);
  });

  test('keeps an error visible compactly, then expands after the item is removed', async ({ page }) => {
    await page.goto('/png-to-jpg');
    const dropZone = page.locator('#drop-zone');
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles(fixture('sample.jpg'));

    await expect(dropZone).toHaveClass(/compact/);
    await expect(page.locator('.file-item__status.error')).toContainText('Expected image/png', { timeout: 10000 });

    await page.locator('.btn-remove').click();
    await expect(page.locator('.file-item')).toHaveCount(0);
    await expect(dropZone).not.toHaveClass(/compact/);
  });
});
