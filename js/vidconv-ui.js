/**
 * IrisFiles - Video transcoding UI controller
 * Single-file, two-step flow: drop file, then click "Convert".
 * Uses FFmpeg.wasm via vidconv-engine.js for client-side transcoding.
 */

import { convertVideo, getVideoDuration, MAX_VIDEO_SIZE, MAX_DURATION } from './vidconv-engine.js';
import { formatSize, downloadBlob } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

let targetFormat = '';
let dropZone, fileInput, fileList, actionBtn, clearAllBtn;
let currentFile = null;
let converting = false;

export function init() {
  const configEl = document.getElementById('converter-config');
  if (!configEl) return;
  targetFormat = configEl.dataset.targetFormat || '';

  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  actionBtn = document.getElementById('action-btn');
  clearAllBtn = document.getElementById('clear-all');

  if (!dropZone || !fileInput) return;

  // Drop zone events
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    handleFile(fileInput.files);
    fileInput.value = '';
  });

  // Action button: start conversion
  if (actionBtn) actionBtn.addEventListener('click', startConversion);
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
    if (files && files.length > 0) handleFile(files);
  }).catch(() => {});
}

async function handleFile(files) {
  if (converting) return;
  const file = Array.from(files)[0];
  if (!file) return;

  // Replace any existing file (single file mode)
  resetState();
  currentFile = file;

  // Validate size
  if (file.size > MAX_VIDEO_SIZE) {
    showFileItem(file, 0);
    showError(`File too large (${formatSize(file.size)}). Maximum is ${formatSize(MAX_VIDEO_SIZE)}.`);
    return;
  }

  // Get duration and validate
  const duration = await getVideoDuration(file);

  if (duration > 0 && duration > MAX_DURATION) {
    showFileItem(file, duration);
    showError(`Video too long (${formatDuration(duration)}). Maximum is ${formatDuration(MAX_DURATION)}.`);
    return;
  }

  showFileItem(file, duration);
  setStatus('Ready');

  // Show action buttons
  if (actionBtn) { actionBtn.style.display = ''; actionBtn.disabled = false; }
  if (clearAllBtn) clearAllBtn.style.display = '';
}

async function startConversion() {
  if (!currentFile || converting) return;
  converting = true;

  if (actionBtn) actionBtn.disabled = true;

  const t0 = performance.now();
  setProgress(0);

  try {
    const blob = await convertVideo(
      currentFile,
      targetFormat,
      pct => setProgress(pct),
      msg => setStatus(msg)
    );

    const durationMs = Math.round(performance.now() - t0);
    converting = false;

    // Mark done
    const div = document.getElementById('video-file');
    if (div) div.classList.add('done');

    const bar = fileList.querySelector('.file-item__progress-bar');
    if (bar) { bar.style.width = '100%'; bar.classList.add('done'); }

    // Update meta with before/after sizes and conversion time
    const meta = fileList.querySelector('.file-item__meta');
    if (meta) {
      const dur = durationMs < 1000
        ? durationMs + 'ms'
        : (durationMs / 1000).toFixed(1) + 's';
      meta.textContent = formatSize(currentFile.size) + ' \u2192 ' + formatSize(blob.size) + ' \u00b7 ' + dur;
    }

    // Show download button, hide action button
    if (actionBtn) actionBtn.style.display = 'none';

    const outputName = outputFilename(currentFile.name, targetFormat);
    const actions = fileList.querySelector('.file-item__actions');
    if (actions) {
      actions.innerHTML = `
        <button class="btn btn--success btn-download" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
      `;
      actions.querySelector('.btn-download').addEventListener('click', () => {
        downloadBlob(blob, outputName);
      });
    }
  } catch (err) {
    converting = false;
    console.error('Video conversion error:', err);

    const bar = fileList.querySelector('.file-item__progress-bar');
    if (bar) { bar.style.width = '100%'; bar.classList.add('error'); }

    const actions = fileList.querySelector('.file-item__actions');
    if (actions) {
      actions.innerHTML = `<span class="file-item__status error">${esc(err.message || 'Conversion failed')}</span>`;
    }

    // Re-enable action button for retry
    if (actionBtn) actionBtn.disabled = false;
  }
}

function showFileItem(file, duration) {
  fileList.innerHTML = '';
  const metaParts = [formatSize(file.size)];
  if (duration > 0) {
    metaParts.push(formatDuration(duration));
  }

  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = 'video-file';
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(file.name)}</div>
      <div class="file-item__meta">${esc(metaParts.join(' \u00b7 '))}</div>
    </div>
    <div class="file-item__progress">
      <div class="file-item__progress-bar" style="width: 0%"></div>
    </div>
    <div class="file-item__actions">
      <span class="file-item__status">Ready</span>
    </div>
  `;
  fileList.appendChild(div);
}

function showError(msg) {
  const bar = fileList.querySelector('.file-item__progress-bar');
  if (bar) { bar.style.width = '100%'; bar.classList.add('error'); }

  const actions = fileList.querySelector('.file-item__actions');
  if (actions) {
    actions.innerHTML = `<span class="file-item__status error">${esc(msg)}</span>`;
  }

  // Show clear button so user can try again with a different file
  if (clearAllBtn) clearAllBtn.style.display = '';
  if (actionBtn) actionBtn.style.display = 'none';
}

function setProgress(pct) {
  const bar = fileList.querySelector('.file-item__progress-bar');
  if (bar) bar.style.width = pct + '%';
}

function setStatus(msg) {
  const status = fileList.querySelector('.file-item__status');
  if (status) {
    status.textContent = msg;
    status.className = 'file-item__status';
  }
}

function handleClearAll() {
  resetState();
}

function resetState() {
  currentFile = null;
  converting = false;
  fileList.innerHTML = '';
  if (actionBtn) { actionBtn.style.display = 'none'; actionBtn.disabled = false; }
  if (clearAllBtn) clearAllBtn.style.display = 'none';
}

function outputFilename(originalName, fmt) {
  const base = originalName.replace(/\.[^.]+$/, '');
  return base + '.' + fmt;
}

function formatDuration(seconds) {
  const s = Math.round(seconds);
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + 'm ' + rem + 's';
  }
  return s + 's';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
