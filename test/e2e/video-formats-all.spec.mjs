import { test, expect } from '@playwright/test';
import { fixture, getFileItemCount } from './helpers.mjs';

test.setTimeout(90000);

const sourceFormats = {
  mp4: { fixture: 'sample.mp4', targets: ['avi', 'mkv', 'mov', 'webm', 'gif'] },
  mov: { fixture: 'sample.mov', targets: ['mp4', 'avi', 'mkv', 'webm', 'gif'] },
  avi: { fixture: 'sample.avi', targets: ['mp4', 'mkv', 'mov', 'webm', 'gif'] },
  mkv: { fixture: 'sample.mp4', targets: ['mp4', 'avi', 'mov', 'webm', 'gif'] },
  webm: { fixture: 'sample.mp4', targets: ['mp4', 'avi', 'mkv', 'mov', 'gif'] },
  gif: { fixture: 'sample.gif', targets: ['mp4', 'webm', 'mov', 'avi', 'mkv'] },
};

const fixtureAvailable = {
  mp4: true,
  mov: true,
  avi: true,
  gif: true,
};

test.describe('MP4 Conversions', () => {
  const source = 'mp4';
  const sourceFormats_mp4 = sourceFormats[source];

  sourceFormats_mp4.targets.forEach((target) => {
    const pageUrl = `/mp4-to-${target}`;

    test.describe(`MP4 to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      if (fixtureAvailable[source]) {
        test('shows file item after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mp4.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          const fileName = page.locator('.file-item__name');
          await expect(fileName).toContainText('sample');
          const size = page.locator('.file-item__size');
          await expect(size).toBeVisible();
        });

        test('action button appears after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mp4.fixture));
          await expect(page.locator('#action-btn')).toBeVisible();
          await expect(page.locator('#action-btn')).toBeEnabled();
        });

        test('clear all resets state', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mp4.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          await page.locator('#clear-all').click();
          await expect(page.locator('.file-item')).not.toBeVisible();
          await expect(page.locator('#action-btn')).not.toBeVisible();
        });

        test('second upload replaces first', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
          let count = await getFileItemCount(page);
          expect(count).toBe(1);
          await page.locator('#file-input').setInputFiles(fixture('sample.mov'));
          count = await getFileItemCount(page);
          expect(count).toBe(1);
        });
      }
    });
  });
});

test.describe('MOV Conversions', () => {
  const source = 'mov';
  const sourceFormats_mov = sourceFormats[source];

  sourceFormats_mov.targets.forEach((target) => {
    const pageUrl = `/mov-to-${target}`;

    test.describe(`MOV to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      if (fixtureAvailable[source]) {
        test('shows file item after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mov.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          const fileName = page.locator('.file-item__name');
          await expect(fileName).toContainText('sample');
          const size = page.locator('.file-item__size');
          await expect(size).toBeVisible();
        });

        test('action button appears after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mov.fixture));
          await expect(page.locator('#action-btn')).toBeVisible();
          await expect(page.locator('#action-btn')).toBeEnabled();
        });

        test('clear all resets state', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_mov.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          await page.locator('#clear-all').click();
          await expect(page.locator('.file-item')).not.toBeVisible();
          await expect(page.locator('#action-btn')).not.toBeVisible();
        });

        test('second upload replaces first', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture('sample.mov'));
          let count = await getFileItemCount(page);
          expect(count).toBe(1);
          await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
          count = await getFileItemCount(page);
          expect(count).toBe(1);
        });
      }
    });
  });
});

test.describe('AVI Conversions', () => {
  const source = 'avi';
  const sourceFormats_avi = sourceFormats[source];

  sourceFormats_avi.targets.forEach((target) => {
    const pageUrl = `/avi-to-${target}`;

    test.describe(`AVI to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      if (fixtureAvailable[source]) {
        test('shows file item after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_avi.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          const fileName = page.locator('.file-item__name');
          await expect(fileName).toContainText('sample');
          const size = page.locator('.file-item__size');
          await expect(size).toBeVisible();
        });

        test('action button appears after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_avi.fixture));
          await expect(page.locator('#action-btn')).toBeVisible();
          await expect(page.locator('#action-btn')).toBeEnabled();
        });

        test('clear all resets state', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_avi.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          await page.locator('#clear-all').click();
          await expect(page.locator('.file-item')).not.toBeVisible();
          await expect(page.locator('#action-btn')).not.toBeVisible();
        });

        test('second upload replaces first', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture('sample.avi'));
          let count = await getFileItemCount(page);
          expect(count).toBe(1);
          await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
          count = await getFileItemCount(page);
          expect(count).toBe(1);
        });
      }
    });
  });
});

test.describe('MKV Conversions', () => {
  const source = 'mkv';
  const sourceFormats_mkv = sourceFormats[source];

  sourceFormats_mkv.targets.forEach((target) => {
    const pageUrl = `/mkv-to-${target}`;

    test.describe(`MKV to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      test('page structure correct', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
        await expect(page.locator('#converter-config')).toBeVisible();
        await expect(page.locator('#action-btn')).not.toBeVisible();
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });
    });
  });
});

test.describe('WebM Conversions', () => {
  const source = 'webm';
  const sourceFormats_webm = sourceFormats[source];

  sourceFormats_webm.targets.forEach((target) => {
    const pageUrl = `/webm-to-${target}`;

    test.describe(`WebM to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      test('page structure correct', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
        await expect(page.locator('#converter-config')).toBeVisible();
        await expect(page.locator('#action-btn')).not.toBeVisible();
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });
    });
  });
});

test.describe('GIF Conversions', () => {
  const source = 'gif';
  const sourceFormats_gif = sourceFormats[source];

  sourceFormats_gif.targets.forEach((target) => {
    const pageUrl = `/gif-to-${target}`;

    test.describe(`GIF to ${target.toUpperCase()}`, () => {
      test('page loads with drop zone', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#drop-zone')).toBeVisible();
      });

      test('config has correct target format', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-target-format', target);
      });

      test('config has gif source type', async ({ page }) => {
        await page.goto(pageUrl);
        const config = page.locator('#converter-config');
        await expect(config).toHaveAttribute('data-source-type', 'gif');
      });

      test('action button hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#action-btn')).not.toBeVisible();
      });

      test('clear all hidden initially', async ({ page }) => {
        await page.goto(pageUrl);
        await expect(page.locator('#clear-all')).not.toBeVisible();
      });

      if (fixtureAvailable[source]) {
        test('shows file item after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_gif.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          const fileName = page.locator('.file-item__name');
          await expect(fileName).toContainText('sample');
          const size = page.locator('.file-item__size');
          await expect(size).toBeVisible();
        });

        test('action button appears after upload', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_gif.fixture));
          await expect(page.locator('#action-btn')).toBeVisible();
          await expect(page.locator('#action-btn')).toBeEnabled();
        });

        test('clear all resets state', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture(sourceFormats_gif.fixture));
          await expect(page.locator('.file-item')).toBeVisible();
          await page.locator('#clear-all').click();
          await expect(page.locator('.file-item')).not.toBeVisible();
          await expect(page.locator('#action-btn')).not.toBeVisible();
        });

        test('second upload replaces first', async ({ page }) => {
          await page.goto(pageUrl);
          await page.locator('#file-input').setInputFiles(fixture('sample.gif'));
          let count = await getFileItemCount(page);
          expect(count).toBe(1);
          await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
          count = await getFileItemCount(page);
          expect(count).toBe(1);
        });
      }
    });
  });
});

test.describe('Generic Video to GIF', () => {
  const pageUrl = '/video-to-gif';

  test('page loads with drop zone', async ({ page }) => {
    await page.goto(pageUrl);
    await expect(page.locator('#drop-zone')).toBeVisible();
  });

  test('config has gif target format', async ({ page }) => {
    await page.goto(pageUrl);
    const config = page.locator('#converter-config');
    await expect(config).toHaveAttribute('data-target-format', 'gif');
  });

  test('action button hidden initially', async ({ page }) => {
    await page.goto(pageUrl);
    await expect(page.locator('#action-btn')).not.toBeVisible();
  });

  test('clear all hidden initially', async ({ page }) => {
    await page.goto(pageUrl);
    await expect(page.locator('#clear-all')).not.toBeVisible();
  });

  test('shows file item after upload', async ({ page }) => {
    await page.goto(pageUrl);
    await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
    await expect(page.locator('.file-item')).toBeVisible();
    const fileName = page.locator('.file-item__name');
    await expect(fileName).toContainText('sample');
    const size = page.locator('.file-item__size');
    await expect(size).toBeVisible();
  });

  test('action button appears after upload', async ({ page }) => {
    await page.goto(pageUrl);
    await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
    await expect(page.locator('#action-btn')).toBeVisible();
    await expect(page.locator('#action-btn')).toBeEnabled();
  });

  test('clear all resets state', async ({ page }) => {
    await page.goto(pageUrl);
    await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
    await expect(page.locator('.file-item')).toBeVisible();
    await page.locator('#clear-all').click();
    await expect(page.locator('.file-item')).not.toBeVisible();
    await expect(page.locator('#action-btn')).not.toBeVisible();
  });

  test('second upload replaces first', async ({ page }) => {
    await page.goto(pageUrl);
    await page.locator('#file-input').setInputFiles(fixture('sample.mp4'));
    let count = await getFileItemCount(page);
    expect(count).toBe(1);
    await page.locator('#file-input').setInputFiles(fixture('sample.mov'));
    count = await getFileItemCount(page);
    expect(count).toBe(1);
  });
});
