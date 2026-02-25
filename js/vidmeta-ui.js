/**
 * IrisFiles - Video Metadata Viewer UI controller
 * Single-file tool: drop video, view metadata, strip all metadata.
 */

import { readVideoMetadata, stripVideoMetadata } from './vidmeta-engine.js';
import { formatSize, downloadBlob, validateFile } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const GROUP_LABELS = {
  general: 'General',
  video: 'Video',
  audio: 'Audio',
  tags: 'Tags',
};

let dropZone, fileInput, fileList, metadataPanel;
let stripAllBtn, clearAllBtn;
let currentFile = null;
let processing = false;

export function init() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  metadataPanel = document.getElementById('metadata-panel');
  stripAllBtn = document.getElementById('strip-all');
  clearAllBtn = document.getElementById('clear-all');

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

  if (stripAllBtn) stripAllBtn.addEventListener('click', handleStripAll);
  if (clearAllBtn) clearAllBtn.addEventListener('click', resetState);

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

  // Auto-load files from smart drop
  loadPendingFiles().then(files => {
    if (files && files.length > 0) handleFile(files);
  }).catch(() => {});
}

async function handleFile(files) {
  if (processing) return;
  const file = Array.from(files)[0];
  if (!file) return;

  resetState();
  currentFile = file;

  try {
    validateFile(file);
  } catch (err) {
    showFileItem(file, err.message);
    return;
  }

  showFileItem(file, null);
  setStatus('Loading metadata library...');

  try {
    const metadata = await readVideoMetadata(file);
    renderMetadata(metadata);
    setStatus('Ready');
    showActions();
  } catch (err) {
    setStatus('Error: ' + err.message);
  }
}

function showFileItem(file, error) {
  fileList.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'file-item';
  div.id = 'vidmeta-file';
  const ext = (file.name.split('.').pop() || 'video').toUpperCase();
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(file.name)}</div>
      <div class="file-item__meta">${formatSize(file.size)} · ${esc(ext)}</div>
    </div>
    <div class="file-item__actions">
      <span class="file-item__status">${error ? '<span class="error">' + esc(error) + '</span>' : 'Reading...'}</span>
    </div>
  `;
  fileList.appendChild(div);
}

function setStatus(msg) {
  const status = document.querySelector('#vidmeta-file .file-item__status');
  if (status) status.textContent = msg;
}

function showActions() {
  if (stripAllBtn) stripAllBtn.style.display = '';
  if (clearAllBtn) clearAllBtn.style.display = '';
}

function resetState() {
  currentFile = null;
  processing = false;
  fileList.innerHTML = '';
  if (metadataPanel) metadataPanel.innerHTML = '';
  if (stripAllBtn) stripAllBtn.style.display = 'none';
  if (clearAllBtn) clearAllBtn.style.display = 'none';
}

function renderMetadata(metadata) {
  if (!metadataPanel) return;
  metadataPanel.innerHTML = '';

  if (metadata._empty) {
    metadataPanel.innerHTML = '<div class="meta-notice">No metadata found in this video.</div>';
    return;
  }

  for (const [groupKey, label] of Object.entries(GROUP_LABELS)) {
    const groupData = metadata[groupKey];
    if (!groupData || typeof groupData !== 'object') continue;

    const entries = Object.entries(groupData).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) continue;

    const group = document.createElement('div');
    group.className = 'meta-group';

    const title = document.createElement('div');
    title.className = 'meta-group__title';
    title.textContent = label;
    group.appendChild(title);

    const table = document.createElement('div');
    table.className = 'meta-table';

    for (const [field, value] of entries) {
      const row = document.createElement('div');
      row.className = 'meta-row';

      const labelEl = document.createElement('div');
      labelEl.className = 'meta-label';
      labelEl.textContent = field;
      row.appendChild(labelEl);

      const valueEl = document.createElement('div');
      valueEl.className = 'meta-value';
      if (field === 'File Size') {
        valueEl.textContent = formatSize(value);
      } else {
        valueEl.textContent = String(value);
      }
      row.appendChild(valueEl);

      table.appendChild(row);
    }

    group.appendChild(table);
    metadataPanel.appendChild(group);
  }

  const notice = document.createElement('div');
  notice.className = 'meta-notice';
  notice.textContent = 'All fields are read-only. Use "Strip All Metadata" to remove metadata without re-encoding the video.';
  metadataPanel.appendChild(notice);
}

async function handleStripAll() {
  if (!currentFile || processing) return;
  processing = true;
  if (stripAllBtn) { stripAllBtn.disabled = true; stripAllBtn.textContent = 'Loading FFmpeg...'; }

  try {
    const blob = await stripVideoMetadata(
      currentFile,
      msg => { if (stripAllBtn) stripAllBtn.textContent = msg; },
      () => {}
    );
    const base = currentFile.name.replace(/\.[^.]+$/, '');
    const ext = currentFile.name.split('.').pop() || 'mp4';
    showResult(blob, base + '-clean.' + ext);
  } catch (err) {
    setStatus('Error: ' + err.message);
  }

  if (stripAllBtn) { stripAllBtn.disabled = false; stripAllBtn.textContent = 'Strip All Metadata'; }
  processing = false;
}

function showResult(blob, outName) {
  const div = document.querySelector('#vidmeta-file');
  if (!div) return;

  const meta = div.querySelector('.file-item__meta');
  const actions = div.querySelector('.file-item__actions');
  div.classList.add('done');

  const sizeBefore = formatSize(currentFile.size);
  const sizeAfter = formatSize(blob.size);
  meta.textContent = sizeBefore + ' \u2192 ' + sizeAfter;

  actions.innerHTML = `
    <button class="btn btn--success btn-download" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
  `;
  actions.querySelector('.btn-download').addEventListener('click', () => {
    downloadBlob(blob, outName);
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
