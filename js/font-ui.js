/**
 * ConvertFast - Font converter UI controller.
 * Handles drag-drop, file list, batch conversion, download.
 * Reads target format from #converter-config data-font-target attribute.
 */

import { convertFont } from './font-engine.js';
import { formatSize, downloadBlob, downloadAsZip } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const MAX_BATCH = 50;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per font file

let targetFormat = 'ttf';
let dropZone, fileInput, fileList, actionBtn, clearBtn;
const files = [];
const results = []; // { name, blob }

export function init() {
  const configEl = document.getElementById('converter-config');
  if (!configEl) return;
  targetFormat = configEl.dataset.fontTarget || 'ttf';

  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  actionBtn = document.getElementById('action-btn');
  clearBtn = document.getElementById('clear-all');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  if (actionBtn) actionBtn.addEventListener('click', runConversion);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

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
  loadPendingFiles().then(pending => {
    if (pending && pending.length > 0) addFiles(pending);
  }).catch(() => {});
}

function addFiles(fileList_) {
  for (const f of fileList_) {
    if (files.length >= MAX_BATCH) break;
    if (f.size > MAX_FILE_SIZE) continue;
    files.push(f);
    renderFileEntry(f);
  }
  updateControls();
}

function renderFileEntry(file) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.innerHTML = `
    <div class="file-item__info">
      <div class="file-item__name">${esc(file.name)}</div>
      <div class="file-item__meta">${formatSize(file.size)}</div>
    </div>
    <div class="file-item__actions">
      <button class="btn btn--danger btn-remove">Remove</button>
    </div>
  `;
  div.querySelector('.btn-remove').addEventListener('click', () => {
    const idx = files.indexOf(file);
    if (idx !== -1) files.splice(idx, 1);
    div.remove();
    updateControls();
  });
  fileList.appendChild(div);
}

function updateControls() {
  if (actionBtn) {
    actionBtn.disabled = files.length < 1;
    actionBtn.style.display = files.length > 0 ? '' : 'none';
  }
  if (clearBtn) clearBtn.style.display = files.length > 0 ? '' : 'none';
}

function clearAll() {
  files.length = 0;
  results.length = 0;
  fileList.innerHTML = '';
  removeResults();
  updateControls();
}

function removeResults() {
  const el = document.getElementById('font-results');
  if (el) el.remove();
}

async function runConversion() {
  actionBtn.disabled = true;
  const origText = actionBtn.textContent;
  removeResults();
  results.length = 0;
  const t0 = performance.now();

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      actionBtn.textContent = `Converting ${i + 1}/${files.length}...`;
      const blob = await convertFont(f, targetFormat, pct => {
        actionBtn.textContent = `Converting ${i + 1}/${files.length}... ${pct}%`;
      });
      const outName = f.name.replace(/\.[^.]+$/, '') + '.' + targetFormat;
      results.push({ name: outName, blob });
    }

    const dur = Math.round(performance.now() - t0);
    showResults(dur);
  } catch (err) {
    showError(err.message);
  }

  actionBtn.textContent = origText;
  actionBtn.disabled = false;
}

function showResults(durationMs) {
  const div = makeResultsDiv();
  const dur = durationMs < 1000 ? durationMs + 'ms' : (durationMs / 1000).toFixed(1) + 's';
  const totalSize = results.reduce((s, r) => s + r.blob.size, 0);

  let html = '';
  if (results.length > 1) {
    html += `<div class="batch-summary">${results.length} files \u00b7 ${formatSize(totalSize)} \u00b7 ${dur}</div>`;
  }

  results.forEach((r, i) => {
    html += `
      <div class="file-item done">
        <div class="file-item__info">
          <div class="file-item__name">${esc(r.name)}</div>
          <div class="file-item__meta">${formatSize(r.blob.size)}${results.length === 1 ? ' \u00b7 ' + dur : ''}</div>
        </div>
        <div class="file-item__actions">
          <button class="btn btn--success dl-btn" data-idx="${i}" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
        </div>
      </div>`;
  });

  if (results.length >= 2) {
    html += `<button class="btn btn--primary" id="dl-all-zip" style="margin-top:0.75rem">Download All as ZIP</button>`;
  }

  div.innerHTML = html;

  div.querySelectorAll('.dl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = results[parseInt(btn.dataset.idx)];
      downloadBlob(r.blob, r.name);
    });
  });

  const zipBtn = div.querySelector('#dl-all-zip');
  if (zipBtn) {
    zipBtn.addEventListener('click', async () => {
      zipBtn.disabled = true;
      zipBtn.textContent = 'Zipping...';
      const entries = await Promise.all(results.map(async r => ({
        name: r.name,
        data: new Uint8Array(await r.blob.arrayBuffer()),
      })));
      await downloadAsZip(entries, 'convertfast-fonts.zip');
      zipBtn.disabled = false;
      zipBtn.textContent = 'Download All as ZIP';
    });
  }
}

function showError(msg) {
  const div = makeResultsDiv();
  div.innerHTML = `<div class="notice">${esc(msg)}</div>`;
}

function makeResultsDiv() {
  removeResults();
  const div = document.createElement('div');
  div.id = 'font-results';
  div.style.marginBottom = '2rem';
  const batchActions = document.querySelector('.batch-actions');
  if (batchActions) batchActions.parentElement.insertBefore(div, batchActions);
  else fileList.parentElement.appendChild(div);
  return div;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
