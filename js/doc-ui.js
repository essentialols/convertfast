/**
 * ConvertFast - Document/ebook UI controller
 * Handles EPUB, RTF, DOCX conversion pages.
 * Single-file conversion (not batch).
 */

import {
  epubToText, epubToPdf,
  rtfToText, rtfToPdf,
  docxToText, docxToPdf,
} from './doc-engine.js';
import { formatSize, downloadBlob } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const MODES = {
  'epub-to-txt':  { fn: epubToText, accept: '.epub', label: 'EPUB', outExt: 'txt', outMime: 'text/plain' },
  'epub-to-pdf':  { fn: epubToPdf,  accept: '.epub', label: 'EPUB', outExt: 'pdf', outMime: 'application/pdf' },
  'rtf-to-txt':   { fn: rtfToText,  accept: '.rtf',  label: 'RTF',  outExt: 'txt', outMime: 'text/plain' },
  'rtf-to-pdf':   { fn: rtfToPdf,   accept: '.rtf',  label: 'RTF',  outExt: 'pdf', outMime: 'application/pdf' },
  'docx-to-txt':  { fn: docxToText, accept: '.docx', label: 'DOCX', outExt: 'txt', outMime: 'text/plain' },
  'docx-to-pdf':  { fn: docxToPdf,  accept: '.docx', label: 'DOCX', outExt: 'pdf', outMime: 'application/pdf' },
};

let mode = null;
let currentFile = null;
let dropZone, fileInput, fileList, actionBtn, clearBtn;

export function init() {
  const configEl = document.getElementById('converter-config');
  if (!configEl) return;

  const modeKey = configEl.dataset.docMode || '';
  mode = MODES[modeKey];
  if (!mode) return;

  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  actionBtn = document.getElementById('action-btn');
  clearBtn = document.getElementById('clear-all');

  if (!dropZone || !fileInput) return;

  // Set accept attribute for file input
  if (fileInput && mode.accept) {
    fileInput.setAttribute('accept', mode.accept);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); setFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => { setFile(fileInput.files[0]); fileInput.value = ''; });

  if (actionBtn) actionBtn.addEventListener('click', runConversion);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  // Auto-load files passed from landing page smart drop
  loadPendingFiles().then(pending => {
    if (pending && pending.length > 0) setFile(pending[0]);
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

function setFile(file) {
  if (!file) return;
  currentFile = file;
  removeResults();
  fileList.innerHTML = '';

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
  div.querySelector('.btn-remove').addEventListener('click', clearAll);
  fileList.appendChild(div);
  updateControls();
}

function updateControls() {
  if (actionBtn) {
    actionBtn.disabled = !currentFile;
    actionBtn.style.display = currentFile ? '' : 'none';
  }
  if (clearBtn) clearBtn.style.display = currentFile ? '' : 'none';
}

function clearAll() {
  currentFile = null;
  fileList.innerHTML = '';
  removeResults();
  updateControls();
}

function removeResults() {
  const existing = document.getElementById('doc-results');
  if (existing) existing.remove();
}

async function runConversion() {
  if (!currentFile || !mode) return;

  actionBtn.disabled = true;
  const origText = actionBtn.textContent;
  actionBtn.textContent = 'Converting...';
  removeResults();

  const t0 = performance.now();

  try {
    const blob = await mode.fn(currentFile, pct => {
      actionBtn.textContent = `Converting... ${pct}%`;
    });

    const dur = Math.round(performance.now() - t0);
    const durStr = dur < 1000 ? dur + 'ms' : (dur / 1000).toFixed(1) + 's';
    const outName = currentFile.name.replace(/\.[^.]+$/, '') + '.' + mode.outExt;

    const div = makeResultsDiv();
    div.innerHTML = `
      <div class="file-item done">
        <div class="file-item__info">
          <div class="file-item__name">${esc(outName)}</div>
          <div class="file-item__meta">${formatSize(blob.size)} · ${durStr}</div>
        </div>
        <div class="file-item__actions">
          <button class="btn btn--success" style="padding:0.4rem 0.8rem;font-size:0.8rem" id="dl-doc">Download</button>
        </div>
      </div>
    `;
    div.querySelector('#dl-doc').addEventListener('click', () => downloadBlob(blob, outName));
  } catch (err) {
    const div = makeResultsDiv();
    div.innerHTML = `<div class="notice">${esc(err.message)}</div>`;
  }

  actionBtn.textContent = origText;
  actionBtn.disabled = false;
}

function makeResultsDiv() {
  removeResults();
  const div = document.createElement('div');
  div.id = 'doc-results';
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
