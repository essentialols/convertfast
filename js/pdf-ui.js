/**
 * PDF-specific UI controller.
 * Handles merge, split, image-to-pdf, pdf-to-image pages.
 * Reuses shared CSS classes from style.css.
 */

import { imagesToPdf, pdfToImages, mergePdfs, splitPdf } from './pdf-engine.js';
import { formatSize, downloadBlob, downloadAsZip, needsHeicDecoder, convertHeic, snapTo } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

let mode = '';  // 'img-to-pdf', 'pdf-to-img', 'merge', 'split'
let targetMime = '';
let dropZone, fileInput, fileList, actionBtn, clearBtn, qualitySlider, qualityValue;
const files = [];

export function init() {
  const configEl = document.getElementById('converter-config');
  if (!configEl) return;
  mode = configEl.dataset.pdfMode || '';
  targetMime = configEl.dataset.targetMime || '';

  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  fileList = document.getElementById('file-list');
  actionBtn = document.getElementById('action-btn');
  clearBtn = document.getElementById('clear-all');
  qualitySlider = document.getElementById('quality-slider');
  qualityValue = document.getElementById('quality-value');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  const qualitySnaps = [10, 25, 50, 75, 80, 90, 100];
  const qualityNote = document.getElementById('quality-note');
  if (qualitySlider && qualityValue) {
    const saved = parseInt(localStorage.getItem('cf-quality'), 10);
    if (saved >= 10 && saved <= 100) {
      qualitySlider.value = saved;
      qualityValue.textContent = saved + '%';
      if (qualityNote) qualityNote.textContent = saved >= 100
        ? 'Full quality. Converting between formats may still affect encoding.' : '';
    }
    qualitySlider.addEventListener('input', () => {
      const v = snapTo(parseInt(qualitySlider.value, 10), qualitySnaps, 90);
      qualitySlider.value = v;
      qualityValue.textContent = v + '%';
      localStorage.setItem('cf-quality', v);
      if (qualityNote) qualityNote.textContent = v >= 100
        ? 'Full quality. Converting between formats may still affect encoding.' : '';
    });
  }

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
  const maxFiles = mode === 'split' ? 1 : 50;
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
  const canReorder = mode === 'merge';
  if (canReorder) div.draggable = true;
  div.innerHTML = `
    ${canReorder ? '<span class="drag-handle" title="Drag to reorder">&#x2630;</span>' : ''}
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
  if (canReorder) setupDragReorder(div);
  fileList.appendChild(div);
}

let dragSrc = null;
function setupDragReorder(el) {
  el.addEventListener('dragstart', e => {
    dragSrc = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    dragSrc = null;
    fileList.querySelectorAll('.file-item.drag-over').forEach(x => x.classList.remove('drag-over'));
  });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrc && dragSrc !== el) el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    if (!dragSrc || dragSrc === el) return;
    // Swap DOM positions
    const items = [...fileList.children];
    const fromIdx = items.indexOf(dragSrc);
    const toIdx = items.indexOf(el);
    if (fromIdx < toIdx) el.after(dragSrc);
    else el.before(dragSrc);
    // Sync the files array to match new DOM order
    const [moved] = files.splice(fromIdx, 1);
    files.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
  });
}

function updateControls() {
  if (actionBtn) {
    const minFiles = (mode === 'merge') ? 2 : 1;
    actionBtn.disabled = files.length < minFiles;
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
  const existing = document.getElementById('pdf-results');
  if (existing) existing.remove();
}

function getQuality() {
  return qualitySlider ? parseInt(qualitySlider.value) / 100 : 0.92;
}

async function runAction() {
  actionBtn.disabled = true;
  const origText = actionBtn.textContent;
  actionBtn.textContent = 'Processing...';
  removeResults();
  const t0 = performance.now();

  try {
    if (mode === 'img-to-pdf') {
      const inputs = [];
      for (const f of files) {
        if (needsHeicDecoder(f.type)) {
          actionBtn.textContent = 'Decoding HEIC...';
          const decoded = await convertHeic(f, 'image/jpeg', 0.92, () => {});
          inputs.push({ blob: decoded, mime: 'image/jpeg' });
        } else {
          inputs.push({ blob: f, mime: f.type || 'image/jpeg' });
        }
      }
      const blob = await imagesToPdf(inputs, pct => { actionBtn.textContent = `Converting... ${pct}%`; });
      const dur = Math.round(performance.now() - t0);
      showSingleResult(blob, 'converted.pdf', dur);

    } else if (mode === 'pdf-to-img') {
      const quality = getQuality();
      const allResults = [];
      for (const f of files) {
        const pages = await pdfToImages(f, targetMime, quality, pct => {
          actionBtn.textContent = `Rendering... ${pct}%`;
        });
        allResults.push(...pages);
      }
      const dur = Math.round(performance.now() - t0);
      showMultiResult(allResults, dur);

    } else if (mode === 'merge') {
      const blob = await mergePdfs(files, pct => { actionBtn.textContent = `Merging... ${pct}%`; });
      const dur = Math.round(performance.now() - t0);
      showSingleResult(blob, 'merged.pdf', dur);

    } else if (mode === 'split') {
      const pages = await splitPdf(files[0], pct => { actionBtn.textContent = `Splitting... ${pct}%`; });
      const dur = Math.round(performance.now() - t0);
      showMultiResult(pages, dur);
    }
  } catch (err) {
    showError(err.message);
  }

  actionBtn.textContent = origText;
  actionBtn.disabled = false;
}

function showSingleResult(blob, name, durationMs) {
  const div = makeResultsDiv();
  const dur = durationMs < 1000 ? durationMs + 'ms' : (durationMs / 1000).toFixed(1) + 's';
  div.innerHTML = `
    <div class="file-item done">
      <div class="file-item__info">
        <div class="file-item__name">${esc(name)}</div>
        <div class="file-item__meta">${formatSize(blob.size)} · ${dur}</div>
      </div>
      <div class="file-item__actions">
        <button class="btn btn--success" style="padding:0.4rem 0.8rem;font-size:0.8rem" id="dl-single">Download</button>
      </div>
    </div>
  `;
  div.querySelector('#dl-single').addEventListener('click', () => downloadBlob(blob, name));
}

function showMultiResult(results, durationMs) {
  const div = makeResultsDiv();
  const dur = durationMs < 1000 ? durationMs + 'ms' : (durationMs / 1000).toFixed(1) + 's';
  const totalSize = results.reduce((s, r) => s + r.blob.size, 0);

  let html = `<div class="batch-summary">${results.length} files · ${formatSize(totalSize)} · ${dur}</div>`;
  results.forEach((r, i) => {
    html += `
      <div class="file-item done">
        <div class="file-item__info">
          <div class="file-item__name">${esc(r.name)}</div>
          <div class="file-item__meta">${formatSize(r.blob.size)}</div>
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
      await downloadAsZip(entries, 'irisfiles-batch.zip');
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
  div.id = 'pdf-results';
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
