/**
 * IrisFiles - Image Metadata Viewer/Editor UI controller
 * Single-file tool: drop image, view/edit metadata, strip or save.
 */

import { readMetadata, isJpeg, editExifFields, stripAllMetadata, stripGpsOnly } from './exif-engine.js';
import { formatSize, downloadBlob, validateFile } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

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

  isJpegFile = await isJpeg(file);
  showFileItem(file, null);
  setStatus('Reading metadata...');

  try {
    currentMetadata = await readMetadata(file);
    renderMetadataTable();
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
}

const GROUP_LABELS = {
  basic: 'Basic Info',
  camera: 'Camera',
  settings: 'Camera Settings',
  dates: 'Dates',
  gps: 'GPS Location',
  description: 'Description',
};

// Fields that are editable on JPEG (maps to piexifjs field map keys)
const EDITABLE_FIELDS = new Set([
  'Make', 'Model', 'Software', 'Copyright', 'Artist', 'Description',
  'User Comment', 'Orientation', 'Date Modified', 'Date Taken', 'Date Digitized', 'ISO',
]);

// Fields that should never be editable (computed/read-only)
const READONLY_ALWAYS = new Set(['Width', 'Height', 'File Size', 'Format', 'Color Space',
  'F-Number', 'Exposure Time', 'Focal Length', 'Flash', 'White Balance',
  'Lens Make', 'Lens Model', 'Latitude', 'Longitude', 'Altitude']);

function renderMetadataTable() {
  if (!metadataPanel || !currentMetadata) return;
  metadataPanel.innerHTML = '';

  if (currentMetadata._empty) {
    metadataPanel.innerHTML = '<div class="meta-notice">No metadata found in this image.</div>';
    return;
  }

  for (const [groupKey, label] of Object.entries(GROUP_LABELS)) {
    const groupData = currentMetadata[groupKey];
    if (!groupData || typeof groupData !== 'object') continue;

    const entries = Object.entries(groupData).filter(([, v]) => v !== null && v !== undefined);
    // For editable JPEG, also show empty editable fields
    const emptyEditableEntries = [];
    if (isJpegFile) {
      for (const [field] of Object.entries(groupData)) {
        if (groupData[field] === null || groupData[field] === undefined) {
          if (EDITABLE_FIELDS.has(field)) {
            emptyEditableEntries.push([field, null]);
          }
        }
      }
    }

    const allEntries = [...entries, ...emptyEditableEntries];
    if (allEntries.length === 0) continue;

    const group = document.createElement('div');
    group.className = 'meta-group';

    const title = document.createElement('div');
    title.className = 'meta-group__title';
    title.textContent = label;
    group.appendChild(title);

    const table = document.createElement('div');
    table.className = 'meta-table';

    for (const [field, value] of allEntries) {
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
      } else if (groupKey === 'gps' && (field === 'Latitude' || field === 'Longitude')) {
        const span = document.createElement('span');
        span.textContent = value !== null ? String(value) : '(not set)';
        valueEl.appendChild(span);
        if (value !== null && isJpegFile) {
          const removeBtn = document.createElement('button');
          removeBtn.className = 'meta-gps-remove';
          removeBtn.textContent = 'Remove GPS';
          removeBtn.addEventListener('click', handleStripGps);
          valueEl.appendChild(removeBtn);
        }
      } else if (isJpegFile && EDITABLE_FIELDS.has(field) && !READONLY_ALWAYS.has(field)) {
        const input = document.createElement('input');
        input.className = 'meta-input';
        input.type = 'text';
        input.value = value !== null ? String(value) : '';
        input.placeholder = '(not set)';
        input.dataset.field = field;
        input.dataset.original = value !== null ? String(value) : '';
        input.addEventListener('input', () => {
          if (input.value !== input.dataset.original) {
            input.classList.add('changed');
          } else {
            input.classList.remove('changed');
          }
        });
        valueEl.appendChild(input);
      } else {
        valueEl.textContent = value !== null ? String(value) : '(not set)';
      }

      row.appendChild(valueEl);
      table.appendChild(row);
    }

    group.appendChild(table);
    metadataPanel.appendChild(group);
  }

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

  const changes = {};
  metadataPanel.querySelectorAll('.meta-input.changed').forEach(input => {
    changes[input.dataset.field] = input.value;
  });

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
