/**
 * ConvertFast - UI controller
 * Handles drag-drop, file queue, progress bars, quality slider, batch operations.
 */

import {
  detectFormat, needsHeicDecoder, convertWithCanvas, convertHeic,
  outputFilename, downloadBlob, downloadAsZip, formatSize
} from './converter.js';

// Populated by each page's inline script
let PAGE_CONFIG = {
  sourceFormats: [],     // accepted source mimes, e.g. ['image/heic']
  targetMime: '',        // e.g. 'image/jpeg'
  targetExt: '',         // e.g. 'jpg'
  mode: 'convert',       // 'convert' or 'compress'
};

const CONCURRENCY = 2;
const fileQueue = [];
let activeCount = 0;

// DOM elements (set in init)
let dropZone, fileInput, fileList, downloadAllBtn, clearAllBtn, qualitySlider, qualityValue;

export function configure(config) {
  Object.assign(PAGE_CONFIG, config);
}

export function init() {
  // Auto-configure from data attributes on #converter-config element
  const configEl = document.getElementById('converter-config');
  if (configEl) {
    const src = configEl.dataset.sourceFormats;
    configure({
      sourceFormats: src ? src.split(',') : [],
      targetMime: configEl.dataset.targetMime || '',
      targetExt: configEl.dataset.targetExt || '',
      mode: configEl.dataset.mode || 'convert',
    });
  }

  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  downloadAllBtn = document.getElementById('download-all');
  clearAllBtn = document.getElementById('clear-all');
  qualitySlider = document.getElementById('quality-slider');
  qualityValue = document.getElementById('quality-value');

  if (!dropZone || !fileInput) return;

  // Drop zone events
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  // Quality slider
  if (qualitySlider && qualityValue) {
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value + '%';
    });
  }

  // Batch actions
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', handleDownloadAll);
  }
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', handleClearAll);
  }

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

function handleFiles(files) {
  for (const file of files) {
    addFile(file);
  }
}

async function addFile(file) {
  const entry = {
    id: crypto.randomUUID(),
    file,
    status: 'queued',
    progress: 0,
    outputBlob: null,
    outputName: null,
    detectedFormat: null,
  };
  fileQueue.push(entry);
  renderFileItem(entry);
  processQueue();
}

function getQuality() {
  return qualitySlider ? parseInt(qualitySlider.value) / 100 : 0.92;
}

async function processQueue() {
  while (activeCount < CONCURRENCY) {
    const next = fileQueue.find(f => f.status === 'queued');
    if (!next) break;
    activeCount++;
    next.status = 'processing';
    updateFileItem(next);
    try {
      await processFile(next);
      next.status = 'done';
      next.progress = 100;
    } catch (err) {
      next.status = 'error';
      next.errorMsg = err.message;
      console.error('Conversion error:', err);
    }
    activeCount--;
    updateFileItem(next);
    updateBatchActions();
  }
  // Continue processing if more in queue (use setTimeout to avoid stack growth)
  if (fileQueue.some(f => f.status === 'queued')) {
    setTimeout(processQueue, 0);
  }
}

async function processFile(entry) {
  const fmt = await detectFormat(entry.file);
  entry.detectedFormat = fmt;

  if (!fmt) {
    throw new Error('Unrecognized image format');
  }

  // For compress mode, keep the same format
  const targetMime = PAGE_CONFIG.mode === 'compress' ? fmt.mime : PAGE_CONFIG.targetMime;
  const targetExt = PAGE_CONFIG.mode === 'compress' ? fmt.ext : PAGE_CONFIG.targetExt;

  // Validate source format (skip in compress mode)
  if (PAGE_CONFIG.mode !== 'compress' && PAGE_CONFIG.sourceFormats.length > 0) {
    if (!PAGE_CONFIG.sourceFormats.includes(fmt.mime)) {
      throw new Error(`Expected ${PAGE_CONFIG.sourceFormats.join(' or ')}, got ${fmt.mime}`);
    }
  }

  entry.outputName = outputFilename(entry.file.name, targetExt);
  const quality = getQuality();

  if (needsHeicDecoder(fmt.mime)) {
    entry.statusText = 'Loading HEIC engine...';
    updateFileItem(entry);
    entry.outputBlob = await convertHeic(entry.file, targetMime, quality, (pct) => {
      entry.statusText = null;
      entry.progress = pct;
      updateFileItem(entry);
    });
  } else {
    entry.progress = 30;
    updateFileItem(entry);
    entry.outputBlob = await convertWithCanvas(entry.file, targetMime, quality);
    entry.progress = 100;
  }
}

function renderFileItem(entry) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = `file-${entry.id}`;
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${escapeHtml(entry.file.name)}</div>
      <div class="file-item__meta">${formatSize(entry.file.size)}</div>
    </div>
    <div class="file-item__progress">
      <div class="file-item__progress-bar" style="width: 0%"></div>
    </div>
    <div class="file-item__actions">
      <span class="file-item__status">Queued</span>
    </div>
  `;
  fileList.appendChild(div);
  updateBatchActions();
}

function updateFileItem(entry) {
  const div = document.getElementById(`file-${entry.id}`);
  if (!div) return;

  const bar = div.querySelector('.file-item__progress-bar');
  const status = div.querySelector('.file-item__status');
  const actions = div.querySelector('.file-item__actions');
  const meta = div.querySelector('.file-item__meta');

  bar.style.width = entry.progress + '%';
  bar.className = 'file-item__progress-bar';

  if (entry.status === 'processing') {
    status.textContent = entry.statusText || 'Converting...';
    status.className = 'file-item__status';
  } else if (entry.status === 'done') {
    bar.classList.add('done');
    const sizeInfo = entry.outputBlob ? ` \u2192 ${formatSize(entry.outputBlob.size)}` : '';
    meta.textContent = formatSize(entry.file.size) + sizeInfo;
    actions.innerHTML = `
      <button class="btn btn--success btn-download" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
      <button class="btn btn--danger btn-remove">Remove</button>
    `;
    actions.querySelector('.btn-download').addEventListener('click', () => {
      downloadBlob(entry.outputBlob, entry.outputName);
    });
    actions.querySelector('.btn-remove').addEventListener('click', () => {
      removeFile(entry.id);
    });
  } else if (entry.status === 'error') {
    bar.classList.add('error');
    bar.style.width = '100%';
    actions.innerHTML = `
      <span class="file-item__status error">${escapeHtml(entry.errorMsg || 'Error')}</span>
      <button class="btn btn--danger btn-remove">Remove</button>
    `;
    actions.querySelector('.btn-remove').addEventListener('click', () => {
      removeFile(entry.id);
    });
  }
}

function removeFile(id) {
  const idx = fileQueue.findIndex(f => f.id === id);
  if (idx !== -1) fileQueue.splice(idx, 1);
  const el = document.getElementById(`file-${id}`);
  if (el) el.remove();
  updateBatchActions();
}

function updateBatchActions() {
  const doneFiles = fileQueue.filter(f => f.status === 'done');
  if (downloadAllBtn) {
    downloadAllBtn.style.display = doneFiles.length >= 2 ? '' : 'none';
  }
  if (clearAllBtn) {
    clearAllBtn.style.display = fileQueue.length > 0 ? '' : 'none';
  }
}

async function handleDownloadAll() {
  const doneFiles = fileQueue.filter(f => f.status === 'done' && f.outputBlob);
  if (doneFiles.length < 2) return;

  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = 'Zipping...';

  const entries = await Promise.all(doneFiles.map(async f => ({
    name: f.outputName,
    data: new Uint8Array(await f.outputBlob.arrayBuffer())
  })));

  await downloadAsZip(entries, 'convertfast-batch.zip');
  downloadAllBtn.disabled = false;
  downloadAllBtn.textContent = 'Download All as ZIP';
}

function handleClearAll() {
  fileQueue.length = 0;
  fileList.innerHTML = '';
  updateBatchActions();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
