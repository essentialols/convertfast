/**
 * IrisFiles - Archive UI controller
 * Two modes: "extract" (unzip) and "create" (zip).
 * Reads mode from #converter-config data-archive-mode attribute.
 */

import { extractZip, createZip } from './archive-engine.js';
import { formatSize, downloadBlob } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

let mode = '';  // 'extract' or 'create'
let dropZone, fileInput, fileList, actionBtn, clearBtn;
const files = [];

export function init() {
  const configEl = document.getElementById('converter-config');
  if (!configEl) return;
  mode = configEl.dataset.archiveMode || '';

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

  if (actionBtn) actionBtn.addEventListener('click', runAction);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  // Auto-load files passed from landing page smart drop
  loadPendingFiles().then(pending => {
    if (pending && pending.length > 0) addFiles(pending);
  }).catch(() => {});

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
}

function addFiles(fileList_) {
  const maxFiles = mode === 'extract' ? 1 : 50;
  if (mode === 'extract' && files.length > 0) {
    // Replace the existing ZIP in extract mode
    files.length = 0;
    fileList.innerHTML = '';
    removeResults();
  }
  for (const f of fileList_) {
    if (files.length >= maxFiles) break;
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
    removeResults();
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
  fileList.innerHTML = '';
  removeResults();
  updateControls();
}

function removeResults() {
  const existing = document.getElementById('archive-results');
  if (existing) existing.remove();
}

async function runAction() {
  actionBtn.disabled = true;
  const origText = actionBtn.textContent;
  actionBtn.textContent = 'Processing...';
  removeResults();
  const t0 = performance.now();

  try {
    if (mode === 'extract') {
      const entries = await extractZip(files[0], pct => {
        actionBtn.textContent = `Extracting... ${pct}%`;
      });
      const dur = Math.round(performance.now() - t0);
      showExtractResults(entries, dur);

    } else if (mode === 'create') {
      const inputs = files.map(f => ({ name: f.name, blob: f }));
      const zipBlob = await createZip(inputs, pct => {
        actionBtn.textContent = `Zipping... ${pct}%`;
      });
      const dur = Math.round(performance.now() - t0);
      showCreateResult(zipBlob, dur);
    }
  } catch (err) {
    showError(err.message);
  }

  actionBtn.textContent = origText;
  actionBtn.disabled = false;
}

function showExtractResults(entries, durationMs) {
  const div = makeResultsDiv();
  const dur = durationMs < 1000 ? durationMs + 'ms' : (durationMs / 1000).toFixed(1) + 's';
  const totalSize = entries.reduce((s, e) => s + e.size, 0);

  let html = `<div class="batch-summary">${entries.length} files extracted · ${formatSize(totalSize)} · ${dur}</div>`;

  entries.forEach((entry, i) => {
    html += `
      <div class="file-item done">
        <div class="file-item__info">
          <div class="file-item__name">${esc(entry.name)}</div>
          <div class="file-item__meta">${formatSize(entry.size)}</div>
        </div>
        <div class="file-item__actions">
          <button class="btn btn--success dl-btn" data-idx="${i}" style="padding:0.4rem 0.8rem;font-size:0.8rem">Download</button>
        </div>
      </div>`;
  });

  if (entries.length >= 2) {
    html += `<button class="btn btn--primary" id="dl-all" style="margin-top:0.75rem">Download All</button>`;
  }

  div.innerHTML = html;

  div.querySelectorAll('.dl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = entries[parseInt(btn.dataset.idx)];
      const filename = entry.name.includes('/') ? entry.name.split('/').pop() : entry.name;
      downloadBlob(entry.blob, filename);
    });
  });

  const dlAllBtn = div.querySelector('#dl-all');
  if (dlAllBtn) {
    dlAllBtn.addEventListener('click', () => {
      for (const entry of entries) {
        const filename = entry.name.includes('/') ? entry.name.split('/').pop() : entry.name;
        downloadBlob(entry.blob, filename);
      }
    });
  }
}

function showCreateResult(blob, durationMs) {
  const div = makeResultsDiv();
  const dur = durationMs < 1000 ? durationMs + 'ms' : (durationMs / 1000).toFixed(1) + 's';
  div.innerHTML = `
    <div class="file-item done">
      <div class="file-item__info">
        <div class="file-item__name">archive.zip</div>
        <div class="file-item__meta">${formatSize(blob.size)} · ${dur}</div>
      </div>
      <div class="file-item__actions">
        <button class="btn btn--success" style="padding:0.4rem 0.8rem;font-size:0.8rem" id="dl-zip">Download</button>
      </div>
    </div>
  `;
  div.querySelector('#dl-zip').addEventListener('click', () => downloadBlob(blob, 'archive.zip'));
}

function showError(msg) {
  const div = makeResultsDiv();
  div.innerHTML = `<div class="notice">${esc(msg)}</div>`;
}

function makeResultsDiv() {
  removeResults();
  const div = document.createElement('div');
  div.id = 'archive-results';
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
