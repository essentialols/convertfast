import { test, expect } from '@playwright/test';
import { fixture } from './helpers.mjs';


test.describe('Font Pages', () => {
  const fontPages = [
    { path: '/otf-to-ttf', target: 'ttf' },
    { path: '/woff-to-ttf', target: 'ttf' },
    { path: '/ttf-to-otf', target: 'otf' },
    { path: '/woff-to-otf', target: 'otf' },
    { path: '/ttf-to-woff', target: 'woff' },
    { path: '/otf-to-woff', target: 'woff' },
  ];

  fontPages.forEach(({ path, target }) => {
    test.describe(path, () => {
      test('page loads correctly', async ({ page }) => {
        await page.goto(`${path}`);
        const dropZone = page.locator('#drop-zone');
        await expect(dropZone).toBeVisible();
      });

      test('config has correct font target', async ({ page }) => {
        await page.goto(`${path}`);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-font-target', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(`${path}`);
        const actionBtn = page.locator('#action-btn');
        await expect(actionBtn).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(`${path}`);
        const clearAll = page.locator('#clear-all');
        await expect(clearAll).not.toBeVisible();
      });

      test('file input present', async ({ page }) => {
        await page.goto(`${path}`);
        const fileInput = page.locator('#file-input');
        await expect(fileInput).toBeAttached();
      });
    });
  });
});

test.describe('Document Pages - General', () => {
  const docPages = [
    { path: '/epub-to-txt', mode: 'epub-to-txt' },
    { path: '/epub-to-pdf', mode: 'epub-to-pdf' },
    { path: '/rtf-to-txt', mode: 'rtf-to-txt' },
    { path: '/rtf-to-pdf', mode: 'rtf-to-pdf' },
    { path: '/docx-to-txt', mode: 'docx-to-txt' },
    { path: '/docx-to-pdf', mode: 'docx-to-pdf' },
    { path: '/mobi-to-txt', mode: 'mobi-to-txt' },
    { path: '/mobi-to-pdf', mode: 'mobi-to-pdf' },
  ];

  docPages.forEach(({ path, mode }) => {
    test.describe(path, () => {
      test('page loads correctly', async ({ page }) => {
        await page.goto(`${path}`);
        const dropZone = page.locator('#drop-zone');
        await expect(dropZone).toBeVisible();
      });

      test('config has correct doc mode', async ({ page }) => {
        await page.goto(`${path}`);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-doc-mode', mode);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(`${path}`);
        const actionBtn = page.locator('#action-btn');
        await expect(actionBtn).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(`${path}`);
        const clearAll = page.locator('#clear-all');
        await expect(clearAll).not.toBeVisible();
      });
    });
  });
});

test.describe('Document Pages - RTF Conversion', () => {
  const rtfPages = [
    { path: '/rtf-to-txt' },
    { path: '/rtf-to-pdf' },
  ];

  rtfPages.forEach(({ path }) => {
    test.describe(path, () => {
      test('upload RTF shows file item', async ({ page }) => {
        await page.goto(`${path}`);
        await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
        const fileList = page.locator('#file-list');
        await expect(fileList).toBeVisible();
        const fileItem = fileList.locator('li').first();
        await expect(fileItem).toBeVisible();
      });

      test('action button appears after upload', async ({ page }) => {
        await page.goto(`${path}`);
        await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
        const actionBtn = page.locator('#action-btn');
        await expect(actionBtn).toBeVisible();
      });

      test('convert produces result', async ({ page }) => {
        await page.goto(`${path}`);
        await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
        await page.locator('#action-btn').click();
        const results = page.locator('#doc-results');
        await expect(results).toBeVisible({ timeout: 30000 });
      });

      test('download button exists in results', async ({ page }) => {
        await page.goto(`${path}`);
        await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
        await page.locator('#action-btn').click();
        await expect(page.locator('#doc-results')).toBeVisible({ timeout: 30000 });
        const dlBtn = page.locator('#dl-doc');
        await expect(dlBtn).toBeVisible();
      });

      test('clear all resets', async ({ page }) => {
        await page.goto(`${path}`);
        await page.locator('#file-input').setInputFiles(fixture('sample.rtf'));
        await expect(page.locator('#file-list')).toBeVisible();
        await page.locator('#clear-all').click();
        const fileList = page.locator('#file-list');
        await expect(fileList).toHaveCount(0);
      });
    });
  });
});

test.describe('Archive Pages - Extract ZIP', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto(`/extract-zip`);
    const dropZone = page.locator('#drop-zone');
    await expect(dropZone).toBeVisible();
  });

  test('config has extract mode', async ({ page }) => {
    await page.goto(`/extract-zip`);
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-archive-mode', 'extract');
  });

  test('upload ZIP shows file', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    const fileList = page.locator('#file-list');
    await expect(fileList).toBeVisible();
    const fileItem = fileList.locator('li').first();
    await expect(fileItem).toBeVisible();
  });

  test('action button appears', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeVisible();
  });

  test('extract shows results', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await page.locator('#action-btn').click();
    const results = page.locator('#archive-results');
    await expect(results).toBeVisible({ timeout: 15000 });
  });

  test('individual download buttons exist', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#archive-results')).toBeVisible({ timeout: 15000 });
    const dlBtns = page.locator('.dl-btn');
    await expect(dlBtns.first()).toBeVisible();
  });

  test('download all button for 2+ files', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#archive-results')).toBeVisible({ timeout: 15000 });
    const dlAll = page.locator('#dl-all');
    await expect(dlAll).toBeVisible();
  });

  test('clear all resets', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await expect(page.locator('#file-list')).toBeVisible();
    await page.locator('#clear-all').click();
    const fileList = page.locator('#file-list');
    await expect(fileList).toHaveCount(0);
  });

  test('second upload replaces first', async ({ page }) => {
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await expect(page.locator('#file-list li')).toHaveCount(1);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await expect(page.locator('#file-list li')).toHaveCount(1);
  });
});

test.describe('Archive Pages - Create ZIP', () => {
  test('page loads correctly', async ({ page }) => {
    await page.goto(`/create-zip`);
    const dropZone = page.locator('#drop-zone');
    await expect(dropZone).toBeVisible();
  });

  test('config has create mode', async ({ page }) => {
    await page.goto(`/create-zip`);
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-archive-mode', 'create');
  });

  test('upload single file', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    const fileList = page.locator('#file-list');
    await expect(fileList).toBeVisible();
    const fileItem = fileList.locator('li').first();
    await expect(fileItem).toBeVisible();
  });

  test('upload multiple files', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample.jpg')]);
    const items = page.locator('#file-list li');
    await expect(items).toHaveCount(2);
  });

  test('action button appears', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeVisible();
  });

  test('create ZIP produces result', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample.jpg')]);
    await page.locator('#action-btn').click();
    const results = page.locator('#archive-results');
    await expect(results).toBeVisible({ timeout: 15000 });
  });

  test('ZIP download button exists', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#archive-results')).toBeVisible({ timeout: 15000 });
    const dlZip = page.locator('#dl-zip');
    await expect(dlZip).toBeVisible();
  });

  test('remove individual file', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample.jpg')]);
    await expect(page.locator('#file-list li')).toHaveCount(2);
    const removeBtn = page.locator('.btn-remove').first();
    await removeBtn.click();
    await expect(page.locator('#file-list li')).toHaveCount(1);
  });

  test('clear all resets', async ({ page }) => {
    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles([fixture('sample.png'), fixture('sample.jpg')]);
    await expect(page.locator('#file-list li')).toHaveCount(2);
    await page.locator('#clear-all').click();
    const fileList = page.locator('#file-list');
    await expect(fileList).toHaveCount(0);
  });
});

test.describe('PDF Merge', () => {
  test('single file disables action', async ({ page }) => {
    await page.goto(`/merge-pdf`);
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeDisabled();
  });

  test('two files enable action', async ({ page }) => {
    await page.goto(`/merge-pdf`);
    await page.locator('#file-input').setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);
    const actionBtn = page.locator('#action-btn');
    await expect(actionBtn).toBeEnabled();
  });

  test('drag handles visible in merge mode', async ({ page }) => {
    await page.goto(`/merge-pdf`);
    await page.locator('#file-input').setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);
    const dragHandles = page.locator('.drag-handle');
    await expect(dragHandles.first()).toBeVisible();
    await expect(dragHandles).toHaveCount(2);
  });

  test('remove reduces count', async ({ page }) => {
    await page.goto(`/merge-pdf`);
    await page.locator('#file-input').setInputFiles([fixture('sample.pdf'), fixture('sample2.pdf')]);
    await expect(page.locator('#file-list li')).toHaveCount(2);
    await expect(page.locator('#action-btn')).toBeEnabled();
    const removeBtn = page.locator('.btn-remove').first();
    await removeBtn.click();
    await expect(page.locator('#file-list li')).toHaveCount(1);
    await expect(page.locator('#action-btn')).toBeDisabled();
  });
});

test.describe('PDF Split', () => {
  test('upload PDF shows file', async ({ page }) => {
    await page.goto(`/split-pdf`);
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    const fileList = page.locator('#file-list');
    await expect(fileList).toBeVisible();
    const fileItem = fileList.locator('li').first();
    await expect(fileItem).toBeVisible();
  });

  test('only accepts single file', async ({ page }) => {
    await page.goto(`/split-pdf`);
    await page.locator('#file-input').setInputFiles(fixture('sample.pdf'));
    await expect(page.locator('#file-list li')).toHaveCount(1);
    await page.locator('#file-input').setInputFiles(fixture('sample2.pdf'));
    await expect(page.locator('#file-list li')).toHaveCount(1);
  });
});

test.describe('PDF OCR', () => {
  test('language selector populated', async ({ page }) => {
    await page.goto(`/pdf-ocr`);
    const langSelector = page.locator('#ocr-lang');
    await expect(langSelector).toBeAttached();
    const options = langSelector.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('copy button exists', async ({ page }) => {
    await page.goto(`/pdf-ocr`);
    const copyBtn = page.locator('#ocr-copy');
    await expect(copyBtn).toBeAttached();
  });

  test('download button exists', async ({ page }) => {
    await page.goto(`/pdf-ocr`);
    const dlBtn = page.locator('#ocr-download');
    await expect(dlBtn).toBeAttached();
  });

  test('progress area hidden initially', async ({ page }) => {
    await page.goto(`/pdf-ocr`);
    const progress = page.locator('#ocr-progress');
    await expect(progress).not.toBeVisible();
  });

  test('results area hidden initially', async ({ page }) => {
    await page.goto(`/pdf-ocr`);
    const results = page.locator('#ocr-results');
    await expect(results).not.toBeVisible();
  });
});
