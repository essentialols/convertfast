/**
 * IrisFiles - Images to animated GIF UI controller
 * Multi-file drop, frame ordering, delay/width controls, convert button.
 */

import { imagesToGif, DEFAULT_DELAY, DEFAULT_MAX_WIDTH } from './images-gif-engine.js';
import { formatSize, downloadBlob, validateFile, snapTo } from './converter.js';
import { loadPendingFiles } from './smart-drop.js';

const MAX_FILES = 50;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const frameList = document.getElementById('frame-list');
const controls = document.getElementById('gif-controls');
const delaySlider = document.getElementById('delay-slider');
const delayValue = document.getElementById('delay-value');
const widthSlider = document.getElementById('width-slider');
const widthValue = document.getElementById('width-value');
const convertBtn = document.getElementById('convert-btn');
const clearBtn = document.getElementById('clear-btn');
const progressDiv = document.getElementById('gif-progress');
const resultDiv = document.getElementById('gif-result');

const frames = []; // { id, file, thumbUrl }

// Drop zone
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

// Controls
const delaySnaps = [50, 100, 200, 500, 1000];
const widthSnaps = [100, 160, 240, 320, 480, 640, 800];
delaySlider.addEventListener('input', () => {
  const v = snapTo(parseInt(delaySlider.value, 10), delaySnaps, 980);
  delaySlider.value = v;
  delayValue.textContent = v + 'ms';
});
widthSlider.addEventListener('input', () => {
  const v = snapTo(parseInt(widthSlider.value, 10), widthSnaps, 700);
  widthSlider.value = v;
  widthValue.textContent = v + 'px';
});
convertBtn.addEventListener('click', convert);
clearBtn.addEventListener('click', clearAll);

function addFiles(fileList) {
  const remaining = MAX_FILES - frames.length;
  if (remaining <= 0) return;
  const toAdd = Array.from(fileList).slice(0, remaining);
  for (const file of toAdd) {
    if (!file.type || !file.type.startsWith('image/')) continue;
    try { validateFile(file); } catch (e) { continue; }
    const id = crypto.randomUUID();
    const thumbUrl = URL.createObjectURL(file);
    frames.push({ id, file, thumbUrl });
  }
  renderFrames();
  updateUI();
}

function renderFrames() {
  frameList.innerHTML = '';
  frames.forEach((frame, i) => {
    const div = document.createElement('div');
    div.className = 'frame-item';
    div.draggable = true;
    div.dataset.idx = i;
    div.innerHTML = `
      <span class="frame-item__num">${i + 1}</span>
      <div class="frame-item__thumb"><img src="${frame.thumbUrl}" alt=""></div>
      <div class="frame-item__info">
        <div class="frame-item__name">${esc(frame.file.name)}</div>
        <div class="frame-item__meta">${formatSize(frame.file.size)}</div>
      </div>
      <button class="frame-item__remove" title="Remove">&times;</button>
    `;
    div.querySelector('.frame-item__remove').addEventListener('click', () => {
      URL.revokeObjectURL(frame.thumbUrl);
      frames.splice(frames.indexOf(frame), 1);
      renderFrames();
      updateUI();
    });

    // Drag reorder
    div.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', i.toString());
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => div.classList.remove('dragging'));
    div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = i;
      if (from !== to) {
        const [moved] = frames.splice(from, 1);
        frames.splice(to, 0, moved);
        renderFrames();
      }
    });

    frameList.appendChild(div);
  });
}

function updateUI() {
  const hasFrames = frames.length >= 2;
  controls.style.display = frames.length > 0 ? '' : 'none';
  convertBtn.disabled = !hasFrames;
  clearBtn.style.display = frames.length > 0 ? '' : 'none';
  if (frames.length === 1) {
    convertBtn.textContent = 'Need at least 2 images';
  } else {
    convertBtn.textContent = `Create GIF (${frames.length} frames)`;
  }
}

function clearAll() {
  for (const f of frames) URL.revokeObjectURL(f.thumbUrl);
  frames.length = 0;
  frameList.innerHTML = '';
  resultDiv.innerHTML = '';
  progressDiv.style.display = 'none';
  updateUI();
}

async function convert() {
  if (frames.length < 2) return;
  convertBtn.disabled = true;
  progressDiv.style.display = '';
  progressDiv.textContent = 'Starting...';
  resultDiv.innerHTML = '';

  const t0 = performance.now();
  try {
    const blob = await imagesToGif(
      frames.map(f => f.file),
      {
        delay: parseInt(delaySlider.value),
        maxWidth: parseInt(widthSlider.value),
        onProgress: (pct, msg) => {
          progressDiv.textContent = msg;
          progressDiv.style.background = `linear-gradient(90deg, #dbeafe ${pct}%, var(--bg-secondary) ${pct}%)`;
        },
      }
    );

    const dur = Math.round(performance.now() - t0);
    const durStr = dur < 1000 ? dur + 'ms' : (dur / 1000).toFixed(1) + 's';
    progressDiv.style.display = 'none';

    const gifUrl = URL.createObjectURL(blob);
    resultDiv.innerHTML = `
      <div class="gif-result-preview">
        <img src="${gifUrl}" alt="Generated GIF" style="max-width:100%;border-radius:8px;border:1px solid var(--border)">
      </div>
      <div class="file-item done" style="margin-top:1rem">
        <div class="file-item__info">
          <div class="file-item__name">animation.gif</div>
          <div class="file-item__meta">${formatSize(blob.size)} · ${frames.length} frames · ${durStr}</div>
        </div>
        <div class="file-item__actions">
          <button class="btn btn--success" style="padding:0.4rem 0.8rem;font-size:0.8rem" id="dl-gif">Download</button>
        </div>
      </div>
    `;
    resultDiv.querySelector('#dl-gif').addEventListener('click', () => {
      downloadBlob(blob, 'animation.gif');
    });
  } catch (err) {
    progressDiv.style.display = 'none';
    resultDiv.innerHTML = `<div class="notice">${esc(err.message)}</div>`;
  }

  convertBtn.disabled = false;
  updateUI();
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

// Smart drop
loadPendingFiles().then(files => {
  if (files && files.length > 0) addFiles(files);
}).catch(() => {});
