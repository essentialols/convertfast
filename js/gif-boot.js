import { videoToGif, DEFAULT_MAX_WIDTH, DEFAULT_FPS, DEFAULT_MAX_DURATION } from './gif-engine.js';
import { formatSize, downloadBlob, snapTo } from './converter.js';
import { applyPageUX } from './ux-page.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const controls = document.getElementById('gif-controls');
const preview = document.getElementById('gif-preview');
const videoEl = document.getElementById('gif-video');
const widthSlider = document.getElementById('width-slider');
const widthValue = document.getElementById('width-value');
const fpsSlider = document.getElementById('fps-slider');
const fpsValue = document.getElementById('fps-value');
const startInput = document.getElementById('start-time');
const endInput = document.getElementById('end-time');
const convertBtn = document.getElementById('convert-btn');
const progressDiv = document.getElementById('gif-progress');
const resultDiv = document.getElementById('gif-result');

let currentFile = null;
applyPageUX();

// Init sliders
widthSlider.value = DEFAULT_MAX_WIDTH;
widthValue.textContent = DEFAULT_MAX_WIDTH + 'px';
fpsSlider.value = DEFAULT_FPS;
fpsValue.textContent = DEFAULT_FPS;

// Drop zone
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); loadVideo(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', () => { loadVideo(fileInput.files[0]); fileInput.value = ''; });

const widthSnaps = [160, 240, 320, 480, 640, 800];
const fpsSnaps = [4, 8, 10, 12, 15, 20];
widthSlider.addEventListener('input', () => {
  const v = snapTo(parseInt(widthSlider.value, 10), widthSnaps, 640);
  widthSlider.value = v;
  widthValue.textContent = v + 'px';
});
fpsSlider.addEventListener('input', () => {
  const v = snapTo(parseInt(fpsSlider.value, 10), fpsSnaps, 16);
  fpsSlider.value = v;
  fpsValue.textContent = v;
});

convertBtn.addEventListener('click', convert);

function loadVideo(file) {
  if (!file) return;
  currentFile = file;
  const url = URL.createObjectURL(file);
  videoEl.src = url;
  videoEl.onloadedmetadata = () => {
    const dur = Math.min(videoEl.duration, DEFAULT_MAX_DURATION);
    startInput.value = '0';
    startInput.max = dur;
    endInput.value = dur.toFixed(1);
    endInput.max = dur;
    controls.style.display = '';
    preview.style.display = '';
    resultDiv.innerHTML = '';
    // Auto-scale width slider max to video width
    widthSlider.max = Math.min(videoEl.videoWidth, 800);
    if (parseInt(widthSlider.value) > videoEl.videoWidth) {
      widthSlider.value = Math.min(videoEl.videoWidth, DEFAULT_MAX_WIDTH);
      widthValue.textContent = widthSlider.value + 'px';
    }
  };
}

async function convert() {
  if (!currentFile) return;
  convertBtn.disabled = true;
  convertBtn.textContent = 'Encoding...';
  progressDiv.style.display = '';
  progressDiv.textContent = 'Starting...';
  resultDiv.innerHTML = '';

  const t0 = performance.now();
  try {
    const blob = await videoToGif(currentFile, {
      maxWidth: parseInt(widthSlider.value),
      fps: parseInt(fpsSlider.value),
      start: parseFloat(startInput.value) || 0,
      end: parseFloat(endInput.value) || undefined,
      onProgress: (pct, msg) => {
        progressDiv.textContent = msg;
        progressDiv.style.background = `linear-gradient(90deg, #dbeafe ${pct}%, var(--bg-secondary) ${pct}%)`;
      },
    });

    const dur = Math.round(performance.now() - t0);
    const durStr = dur < 1000 ? dur + 'ms' : (dur / 1000).toFixed(1) + 's';
    progressDiv.style.display = 'none';

    // Show result with preview
    const gifUrl = URL.createObjectURL(blob);
    resultDiv.innerHTML = `
      <div class="gif-result-preview">
        <img src="${gifUrl}" alt="Generated GIF" style="max-width:100%;border-radius:8px;border:1px solid var(--border)">
      </div>
      <div class="file-item done" style="margin-top:1rem">
        <div class="file-item__info">
          <div class="file-item__name">output.gif</div>
          <div class="file-item__meta">${formatSize(blob.size)} · ${durStr}</div>
        </div>
        <div class="file-item__actions">
          <button class="btn btn--success" style="padding:0.4rem 0.8rem;font-size:0.8rem" id="dl-gif">Download</button>
        </div>
      </div>
    `;
    resultDiv.querySelector('#dl-gif').addEventListener('click', () => {
      const name = currentFile.name.replace(/\.[^.]+$/, '') + '.gif';
      downloadBlob(blob, name);
    });
  } catch (err) {
    progressDiv.style.display = 'none';
    resultDiv.innerHTML = `<div class="notice">${err.message}</div>`;
  }

  convertBtn.disabled = false;
  convertBtn.textContent = 'Convert to GIF';
}

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

// Check for files from smart drop
import { loadPendingFiles } from './smart-drop.js';
loadPendingFiles().then(files => {
  if (files && files.length > 0) loadVideo(files[0]);
}).catch(() => {});
