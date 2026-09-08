/**
 * IrisFiles - Image Metadata Viewer/Editor UI controller
 * Single-file tool: drop image, view/edit metadata, strip or save.
 */

import { readMetadata, isJpeg, editExifFields, stripAllMetadata, stripGpsOnly } from './exif-engine.js';
import { formatSize, downloadBlob, validateFile } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';
import { renderMetadataTable, collectChanges, GROUP_LABELS, EDITABLE_FIELDS, READONLY_ALWAYS } from './meta-panel.js';

let dropZone, fileInput, fileList, metadataPanel;
let saveBtn, stripGpsBtn, stripAllBtn, clearAllBtn;
let currentFile = null;
let currentMetadata = null;
let isJpegFile = false;
let processing = false;

export function init() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  metadataPanel = document.getElementById('metadata-panel');
  saveBtn = document.getElementById('save-changes');
  stripGpsBtn = document.getElementById('strip-gps');
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

  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  if (stripGpsBtn) stripGpsBtn.addEventListener('click', handleStripGps);
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
        const a = el.querySelector('.faq-answer'); if (a) a.style.maxHeight = null;
      });
      if (!isOpen && answer) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
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

  isJpegFile = await isJpeg(file);
  dropZone.classList.add('compact');
  showFileItem(file, null);
  setStatus('Reading metadata...');

  try {
    currentMetadata = await readMetadata(file);
    renderMetadata();
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
  div.id = 'exif-file';
  const typePart = isJpegFile ? 'JPEG' : (file.type || 'image');
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(file.name)}</div>
      <div class="file-item__meta">${formatSize(file.size)} · ${esc(typePart)}</div>
    </div>
    <div class="file-item__actions">
      <span class="file-item__status">${error ? '<span class="error">' + esc(error) + '</span>' : 'Reading...'}</span>
    </div>
  `;
  fileList.appendChild(div);
}

function setStatus(msg) {
  const status = document.querySelector('#exif-file .file-item__status');
  if (status) status.textContent = msg;
}

function showActions() {
  if (saveBtn) saveBtn.style.display = isJpegFile ? '' : 'none';
  if (stripGpsBtn) stripGpsBtn.style.display = isJpegFile ? '' : 'none';
  if (stripAllBtn) stripAllBtn.style.display = '';
  if (clearAllBtn) clearAllBtn.style.display = '';
}

function resetState() {
  currentFile = null;
  currentMetadata = null;
  isJpegFile = false;
  processing = false;
  fileList.innerHTML = '';
  if (metadataPanel) metadataPanel.innerHTML = '';
  if (saveBtn) saveBtn.style.display = 'none';
  if (stripGpsBtn) stripGpsBtn.style.display = 'none';
  if (stripAllBtn) stripAllBtn.style.display = 'none';
  if (clearAllBtn) clearAllBtn.style.display = 'none';
  if (dropZone) dropZone.classList.remove('compact');
}

function renderMetadata() {
  if (!metadataPanel || !currentMetadata) return;
  renderMetadataTable(metadataPanel, currentMetadata, isJpegFile, {
    onStripGps: handleStripGps,
  });

  // Format notice
  const notice = document.createElement('div');
  notice.className = 'meta-notice';
  if (isJpegFile) {
    notice.textContent = 'JPEG detected: lossless metadata editing. Pixel data is never re-encoded.';
  } else {
    notice.textContent = 'Non-JPEG format: metadata is read-only. Strip All will re-encode via Canvas.';
  }
  metadataPanel.appendChild(notice);
}

async function handleSave() {
  if (!currentFile || !isJpegFile || processing) return;
  processing = true;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const changes = collectChanges(metadataPanel);

  if (Object.keys(changes).length === 0) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
    processing = false;
    return;
  }

  try {
    const blob = await editExifFields(currentFile, changes);
    const base = currentFile.name.replace(/\.[^.]+$/, '');
    const outName = base + '-metadata.jpg';
    showResult(blob, outName);
  } catch (err) {
    setStatus('Error: ' + err.message);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';
  processing = false;
}

async function handleStripGps() {
  if (!currentFile || !isJpegFile || processing) return;
  processing = true;
  if (stripGpsBtn) { stripGpsBtn.disabled = true; stripGpsBtn.textContent = 'Stripping GPS...'; }

  try {
    const blob = await stripGpsOnly(currentFile);
    const base = currentFile.name.replace(/\.[^.]+$/, '');
    const outName = base + '-clean.jpg';
    showResult(blob, outName);
  } catch (err) {
    setStatus('Error: ' + err.message);
  }

  if (stripGpsBtn) { stripGpsBtn.disabled = false; stripGpsBtn.textContent = 'Strip GPS Only'; }
  processing = false;
}

async function handleStripAll() {
  if (!currentFile || processing) return;
  processing = true;
  if (stripAllBtn) { stripAllBtn.disabled = true; stripAllBtn.textContent = 'Stripping...'; }

  try {
    const blob = await stripAllMetadata(currentFile);
    const base = currentFile.name.replace(/\.[^.]+$/, '');
    const ext = isJpegFile ? 'jpg' : (currentFile.name.split('.').pop() || 'jpg');
    const outName = base + '-clean.' + ext;
    showResult(blob, outName);
  } catch (err) {
    setStatus('Error: ' + err.message);
  }

  if (stripAllBtn) { stripAllBtn.disabled = false; stripAllBtn.textContent = 'Strip All Metadata'; }
  processing = false;
}

function showResult(blob, outName) {
  const div = document.querySelector('#exif-file');
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
