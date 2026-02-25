/**
 * IrisFiles - Image resize UI controller
 * Handles drag-drop, file queue, progress bars, batch resize, ZIP download.
 * Supports resize by dimensions (with optional aspect ratio lock) or by percentage.
 */

import { resizeImage, getImageDimensions } from './resize-engine.js';
import { formatSize, downloadBlob, downloadAsZip, outputFilename, validateFile, MAX_BATCH_SIZE } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const CONCURRENCY = 2;
const fileQueue = [];
let activeCount = 0;

// Original dimensions of the first file dropped (used for aspect ratio lock)
let origW = 0;
let origH = 0;
let aspectRatio = 0; // origW / origH

let dropZone, fileInput, fileList, downloadAllBtn, clearAllBtn;
let widthInput, heightInput, percentInput, resizeMode, lockAspect;

export function init() {
  dropZone       = document.getElementById('drop-zone');
  fileInput      = document.getElementById('file-input');
  fileList       = document.getElementById('file-list');
  downloadAllBtn = document.getElementById('download-all');
  clearAllBtn    = document.getElementById('clear-all');
  widthInput     = document.getElementById('resize-width');
  heightInput    = document.getElementById('resize-height');
  percentInput   = document.getElementById('resize-percent');
  resizeMode     = document.getElementById('resize-mode');
  lockAspect     = document.getElementById('lock-aspect');

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
  if (clearAllBtn)    clearAllBtn.addEventListener('click', handleClearAll);

  // Resize mode toggle (dimensions vs percent)
  if (resizeMode) {
    resizeMode.addEventListener('change', applyModeUI);
    applyModeUI();
  }

  // Aspect ratio lock: when width changes, recalculate height and vice versa
  // Also re-queue done items so changing dimensions re-processes them
  if (widthInput) {
    widthInput.addEventListener('input', () => {
      if (lockAspect && lockAspect.checked && aspectRatio > 0) {
        const w = parseInt(widthInput.value, 10);
        if (!isNaN(w) && w > 0) {
          heightInput.value = Math.round(w / aspectRatio);
        }
      }
      requeueDoneItems();
    });
  }
  if (heightInput) {
    heightInput.addEventListener('input', () => {
      if (lockAspect && lockAspect.checked && aspectRatio > 0) {
        const h = parseInt(heightInput.value, 10);
        if (!isNaN(h) && h > 0) {
          widthInput.value = Math.round(h * aspectRatio);
        }
      }
      requeueDoneItems();
    });
  }
  if (percentInput) {
    percentInput.addEventListener('input', () => requeueDoneItems());
  }
  if (resizeMode) {
    resizeMode.addEventListener('change', () => requeueDoneItems());
  }

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

// Show/hide the correct inputs based on mode selection
function applyModeUI() {
  if (!resizeMode) return;
  const isDimensions = resizeMode.value === 'dimensions' || !resizeMode.value;
  const dimensionsGroup = document.getElementById('dimensions-group');
  const percentGroup    = document.getElementById('percent-group');
  if (dimensionsGroup) dimensionsGroup.style.display = isDimensions ? '' : 'none';
  if (percentGroup)    percentGroup.style.display    = isDimensions ? 'none' : '';
}

function currentMode() {
  if (!resizeMode) return 'dimensions';
  return resizeMode.value || 'dimensions';
}

// Build resize opts from current UI state
function getResizeOpts(inputMime) {
  const outputMime = inputMime === 'image/png' ? 'image/png' : 'image/jpeg';
  const opts = { outputMime };
  if (currentMode() === 'percent') {
    opts.percent = parseFloat(percentInput && percentInput.value) || 100;
  } else {
    const w = parseInt(widthInput && widthInput.value, 10);
    const h = parseInt(heightInput && heightInput.value, 10);
    if (w > 0) opts.width  = w;
    if (h > 0) opts.height = h;
  }
  return opts;
}

// Derive output extension from output mime
function outputExtFromMime(mime) {
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

// Build output filename: base-WxH.ext or base-Npct.ext
function resizeOutputFilename(origName, opts) {
  const base = origName.replace(/\.[^.]+$/, '');
  const ext  = outputExtFromMime(opts.outputMime);
  if (opts.percent != null) {
    return `${base}-${opts.percent}pct.${ext}`;
  }
  const w = opts.width  || origW || 0;
  const h = opts.height || origH || 0;
  if (w > 0 && h > 0) return `${base}-${w}x${h}.${ext}`;
  if (w > 0)          return `${base}-${w}w.${ext}`;
  if (h > 0)          return `${base}-${h}h.${ext}`;
  return `${base}-resized.${ext}`;
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
  // Read dimensions from first file to seed the width/height inputs
  const isFirst = fileQueue.length === 0;
  for (const file of toAdd) {
    addFile(file);
  }
  if (isFirst && toAdd.length > 0) {
    getImageDimensions(toAdd[0]).then(({ width, height }) => {
      origW = width;
      origH = height;
      aspectRatio = height > 0 ? width / height : 0;
      if (widthInput  && !widthInput.value)  widthInput.value  = width;
      if (heightInput && !heightInput.value) heightInput.value = height;
    }).catch(() => {});
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

  try {
    validateFile(file);
  } catch (err) {
    entry.status   = 'error';
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

let _requeueTimer = null;
function requeueDoneItems() {
  clearTimeout(_requeueTimer);
  _requeueTimer = setTimeout(() => {
    let changed = false;
    for (const entry of fileQueue) {
      if (entry.status === 'done') {
        entry.outputBlob = null;
        entry.outputName = null;
        entry.status = 'queued';
        entry.progress = 0;
        updateFileItem(entry);
        changed = true;
      }
    }
    if (changed) processQueue();
  }, 400);
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
      const mime = next.file.type || 'image/jpeg';
      const opts = getResizeOpts(mime);
      // Upscale warning
      const dims = await getImageDimensions(next.file).catch(() => null);
      if (dims) {
        const isUpscale = (opts.width && opts.width > dims.width) ||
                          (opts.height && opts.height > dims.height) ||
                          (opts.percent && opts.percent > 100);
        if (isUpscale) showNotice('Upscaling beyond original dimensions. Quality may be reduced.');
      }
      next.outputName = resizeOutputFilename(next.file.name, opts);
      next.outputBlob = await resizeImage(next.file, opts, pct => {
        next.progress = pct;
        updateFileItem(next);
      });
      next.durationMs = Math.round(performance.now() - t0);
      next.status   = 'done';
      next.progress = 100;
    } catch (err) {
      next.status   = 'error';
      next.errorMsg = err.message;
      console.error('Resize error:', err);
    }
    activeCount--;
    updateFileItem(next);
    updateBatchActions();
  }
  if (fileQueue.some(f => f.status === 'queued')) {
    setTimeout(processQueue, 0);
  }
}

function renderFileItem(entry) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = `file-${entry.id}`;
  const isImage = entry.file.type && entry.file.type.startsWith('image/');
  div.innerHTML = `
    ${isImage ? '<div class="file-item__thumb"></div>' : ''}
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
  if (isImage) {
    const thumb = div.querySelector('.file-item__thumb');
    const url = URL.createObjectURL(entry.file);
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    img.onerror = () => URL.revokeObjectURL(url);
    thumb.appendChild(img);
  }
  fileList.appendChild(div);
  updateBatchActions();
}

function updateFileItem(entry) {
  const div = document.getElementById(`file-${entry.id}`);
  if (!div) return;

  const bar     = div.querySelector('.file-item__progress-bar');
  const status  = div.querySelector('.file-item__status');
  const actions = div.querySelector('.file-item__actions');
  const meta    = div.querySelector('.file-item__meta');

  div.className    = 'file-item' + (entry.status === 'done' ? ' done' : '');
  bar.style.width  = entry.progress + '%';
  bar.className    = 'file-item__progress-bar';

  if (entry.status === 'processing') {
    status.textContent = 'Resizing...';
    status.className   = 'file-item__status';
  } else if (entry.status === 'done') {
    bar.classList.add('done');
    let metaParts = [formatSize(entry.file.size)];
    if (entry.outputBlob) {
      metaParts.push('\u2192 ' + formatSize(entry.outputBlob.size));
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
  // Reset seed dimensions if queue is now empty
  if (fileQueue.length === 0) {
    origW = 0;
    origH = 0;
    aspectRatio = 0;
  }
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

  downloadAllBtn.disabled    = true;
  downloadAllBtn.textContent = 'Zipping...';

  const entries = await Promise.all(doneFiles.map(async f => ({
    name: f.outputName,
    data: new Uint8Array(await f.outputBlob.arrayBuffer()),
  })));

  await downloadAsZip(entries, 'irisfiles-resized.zip');
  downloadAllBtn.disabled    = false;
  downloadAllBtn.textContent = 'Download All as ZIP';
}

function handleClearAll() {
  fileQueue.length = 0;
  fileList.innerHTML = '';
  origW = 0;
  origH = 0;
  aspectRatio = 0;
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
    summary.id        = 'batch-summary';
    summary.className = 'batch-summary';
    const batchActions = document.querySelector('.batch-actions');
    if (batchActions) batchActions.parentElement.insertBefore(summary, batchActions);
  }
  const totalIn  = doneFiles.reduce((s, f) => s + f.file.size, 0);
  const totalOut = doneFiles.reduce((s, f) => s + f.outputBlob.size, 0);
  const avgMs    = Math.round(doneFiles.reduce((s, f) => s + (f.durationMs || 0), 0) / doneFiles.length);
  const avgDur   = avgMs < 1000 ? avgMs + 'ms' : (avgMs / 1000).toFixed(1) + 's';
  summary.textContent = `${doneFiles.length} files: ${formatSize(totalIn)} \u2192 ${formatSize(totalOut)} \u00b7 avg ${avgDur}/file`;
  summary.style.display = '';
}

function showNotice(msg) {
  let notice = document.getElementById('cf-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id        = 'cf-notice';
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
