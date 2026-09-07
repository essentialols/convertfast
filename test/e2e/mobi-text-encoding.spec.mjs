import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

function encodeWindows1252(text) {
  const extra = new Map([
    ['€', 0x80], ['“', 0x93], ['”', 0x94], ['—', 0x97],
  ]);
  return Buffer.from([...text].map((char) => {
    if (extra.has(char)) return extra.get(char);
    const code = char.codePointAt(0);
    if (code <= 0xff) return code;
    throw new Error(`Unsupported fixture character: ${char}`);
  }));
}

function windows1252Mobi() {
  const html = '<html><body><h1>Résumé</h1><p>Café costs €5.</p><p>“Quoted” — done.</p></body></html>';
  const text = encodeWindows1252(html);

  // Palm Database header + two record-table entries + two-byte gap.
  const pdb = Buffer.alloc(96);
  Buffer.from('IrisFiles MOBI fixture').copy(pdb, 0);
  Buffer.from('BOOK').copy(pdb, 60);
  Buffer.from('MOBI').copy(pdb, 64);
  pdb.writeUInt16BE(2, 76);

  const record0Offset = 96;
  const record0 = Buffer.alloc(16 + 232);
  const record1Offset = record0Offset + record0.length;
  pdb.writeUInt32BE(record0Offset, 78);
  pdb.writeUInt32BE(record1Offset, 86);

  // PalmDOC header: uncompressed text, one text record.
  record0.writeUInt16BE(1, 0);
  record0.writeUInt32BE(text.length, 4);
  record0.writeUInt16BE(1, 8);
  record0.writeUInt16BE(4096, 10);

  // MOBI header with an explicit Windows-1252 text encoding.
  Buffer.from('MOBI').copy(record0, 16);
  record0.writeUInt32BE(232, 20);
  record0.writeUInt32BE(2, 24);
  record0.writeUInt32BE(1252, 28);
  record0.writeUInt32BE(1, 32);
  record0.writeUInt32BE(6, 36);

  return Buffer.concat([pdb, record0, text]);
}

test('MOBI to TXT preserves Windows-1252 characters from the declared encoding', async ({ page }) => {
  await page.goto('/mobi-to-txt');
  await page.locator('#file-input').setInputFiles({
    name: 'windows-1252.mobi',
    mimeType: 'application/x-mobipocket-ebook',
    buffer: windows1252Mobi(),
  });

  await page.locator('#action-btn').click();
  const downloadButton = page.locator('#dl-doc');
  await expect(downloadButton).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('windows-1252.txt');

  const output = await readFile(await download.path(), 'utf8');
  expect(output).toContain('Résumé');
  expect(output).toContain('Café costs €5.');
  expect(output).toContain('“Quoted” — done.');
  expect(output).not.toContain('\uFFFD');
});
