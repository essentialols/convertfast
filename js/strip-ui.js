/**
 * IrisFiles - Strip EXIF/metadata UI controller
 * Handles drag-drop, file queue, progress bars, batch processing, ZIP download.
 */

import { stripMetadata } from './strip-engine.js';
import { formatSize, downloadBlob, downloadAsZip, outputFilename, validateFile, MAX_BATCH_SIZE } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const CONCURRENCY = 2;
const fileQueue = [];
let activeCount = 0;

let dropZone, fileInput, fileList, downloadAllBtn, clearAllBtn;

export function init() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  downloadAllBtn = document.getElementById('download-all');
  clearAllBtn = document.getElementById('clear-all');

  if (!dropZone || !fileInput) return;

  // Drop zone events
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  // Batch actions
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', handleDownloadAll);
  if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-answer').style.maxHeight = null;
      });
      if (!isOpen) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
    });
  });

  // Auto-load files passed from landing page smart drop
  loadPendingFiles().then(files => {
    if (files && files.length > 0) handleFiles(files);
  }).catch(() => {});
}

function handleFiles(files) {
  const remaining = MAX_BATCH_SIZE - fileQueue.length;
  if (remaining <= 0) {
    showNotice(`Batch limit reached (${MAX_BATCH_SIZE} files). Clear some files first.`);
    return;
  }
  const toAdd = Array.from(files).slice(0, remaining);
  if (toAdd.length < files.length) {
    showNotice(`Only added ${toAdd.length} of ${files.length} files (batch limit: ${MAX_BATCH_SIZE}).`);
  }
  for (const file of toAdd) {
    addFile(file);
  }
}

function addFile(file) {
  const entry = {
    id: crypto.randomUUID(),
    file,
    status: 'queued',
    progress: 0,
    outputBlob: null,
    outputName: null,
    durationMs: null,
  };

  // Pre-validate file size
  try {
    validateFile(file);
  } catch (err) {
    entry.status = 'error';
    entry.errorMsg = err.message;
    fileQueue.push(entry);
    renderFileItem(entry);
    updateFileItem(entry);
    updateBatchActions();
    return;
  }

  fileQueue.push(entry);
  renderFileItem(entry);
  processQueue();
}

async function processQueue() {
  while (activeCount < CONCURRENCY) {
    const next = fileQueue.find(f => f.status === 'queued');
    if (!next) break;
    activeCount++;
    next.status = 'processing';
    updateFileItem(next);
    const t0 = performance.now();
    try {
      next.outputName = stripOutputFilename(next.file);
      next.outputBlob = await stripMetadata(next.file, pct => {
        next.progress = pct;
        updateFileItem(next);
      });
      next.durationMs = Math.round(performance.now() - t0);
      next.status = 'done';
      next.progress = 100;
    } catch (err) {
      next.status = 'error';
      next.errorMsg = err.message;
      console.error('Strip metadata error:', err);
    }
    activeCount--;
    updateFileItem(next);
    updateBatchActions();
  }
  if (fileQueue.some(f => f.status === 'queued')) {
    setTimeout(processQueue, 0);
  }
}

/**
 * Build output filename: originalname-clean.png or originalname-clean.jpg.
 * PNG stays PNG, everything else becomes JPG (mirrors strip-engine.js logic).
 */
function stripOutputFilename(file) {
  const isPng = file.type === 'image/png' ||
    (file.name && file.name.toLowerCase().endsWith('.png'));
  const ext = isPng ? 'png' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '');
  return `${base}-clean.${ext}`;
}

function renderFileItem(entry) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = `file-${entry.id}`;
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(entry.file.name)}</div>
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

  div.className = 'file-item' + (entry.status === 'done' ? ' done' : '');
  bar.style.width = entry.progress + '%';
  bar.className = 'file-item__progress-bar';

  if (entry.status === 'processing') {
    status.textContent = 'Stripping...';
    status.className = 'file-item__status';
  } else if (entry.status === 'done') {
    bar.classList.add('done');
    let metaParts = [];
    if (entry.outputBlob) {
      // Show before/after sizes prominently: privacy tool users want to see metadata was removed
      metaParts.push(formatSize(entry.file.size) + ' \u2192 ' + formatSize(entry.outputBlob.size));
      const saved = entry.file.size - entry.outputBlob.size;
      if (saved > 0) {
        metaParts.push('(' + formatSize(saved) + ' removed)');
      }
    } else {
      metaParts.push(formatSize(entry.file.size));
    }
    if (entry.durationMs !== null) {
      const dur = entry.durationMs < 1000
        ? entry.durationMs + 'ms'
        : (entry.durationMs / 1000).toFixed(1) + 's';
      metaParts.push('\u00b7 ' + dur);
    }
    meta.textContent = metaParts.join(' ');
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
      <span class="file-item__status error">${esc(entry.errorMsg || 'Error')}</span>
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
  updateBatchSummary();
}

async function handleDownloadAll() {
  const doneFiles = fileQueue.filter(f => f.status === 'done' && f.outputBlob);
  if (doneFiles.length < 2) return;

  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = 'Zipping...';

  const entries = await Promise.all(doneFiles.map(async f => ({
    name: f.outputName,
    data: new Uint8Array(await f.outputBlob.arrayBuffer()),
  })));

  await downloadAsZip(entries, 'irisfiles-clean.zip');
  downloadAllBtn.disabled = false;
  downloadAllBtn.textContent = 'Download All as ZIP';
}

function handleClearAll() {
  fileQueue.length = 0;
  fileList.innerHTML = '';
  updateBatchActions();
}

function updateBatchSummary() {
  const doneFiles = fileQueue.filter(f => f.status === 'done' && f.outputBlob);
  let summary = document.getElementById('batch-summary');
  if (doneFiles.length < 2) {
    if (summary) summary.style.display = 'none';
    return;
  }
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'batch-summary';
    summary.className = 'batch-summary';
    const batchActions = document.querySelector('.batch-actions');
    if (batchActions) batchActions.parentElement.insertBefore(summary, batchActions);
  }
  const totalIn = doneFiles.reduce((s, f) => s + f.file.size, 0);
  const totalOut = doneFiles.reduce((s, f) => s + f.outputBlob.size, 0);
  const totalSaved = totalIn - totalOut;
  const avgMs = Math.round(doneFiles.reduce((s, f) => s + (f.durationMs || 0), 0) / doneFiles.length);
  const avgDur = avgMs < 1000 ? avgMs + 'ms' : (avgMs / 1000).toFixed(1) + 's';
  const savedPart = totalSaved > 0 ? ' \u00b7 ' + formatSize(totalSaved) + ' metadata removed' : '';
  summary.textContent = `${doneFiles.length} files: ${formatSize(totalIn)} \u2192 ${formatSize(totalOut)}${savedPart} \u00b7 avg ${avgDur}/file`;
  summary.style.display = '';
}

function showNotice(msg) {
  let notice = document.getElementById('cf-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'cf-notice';
    notice.className = 'notice';
    dropZone.parentElement.insertBefore(notice, dropZone.nextSibling);
  }
  notice.textContent = msg;
  notice.style.display = '';
  clearTimeout(notice._timer);
  notice._timer = setTimeout(() => { notice.style.display = 'none'; }, 5000);
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
