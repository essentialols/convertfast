import { resolve } from 'node:path';

export const FIXTURES = resolve(import.meta.dirname, '..', 'fixtures');

export function fixture(name) {
  return resolve(FIXTURES, name);
}

export async function dropFile(page, selector, filePath) {
  const input = page.locator(`${selector} ~ input[type="file"], input[type="file"]`).first();
  await input.setInputFiles(filePath);
}

export async function dropFiles(page, selector, filePaths) {
  const input = page.locator(`${selector} ~ input[type="file"], input[type="file"]`).first();
  await input.setInputFiles(filePaths);
}

export async function waitForDone(page, { timeout = 30_000 } = {}) {
  await page.locator('.file-item.done, .btn-download, .btn--success').first().waitFor({ timeout });
}

export async function waitForStatus(page, text, { timeout = 30_000 } = {}) {
  await page.locator(`.file-item__status:has-text("${text}")`).first().waitFor({ timeout });
}

export async function getFileItemCount(page) {
  return page.locator('.file-item').count();
}

export async function clickButton(page, text) {
  await page.getByRole('button', { name: text }).click();
}

export async function expectDownloadOnClick(page, buttonSelector) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(buttonSelector).click(),
  ]);
  return download;
}
