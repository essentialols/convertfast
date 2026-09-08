import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.env.IRIS_ROOT;
const BASE = process.env.IRIS_BASE || 'http://localhost:3988';
const SHOTS = process.env.IRIS_SHOTS;
fs.mkdirSync(SHOTS, { recursive: true });

// name | page | fixture(s) | optional pre-action
const CASES = JSON.parse(fs.readFileSync(process.env.IRIS_CASES, 'utf8'));

const browser = await chromium.launch();
const results = [];

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: c.viewport || { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push('console: ' + m.text()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  page.on('requestfailed', r => logs.push('reqfail: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));

  let status = 'unknown';
  try {
    await page.goto(`${BASE}/${c.page}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    if (c.files) {
      const paths = c.files.map(f => path.join(ROOT, f));
      await page.setInputFiles('input[type="file"]', paths);
      await page.waitForTimeout(c.wait || 6000);
    }
    // Doc/archive/PDF/font pages do not auto-convert; they need the action button.
    const action = page.locator('#action-btn');
    if (await action.count() && await action.isVisible().catch(() => false)) {
      await action.click();
      await page.waitForTimeout(c.wait || 6000);
    }
    if (c.action === 'click' && c.selector) {
      await page.locator(c.selector).first().click();
      await page.waitForTimeout(c.wait || 3000);
    }
    if (c.fill) {
      for (const [sel, val] of Object.entries(c.fill)) {
        await page.locator(sel).first().fill(String(val));
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(c.wait || 4000);
    }

    const doneCount = await page.locator('.file-item__status.done, .file-item.done').count();
    const dlCount = await page.locator('.btn-download, #dl-doc, [id^="dl-"]').filter({ visible: true }).count();
    const errText = await page.locator('.file-item__status.error, .error-message, .file-item__error').filter({ visible: true }).allInnerTexts().catch(() => []);
    const resultText = (await page.locator('#result-text, #output, .result-preview').first().innerText().catch(() => '')).slice(0, 120);
    status = doneCount > 0 ? `done(${doneCount})`
      : dlCount > 0 ? `download-ready(${dlCount})`
      : errText.length ? 'error: ' + errText.join(' | ').slice(0, 200)
      : 'no-result';
    if (resultText) status += ` | text="${resultText.replace(/\s+/g, ' ')}"`;
  } catch (e) {
    status = 'THREW: ' + e.message.split('\n')[0].slice(0, 180);
  }

  const shot = path.join(SHOTS, `${c.name}.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  results.push({ name: c.name, page: c.page, status, logs: [...new Set(logs)].slice(0, 6) });
  await ctx.close();
}

await browser.close();
for (const r of results) {
  console.log(`\n### ${r.name}  [${r.page}]\n  status: ${r.status}`);
  for (const l of r.logs) console.log('  ' + l.slice(0, 200));
}
fs.writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify(results, null, 2));
