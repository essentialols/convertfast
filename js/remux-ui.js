/**
 * IrisFiles - MOV to MP4 remux UI controller
 * Single-file mode with auto-process on drop (remux is instant).
 * Shows original name, before/after size, video duration, download button.
 */

import { remuxMovToMp4 } from './remux-engine.js';
import { formatSize, downloadBlob } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

let currentEntry = null;

let dropZone, fileInput, fileList, clearAllBtn;

export function init() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
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

  // Clear button
  if (clearAllBtn) clearAllBtn.addEventListener('click', handleClear);

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

function handleFile(files) {
  if (!files || files.length === 0) return;

  // Single file mode: take the first file, replace any existing
  const file = files[0];

  // Clear previous result
  if (currentEntry) {
    handleClear();
  }

  addFile(file);
}

function addFile(file) {
  const entry = {
    id: crypto.randomUUID(),
    file,
    status: 'processing',
    progress: 0,
    outputBlob: null,
    outputName: null,
    videoDuration: null,
  };

  currentEntry = entry;
  renderFileItem(entry);
  updateActions();
  processFile(entry);
}

async function processFile(entry) {
  const t0 = performance.now();
  try {
    entry.outputName = entry.file.name.replace(/\.[^.]+$/, '') + '.mp4';
    entry.outputBlob = await remuxMovToMp4(entry.file, pct => {
      entry.progress = pct;
      updateFileItem(entry);
    });
    entry.durationMs = Math.round(performance.now() - t0);
    entry.status = 'done';
    entry.progress = 100;

    // Probe video duration using a <video> element
    probeDuration(entry);
  } catch (err) {
    entry.status = 'error';
    entry.errorMsg = err.message;
    console.error('Remux error:', err);
  }
  updateFileItem(entry);
  updateActions();
}

/**
 * Use a temporary <video> element to read the duration from loadedmetadata.
 * Updates the file item meta once the duration is known.
 */
function probeDuration(entry) {
  if (!entry.outputBlob) return;
  const video = document.createElement('video');
  video.preload = 'metadata';
  const url = URL.createObjectURL(entry.outputBlob);
  video.src = url;
  video.addEventListener('loadedmetadata', () => {
    const secs = video.duration;
    if (secs && isFinite(secs)) {
      entry.videoDuration = secs;
      updateFileItem(entry);
    }
    URL.revokeObjectURL(url);
  });
  video.addEventListener('error', () => {
    URL.revokeObjectURL(url);
  });
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
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
      <span class="file-item__status">Remuxing...</span>
    </div>
  `;
  fileList.appendChild(div);
}

function updateFileItem(entry) {
  const div = document.getElementById(`file-${entry.id}`);
  if (!div) return;

  const bar = div.querySelector('.file-item__progress-bar');
  const actions = div.querySelector('.file-item__actions');
  const meta = div.querySelector('.file-item__meta');

  div.className = 'file-item' + (entry.status === 'done' ? ' done' : '');
  bar.style.width = entry.progress + '%';
  bar.className = 'file-item__progress-bar';

  if (entry.status === 'processing') {
    actions.innerHTML = '<span class="file-item__status">Remuxing...</span>';
  } else if (entry.status === 'done') {
    bar.classList.add('done');
    let metaParts = [];
    if (entry.outputBlob) {
      metaParts.push(formatSize(entry.file.size) + ' \u2192 ' + formatSize(entry.outputBlob.size));
    } else {
      metaParts.push(formatSize(entry.file.size));
    }
    if (entry.videoDuration !== null) {
      metaParts.push('\u00b7 ' + formatDuration(entry.videoDuration));
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
      handleClear();
    });
  } else if (entry.status === 'error') {
    bar.classList.add('error');
    bar.style.width = '100%';
    actions.innerHTML = `
      <span class="file-item__status error">${esc(entry.errorMsg || 'Error')}</span>
      <button class="btn btn--danger btn-remove">Remove</button>
    `;
    actions.querySelector('.btn-remove').addEventListener('click', () => {
      handleClear();
    });
  }
}

function handleClear() {
  currentEntry = null;
  fileList.innerHTML = '';
  updateActions();
}

function updateActions() {
  if (clearAllBtn) {
    clearAllBtn.style.display = currentEntry ? '' : 'none';
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
