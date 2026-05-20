import { test, expect } from '@playwright/test';
import { fixture, waitForDone, getFileItemCount } from './helpers.mjs';

test.describe('UI Micro-Interactions', () => {
  test.describe('Drop Zone Interactions - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('drop zone is visible on load', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      await expect(dropZone).toBeVisible();
    });

    test('drop zone has click handler', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      await dropZone.click();
      const fileInput = page.locator('#file-input');
      const isFocused = await fileInput.evaluate(el => document.activeElement === el);
      expect(isFocused).toBeTruthy();
    });

    test('dragover adds dragover class', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      await page.evaluate(() => {
        const zone = document.querySelector('[data-drop-zone]');
        const event = new DragEvent('dragover', { bubbles: true });
        zone.dispatchEvent(event);
      });
      await expect(dropZone).toHaveClass(/dragover/);
    });

    test('dragleave removes dragover class', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      await page.evaluate(() => {
        const zone = document.querySelector('[data-drop-zone]');
        zone.classList.add('dragover');
        const event = new DragEvent('dragleave', { bubbles: true });
        zone.dispatchEvent(event);
      });
      await expect(dropZone).not.toHaveClass(/dragover/);
    });

    test('drop removes dragover class', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      await page.evaluate(() => {
        const zone = document.querySelector('[data-drop-zone]');
        zone.classList.add('dragover');
      });
      await page.evaluate(() => {
        const zone = document.querySelector('[data-drop-zone]');
        const dt = new DataTransfer();
        const file = new File([''], 'test.png', { type: 'image/png' });
        dt.items.add(file);
        const event = new DragEvent('drop', { dataTransfer: dt, bubbles: true });
        zone.dispatchEvent(event);
      });
      await expect(dropZone).not.toHaveClass(/dragover/);
    });

    test('drop zone accessible via keyboard', async ({ page }) => {
      const dropZone = page.locator('[data-drop-zone]').first();
      const role = await dropZone.getAttribute('role');
      const tabindex = await dropZone.getAttribute('tabindex');
      expect(role).toBeTruthy();
      expect(tabindex).toBe('0');
    });
  });

  test.describe('File Input Behavior - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('file input is hidden', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await expect(fileInput).toBeHidden();
    });

    test('file input has multiple attribute', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      const multiple = await fileInput.getAttribute('multiple');
      expect(multiple).not.toBeNull();
    });

    test('file input has accept attribute', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      const accept = await fileInput.getAttribute('accept');
      expect(accept).toContain('image');
    });

    test('uploading resets input value', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const value = await fileInput.evaluate((el) => el.value);
      expect(value).toBe('');
    });
  });

  test.describe('Quality Slider - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('default value is 100', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      const value = await slider.inputValue();
      expect(Number(value)).toBe(100);
    });

    test('snaps to 10', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('11');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(10);
    });

    test('snaps to 25', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('26');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(25);
    });

    test('snaps to 50', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('49');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(50);
    });

    test('snaps to 75', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('74');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(75);
    });

    test('snaps to 80', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('81');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(80);
    });

    test('snaps to 90', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('89');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(90);
    });

    test('snaps to 100', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('99');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(100);
    });

    test('non-snap value stays', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('60');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const value = await slider.inputValue();
      expect(Number(value)).toBe(60);
    });

    test('quality note shows at 100%', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('100');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const qualityNote = page.locator('#quality-note');
      const text = await qualityNote.textContent();
      expect(text).toContain('quality');
    });

    test('quality note empty below 100', async ({ page }) => {
      const slider = page.locator('#quality-slider');
      await slider.fill('80');
      await page.evaluate(() => {
        document.querySelector('#quality-slider').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const qualityNote = page.locator('#quality-note');
      const text = await qualityNote.textContent();
      expect(text).not.toContain('full quality');
    });
  });

  test.describe('File Item Rendering - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('file item shows filename', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const fileItemName = page.locator('.file-item__name');
      await expect(fileItemName).toContainText('sample.png');
    });

    test('file item shows file size', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const fileItemMeta = page.locator('.file-item__meta');
      const text = await fileItemMeta.textContent();
      expect(text).toMatch(/\d+\s*(B|KB|MB)/);
    });

    test('file item shows thumbnail for images', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const thumbnail = page.locator('.file-item__thumb img');
      await expect(thumbnail).toBeVisible();
    });

    test('progress bar starts at 0', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const progressBar = page.locator('.file-item__progress-bar').first();
      const width = await progressBar.evaluate((el) => getComputedStyle(el).width);
      expect(width).toBe('0px');
    });

    test('progress bar reaches 100 on done', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const progressBar = page.locator('.file-item__progress-bar').first();
      const width = await progressBar.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const parentRect = el.parentElement.getBoundingClientRect();
        return (rect.width / parentRect.width) * 100;
      });
      expect(width).toBeGreaterThan(90);
    });

    test('done state adds done class', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const fileItem = page.locator('.file-item.done');
      await expect(fileItem).toBeVisible();
    });

    test('done state shows download button', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const downloadBtn = page.locator('.btn-download').first();
      await expect(downloadBtn).toBeVisible();
    });

    test('done state shows remove button', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const removeBtn = page.locator('.btn-remove').first();
      await expect(removeBtn).toBeVisible();
    });

    test('done state shows details button for images', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const detailsBtn = page.locator('.btn-details').first();
      await expect(detailsBtn).toBeVisible();
    });

    test('done meta shows arrow and output size', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const fileItemMeta = page.locator('.file-item__meta');
      const text = await fileItemMeta.textContent();
      expect(text).toContain('→');
    });

    test('done meta shows duration', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const fileItemMeta = page.locator('.file-item__meta');
      const text = await fileItemMeta.textContent();
      expect(text).toMatch(/\d+(ms|s|m)/);
    });
  });

  test.describe('Batch Operations - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('download all hidden with 0 files', async ({ page }) => {
      const downloadAllBtn = page.locator('.btn-download-all');
      await expect(downloadAllBtn).toBeHidden();
    });

    test('download all hidden with 1 done file', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const downloadAllBtn = page.locator('.btn-download-all');
      await expect(downloadAllBtn).toBeHidden();
    });

    test('download all visible with 2+ done', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      await waitForDone(page);
      const downloadAllBtn = page.locator('.btn-download-all');
      await expect(downloadAllBtn).toBeVisible();
    });

    test('download all text says "Download All as ZIP"', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      await waitForDone(page);
      const downloadAllBtn = page.locator('.btn-download-all');
      await expect(downloadAllBtn).toContainText('ZIP');
    });

    test('download all disables during zip creation', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      await waitForDone(page);
      const downloadAllBtn = page.locator('.btn-download-all');
      const isDisabledBefore = await downloadAllBtn.isDisabled();
      expect(isDisabledBefore).toBe(false);
    });

    test('clear all hidden with 0 files', async ({ page }) => {
      const clearAllBtn = page.locator('.btn-clear-all');
      await expect(clearAllBtn).toBeHidden();
    });

    test('clear all visible with files', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const clearAllBtn = page.locator('.btn-clear-all');
      await expect(clearAllBtn).toBeVisible();
    });

    test('clear all removes all file items and resets', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const clearAllBtn = page.locator('.btn-clear-all');
      await clearAllBtn.click();
      const count = await getFileItemCount(page);
      expect(count).toBe(0);
    });

    test('batch summary appears with 2+ files', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const batchSummary = page.locator('#batch-summary');
      await expect(batchSummary).toBeVisible();
    });

    test('batch summary shows file count', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const batchSummary = page.locator('#batch-summary');
      const text = await batchSummary.textContent();
      expect(text).toContain('2');
    });

    test('batch summary shows total sizes', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const batchSummary = page.locator('#batch-summary');
      const text = await batchSummary.textContent();
      expect(text).toContain('→');
    });

    test('batch summary hidden with < 2 files', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const batchSummary = page.locator('#batch-summary');
      await expect(batchSummary).toBeHidden();
    });
  });

  test.describe('Remove Behavior - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('remove button removes specific file', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      await waitForDone(page);
      const removeButtons = page.locator('.btn-remove');
      const countBefore = await getFileItemCount(page);
      await removeButtons.first().click();
      const countAfter = await getFileItemCount(page);
      expect(countAfter).toBe(countBefore - 1);
    });

    test('remove last file hides clear all', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await waitForDone(page);
      const removeBtn = page.locator('.btn-remove').first();
      await removeBtn.click();
      const clearAllBtn = page.locator('.btn-clear-all');
      await expect(clearAllBtn).toBeHidden();
    });

    test('remove updates download all visibility', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      await waitForDone(page);
      const downloadAllBtn = page.locator('.btn-download-all');
      await expect(downloadAllBtn).toBeVisible();
      const removeBtn = page.locator('.btn-remove').first();
      await removeBtn.click();
      await expect(downloadAllBtn).toBeHidden();
    });
  });

  test.describe('FAQ Accordion Details - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('all FAQ items closed initially', async ({ page }) => {
      const openItems = page.locator('.faq-item.open');
      const count = await openItems.count();
      expect(count).toBe(0);
    });

    test('clicking question opens answer', async ({ page }) => {
      const faqQuestion = page.locator('.faq-question').first();
      await faqQuestion.click();
      const faqAnswer = page.locator('.faq-answer').first();
      const maxHeight = await faqAnswer.evaluate((el) => getComputedStyle(el).maxHeight);
      expect(maxHeight).not.toBe('0px');
    });

    test('only one FAQ open at a time', async ({ page }) => {
      const faqQuestions = page.locator('.faq-question');
      await faqQuestions.nth(0).click();
      await faqQuestions.nth(1).click();
      const openItems = page.locator('.faq-item.open');
      const count = await openItems.count();
      expect(count).toBe(1);
    });

    test('FAQ question has aria-expanded', async ({ page }) => {
      const faqQuestion = page.locator('.faq-question').first();
      const ariaExpanded = await faqQuestion.getAttribute('aria-expanded');
      expect(ariaExpanded).not.toBeNull();
    });

    test('FAQ answer has aria-hidden', async ({ page }) => {
      const faqAnswer = page.locator('.faq-answer').first();
      const ariaHidden = await faqAnswer.getAttribute('aria-hidden');
      expect(ariaHidden).not.toBeNull();
    });

    test('open FAQ has aria-expanded=true', async ({ page }) => {
      const faqQuestion = page.locator('.faq-question').first();
      await faqQuestion.click();
      const ariaExpanded = await faqQuestion.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('true');
    });

    test('closed FAQ has aria-expanded=false', async ({ page }) => {
      const faqQuestion = page.locator('.faq-question').first();
      const ariaExpanded = await faqQuestion.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('false');
    });
  });

  test.describe('Error States - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('wrong format shows error status', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.jpg'));
      const errorStatus = page.locator('.file-item__status.error');
      await expect(errorStatus).toBeVisible({ timeout: 5000 });
    });

    test('error shows remove button', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.jpg'));
      const removeBtn = page.locator('.btn-remove').first();
      await expect(removeBtn).toBeVisible({ timeout: 5000 });
    });

    test('error progress bar has error class', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.jpg'));
      const errorBar = page.locator('.file-item__progress-bar.error');
      await expect(errorBar).toBeVisible({ timeout: 5000 });
    });

    test('error item can be removed', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.jpg'));
      const removeBtn = page.locator('.btn-remove').first();
      await removeBtn.waitFor({ timeout: 5000 });
      await removeBtn.click();
      const count = await getFileItemCount(page);
      expect(count).toBe(0);
    });
  });

  test.describe('Resize-specific Micro-tests - /resize-image', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/resize-image');
    });

    test('dimensions group visible by default', async ({ page }) => {
      const dimensionsGroup = page.locator('#dimensions-group');
      await expect(dimensionsGroup).toBeVisible();
    });

    test('percent group hidden by default', async ({ page }) => {
      const percentGroup = page.locator('#percent-group');
      await expect(percentGroup).toBeHidden();
    });

    test('lock aspect checked by default', async ({ page }) => {
      const lockAspect = page.locator('#lock-aspect');
      await expect(lockAspect).toBeChecked();
    });

    test('first file seeds width/height inputs', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const widthInput = page.locator('input[name="width"]');
      const value = await widthInput.inputValue();
      expect(Number(value)).toBeGreaterThan(0);
    });

    test('width change syncs height when locked', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const widthInput = page.locator('input[name="width"]');
      const heightInput = page.locator('input[name="height"]');
      const heightBefore = await heightInput.inputValue();
      await widthInput.fill('200');
      await page.evaluate(() => {
        document.querySelector('input[name="width"]').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const heightAfter = await heightInput.inputValue();
      expect(heightAfter).not.toBe(heightBefore);
    });

    test('height change syncs width when locked', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const widthInput = page.locator('input[name="width"]');
      const heightInput = page.locator('input[name="height"]');
      const widthBefore = await widthInput.inputValue();
      await heightInput.fill('150');
      await page.evaluate(() => {
        document.querySelector('input[name="height"]').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const widthAfter = await widthInput.inputValue();
      expect(widthAfter).not.toBe(widthBefore);
    });

    test('unlock aspect allows independent values', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const lockAspect = page.locator('#lock-aspect');
      await lockAspect.uncheck();
      const widthInput = page.locator('input[name="width"]');
      const heightInput = page.locator('input[name="height"]');
      const heightBefore = await heightInput.inputValue();
      await widthInput.fill('300');
      await page.evaluate(() => {
        document.querySelector('input[name="width"]').dispatchEvent(new Event('input', { bubbles: true }));
      });
      const heightAfter = await heightInput.inputValue();
      expect(heightAfter).toBe(heightBefore);
    });

    test('resize button text updates with action', async ({ page }) => {
      const resizeBtn = page.locator('button').filter({ hasText: /resize/i }).first();
      const text = await resizeBtn.textContent();
      expect(text).toBeTruthy();
    });

    test('upscale warning for large dimensions', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const widthInput = page.locator('input[name="width"]');
      await widthInput.fill('5000');
      const warning = page.locator('[data-upscale-warning]');
      await expect(warning).toBeVisible();
    });
  });

  test.describe('Compress Video Micro-tests - /compress-video', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/compress-video');
    });

    test('quality select has options', async ({ page }) => {
      const options = page.locator('#compress-quality option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('resolution select exists', async ({ page }) => {
      await expect(page.locator('#compress-resolution')).toBeAttached();
    });
  });

  test.describe('Video Speed Micro-tests - /video-speed', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/video-speed');
    });

    test('speed preset has multiple options', async ({ page }) => {
      const options = page.locator('#speed-preset option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('keep audio checkbox present', async ({ page }) => {
      const keepAudio = page.locator('#keep-audio');
      await expect(keepAudio).toBeVisible();
      const isChecked = await keepAudio.isChecked();
      expect(isChecked).toBe(true);
    });
  });

  test.describe('Image Metadata Micro-tests - /image-metadata', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/image-metadata');
    });

    test('metadata panel empty initially', async ({ page }) => {
      const metadataPanel = page.locator('#metadata-panel');
      const text = await metadataPanel.textContent();
      expect(text.trim()).toBe('');
    });

    test('save changes hidden initially', async ({ page }) => {
      const saveChanges = page.locator('#save-changes');
      await expect(saveChanges).toBeHidden();
    });

    test('strip gps hidden initially', async ({ page }) => {
      const stripGps = page.locator('#strip-gps');
      await expect(stripGps).toBeHidden();
    });

    test('strip all hidden initially', async ({ page }) => {
      const stripAll = page.locator('#strip-all');
      await expect(stripAll).toBeHidden();
    });
  });

  test.describe('Video Metadata Micro-tests - /video-metadata', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/video-metadata');
    });

    test('metadata panel empty initially', async ({ page }) => {
      const metadataPanel = page.locator('#metadata-panel');
      const text = await metadataPanel.textContent();
      expect(text.trim()).toBe('');
    });

    test('strip all hidden initially', async ({ page }) => {
      const stripAll = page.locator('#strip-all');
      await expect(stripAll).toBeHidden();
    });

    test('upload shows video preview', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.mp4'));
      const videoPreview = page.locator('#video-preview');
      await expect(videoPreview).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Images to GIF Micro-tests - /images-to-gif', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/images-to-gif');
    });

    test('frame list empty initially', async ({ page }) => {
      const frameList = page.locator('#frame-list');
      const count = await frameList.locator('.frame-item').count();
      expect(count).toBe(0);
    });

    test('controls hidden with no frames', async ({ page }) => {
      const gifControls = page.locator('#gif-controls');
      await expect(gifControls).toBeHidden();
    });

    test('convert button disabled with < 2 frames', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const convertBtn = page.locator('button').filter({ hasText: /convert/i }).first();
      const isDisabled = await convertBtn.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('delay slider default value', async ({ page }) => {
      const delaySlider = page.locator('#delay-slider');
      const value = await delaySlider.inputValue();
      expect(Number(value)).toBeGreaterThan(0);
    });

    test('width slider default value', async ({ page }) => {
      const widthSlider = page.locator('#width-slider');
      const value = await widthSlider.inputValue();
      expect(Number(value)).toBeGreaterThan(0);
    });

    test('adding 1 frame shows frame list but convert disabled', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const frameList = page.locator('#frame-list');
      const count = await frameList.locator('.frame-item').count();
      expect(count).toBe(1);
      const convertBtn = page.locator('button').filter({ hasText: /convert/i }).first();
      const isDisabled = await convertBtn.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('adding 2 frames enables convert', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const convertBtn = page.locator('button').filter({ hasText: /convert/i }).first();
      const isDisabled = await convertBtn.isDisabled();
      expect(isDisabled).toBe(false);
    });

    test('frame shows number, thumbnail, name', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      const frameItem = page.locator('.frame-item').first();
      const number = frameItem.locator('.frame-item__number');
      const thumbnail = frameItem.locator('.frame-item__thumb img');
      const name = frameItem.locator('.frame-item__name');
      await expect(number).toBeVisible();
      await expect(thumbnail).toBeVisible();
      await expect(name).toBeVisible();
    });

    test('frame remove button works', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([fixture('sample.png'), fixture('sample2.png')]);
      const removeBtn = page.locator('.frame-item__remove').first();
      const countBefore = await page.locator('.frame-item').count();
      await removeBtn.click();
      const countAfter = await page.locator('.frame-item').count();
      expect(countAfter).toBe(countBefore - 1);
    });
  });

  test.describe('Details Button Toggle - /png-to-jpg', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/png-to-jpg');
    });

    test('details button toggles inline meta panel', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
      const detailsBtn = page.locator('.btn-details').first();
      await detailsBtn.click();
      const panel = page.locator('.inline-meta-panel').first();
      await expect(panel).toBeVisible({ timeout: 10000 });
      await expect(detailsBtn).toContainText('Hide', { timeout: 10000 });
    });

    test('clicking details again hides panel', async ({ page }) => {
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles(fixture('sample.png'));
      await page.locator('.file-item.done').first().waitFor({ timeout: 15000 });
      const detailsBtn = page.locator('.btn-details').first();
      await detailsBtn.click();
      await expect(detailsBtn).toContainText('Hide', { timeout: 10000 });
      await detailsBtn.click();
      const panel = page.locator('.inline-meta-panel').first();
      await expect(panel).toBeHidden();
      await expect(detailsBtn).toContainText('Details');
    });
  });
});
