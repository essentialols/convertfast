/**
 * IrisFiles - Video speed UI controller
 * Single-file, two-step flow with speed preset and audio controls.
 */

import { changeVideoSpeed, WARN_VIDEO_SIZE, MAX_DURATION } from './vidspeed-engine.js';
import { getVideoMetadata } from './vidconv-engine.js';
import { formatSize, downloadBlob } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';
import { checkWorkload } from './device-tier.js';
import { showPersistentNotice } from './notice-ui.js';

let dropZone, fileInput, fileList, actionBtn, clearAllBtn;
let speedSelect, keepAudioCheckbox;
let currentFile = null;
let currentMeta = null;
let converting = false;

export function init() {
  dropZone          = document.getElementById('drop-zone');
  fileInput         = document.getElementById('file-input');
  fileList          = document.getElementById('file-list');
  actionBtn         = document.getElementById('action-btn');
  clearAllBtn       = document.getElementById('clear-all');
  speedSelect       = document.getElementById('speed-preset');
  keepAudioCheckbox = document.getElementById('keep-audio');

  if (!dropZone || !fileInput) return;

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

  if (actionBtn) actionBtn.addEventListener('click', startSpeedChange);
  if (clearAllBtn) clearAllBtn.addEventListener('click', resetState);

  if (speedSelect) speedSelect.addEventListener('change', updateEstimate);

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        const a = el.querySelector('.faq-answer');
        if (a) a.style.maxHeight = null;
      });
      if (!isOpen && answer) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
    });
  });

  loadPendingFiles().then(files => {
    if (files && files.length > 0) handleFile(files);
  }).catch(() => {});
}

async function handleFile(files) {
  if (converting) return;
  const file = Array.from(files)[0];
  if (!file) return;

  resetState();
  currentFile = file;

  if (file.size > WARN_VIDEO_SIZE) {
    showNotice(`Large file (${formatSize(file.size)}). This may be slow or crash your browser on low-memory devices.`);
  }

  const meta = await getVideoMetadata(file);
  currentMeta = meta;

  if (meta.duration > 0 && meta.duration > MAX_DURATION) {
    showFileItem(file, meta);
    showError(`Video too long (${formatDuration(meta.duration)}). Maximum is ${formatDuration(MAX_DURATION)}.`);
    return;
  }

  showFileItem(file, meta);

  const warn = checkWorkload({ fileSizeMb: file.size / 1e6, isVideo: true });
  if (warn) showNotice(warn);

  setStatus('Ready');
  updateEstimate();

  if (actionBtn) { actionBtn.style.display = ''; actionBtn.disabled = false; }
  if (clearAllBtn) clearAllBtn.style.display = '';
}

function updateEstimate() {
  if (!currentMeta || currentMeta.duration <= 0) return;
  const speed = parseFloat(speedSelect.value);
  const outDuration = currentMeta.duration / speed;
  const estimate = fileList.querySelector('.file-item__estimate');
  if (estimate) {
    estimate.textContent = `Output duration: ~${formatDuration(outDuration)}`;
  }
}

async function startSpeedChange() {
  if (!currentFile || converting) return;
  converting = true;
  if (actionBtn) actionBtn.disabled = true;

  const speed = parseFloat(speedSelect.value);
  const keepAudio = keepAudioCheckbox ? keepAudioCheckbox.checked : true;

  const t0 = performance.now();
  setProgress(0);

  try {
    const blob = await changeVideoSpeed(
      currentFile,
      { speed, keepAudio },
      pct => setProgress(pct),
      msg => setStatus(msg)
    );

    const ms = Math.round(performance.now() - t0);
    const dur = ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
    converting = false;

    const div = document.getElementById('video-file');
    if (div) div.classList.add('done');

    const bar = fileList.querySelector('.file-item__progress-bar');
    if (bar) { bar.style.width = '100%'; bar.classList.add('done'); }

    const meta = fileList.querySelector('.file-item__meta');
    if (meta) {
      const parts = [
        formatSize(currentFile.size) + ' \u2192 ' + formatSize(blob.size),
        speed + 'x speed',
        '\u00b7 ' + dur,
      ];
      meta.textContent = parts.join(' ');
    }

    if (actionBtn) actionBtn.style.display = 'none';

    const suffix = speed >= 2 ? '-timelapse' : '-slowmo';
    const outName = currentFile.name.replace(/\.[^.]+$/, '') + suffix + '.mp4';
    const actions = fileList.querySelector('.file-item__actions');
    if (actions) {
      actions.innerHTML = `
        <button class="btn btn--success btn-download" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
      `;
      actions.querySelector('.btn-download').addEventListener('click', () => {
        downloadBlob(blob, outName);
      });
    }
  } catch (err) {
    converting = false;
    console.error('Video speed change error:', err);

    const bar = fileList.querySelector('.file-item__progress-bar');
    if (bar) { bar.style.width = '100%'; bar.classList.add('error'); }

    const actions = fileList.querySelector('.file-item__actions');
    if (actions) {
      actions.innerHTML = `<span class="file-item__status error">${esc(err.message || 'Speed change failed')}</span>`;
    }

    if (actionBtn) actionBtn.disabled = false;
  }
}

function showFileItem(file, meta) {
  fileList.innerHTML = '';
  const parts = [formatSize(file.size)];
  if (meta) {
    if (meta.width > 0 && meta.height > 0) parts.push(meta.width + '\u00d7' + meta.height);
    if (meta.duration > 0) parts.push(formatDuration(meta.duration));
  }

  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = 'video-file';
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(file.name)}</div>
      <div class="file-item__meta">${esc(parts.join(' \u00b7 '))}</div>
      <div class="file-item__estimate" style="font-size:0.8rem;color:var(--text-muted)"></div>
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
  if (clearAllBtn) clearAllBtn.style.display = '';
  if (actionBtn) actionBtn.style.display = 'none';
}

function setProgress(pct) {
  const bar = fileList.querySelector('.file-item__progress-bar');
  if (bar) bar.style.width = pct + '%';
}

function setStatus(msg) {
  const s = fileList.querySelector('.file-item__status');
  if (s) { s.textContent = msg; s.className = 'file-item__status'; }
}

function showNotice(msg) {
  showPersistentNotice(dropZone, msg, { id: 'cf-notice', kind: 'warning' });
}

function resetState() {
  currentFile = null;
  currentMeta = null;
  converting = false;
  fileList.innerHTML = '';
  if (actionBtn) { actionBtn.style.display = 'none'; actionBtn.disabled = false; }
  if (clearAllBtn) clearAllBtn.style.display = 'none';
}

function formatDuration(s) {
  const sec = Math.round(s);
  if (sec >= 60) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return sec + 's';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
