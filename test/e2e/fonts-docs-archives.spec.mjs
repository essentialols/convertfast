import { readFile } from 'node:fs/promises';
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

test.describe('Document Pages - EPUB Conversion', () => {
  test('EPUB to TXT preserves readable block boundaries and Unicode', async ({ page }) => {
    await page.goto('/epub-to-txt');
    await page.locator('#file-input').setInputFiles(fixture('sample.epub'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#doc-results')).toBeVisible({ timeout: 30000 });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#dl-doc').click();
    const download = await downloadPromise;
    const outputPath = await download.path();
    expect(outputPath).toBeTruthy();

    const text = await readFile(outputPath, 'utf8');
    expect(text).toBe(
      'Chapter One\nIrisFiles fixture. Unicode: café 日本語 Ω.\n\n' +
      'Chapter Two\nSecond chapter with more text to paginate.'
    );
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

test.describe('Document Pages - DOCX Visible Text', () => {
  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function storedZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const [name, value] of Object.entries(entries)) {
      const nameBytes = Buffer.from(name, 'utf8');
      const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
      const crc = crc32(data);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034B50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
      local.writeUInt16LE(0, 8);      // stored, no compression
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBytes.length, 26);
      localParts.push(local, nameBytes, data);

      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014B50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x0800, 8);
      central.writeUInt16LE(0, 10);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(data.length, 20);
      central.writeUInt32LE(data.length, 24);
      central.writeUInt16LE(nameBytes.length, 28);
      central.writeUInt32LE(offset, 42);
      centralParts.push(central, nameBytes);

      offset += local.length + nameBytes.length + data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054B50, 0);
    end.writeUInt16LE(Object.keys(entries).length, 8);
    end.writeUInt16LE(Object.keys(entries).length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);

    return Buffer.concat([...localParts, ...centralParts, end]);
  }

  function nestedVisibleTextDocx() {
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r><w:t xml:space="preserve">Before </w:t></w:r>
      <w:ins w:id="1" w:author="IrisFiles"><w:r><w:t>inserted ✓</w:t></w:r></w:ins>
      <w:r><w:t xml:space="preserve"> after</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>Line one</w:t><w:br/><w:t>Line two</w:t></w:r></w:p>
    <w:p><w:r><w:t>Label</w:t><w:tab/><w:t>Value</w:t></w:r></w:p>
    <w:p><w:hyperlink r:id="rId2"><w:r><w:t>Docs</w:t><w:br/><w:t>Next</w:t></w:r></w:hyperlink></w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Visible: </w:t></w:r>
      <w:sdt><w:sdtContent><w:r><w:t>controlled</w:t></w:r></w:sdtContent></w:sdt>
    </w:p>
    <w:p>
      <w:r><w:t>Keep</w:t></w:r>
      <w:del w:id="2" w:author="IrisFiles"><w:r><w:delText xml:space="preserve"> old</w:delText></w:r></w:del>
      <w:r><w:t xml:space="preserve"> new</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
    const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/>
</Relationships>`;

    return storedZip({
      '[Content_Types].xml': contentTypes,
      '_rels/.rels': rels,
      'word/document.xml': documentXml,
      'word/_rels/document.xml.rels': documentRels,
    });
  }

  test('keeps visible text inside valid WordprocessingML wrappers', async ({ page }) => {
    await page.goto('/docx-to-txt');
    await page.locator('#file-input').setInputFiles({
      name: 'nested-visible-text.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: nestedVisibleTextDocx(),
    });

    await page.locator('#action-btn').click();
    await expect(page.locator('#dl-doc')).toBeVisible({ timeout: 30000 });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#dl-doc').click();
    const download = await downloadPromise;
    const text = await readFile(await download.path(), 'utf8');

    expect(text).toBe([
      'Before inserted ✓ after',
      'Line one',
      'Line two',
      'Label\tValue',
      'Docs',
      'Next',
      'Visible: controlled',
      'Keep new',
    ].join('\n'));
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

  test('archive actions remain comfortable touch targets on narrow phones', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`/extract-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.zip'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#archive-results')).toBeVisible({ timeout: 15000 });

    for (const selector of ['#action-btn', '#clear-all', '.btn-remove', '#dl-all', '.dl-btn']) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    await page.goto(`/create-zip`);
    await page.locator('#file-input').setInputFiles(fixture('sample.png'));
    await page.locator('#action-btn').click();
    await expect(page.locator('#archive-results')).toBeVisible({ timeout: 15000 });
    const downloadBox = await page.locator('#dl-zip').boundingBox();
    expect(downloadBox?.height ?? 0).toBeGreaterThanOrEqual(44);
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
