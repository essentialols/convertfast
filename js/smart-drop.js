/**
 * IrisFiles - Smart Drop (landing page)
 * Detects file types via magic bytes, stores in IndexedDB, routes to the right converter.
 */

const SIGS = [
  { mime: 'image/heic', ext: 'heic', label: 'HEIC', offsets: [[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x63]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x78]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x63]],[4,[0x66,0x74,0x79,0x70,0x6d,0x69,0x66,0x31]],[4,[0x66,0x74,0x79,0x70,0x6d,0x73,0x66,0x31]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x66]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x78]]] },
  { mime: 'image/avif', ext: 'avif', label: 'AVIF', offsets: [[4,[0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66]],[4,[0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x73]]] },
  { mime: 'image/png',  ext: 'png',  label: 'PNG',  offsets: [[0,[0x89,0x50,0x4E,0x47]]] },
  { mime: 'image/jpeg', ext: 'jpg',  label: 'JPG',  offsets: [[0,[0xFF,0xD8,0xFF]]] },
  { mime: 'image/webp', ext: 'webp', label: 'WebP', offsets: [[8,[0x57,0x45,0x42,0x50]]] },
  { mime: 'image/gif',  ext: 'gif',  label: 'GIF',  offsets: [[0,[0x47,0x49,0x46]]] },
  { mime: 'image/bmp',  ext: 'bmp',  label: 'BMP',  offsets: [[0,[0x42,0x4D]]] },
  { mime: 'image/tiff', ext: 'tiff', label: 'TIFF', offsets: [[0,[0x49,0x49,0x2A,0x00]],[0,[0x4D,0x4D,0x00,0x2A]]] },
  { mime: 'image/x-icon', ext: 'ico', label: 'ICO', offsets: [[0,[0x00,0x00,0x01,0x00]]] },
  { mime: 'image/svg+xml', ext: 'svg', label: 'SVG', offsets: [] },
  { mime: 'application/pdf', ext: 'pdf', label: 'PDF', offsets: [[0,[0x25,0x50,0x44,0x46]]] },
  { mime: 'video/mp4',  ext: 'mp4',  label: 'MP4',  offsets: [[4,[0x66,0x74,0x79,0x70]]] },
  { mime: 'video/webm', ext: 'webm', label: 'WebM', offsets: [[0,[0x1A,0x45,0xDF,0xA3]]] },
  { mime: 'audio/wav',  ext: 'wav',  label: 'WAV',  offsets: [[8,[0x57,0x41,0x56,0x45]]] },
  { mime: 'audio/ogg',  ext: 'ogg',  label: 'OGG',  offsets: [[0,[0x4F,0x67,0x67,0x53]]] },
  { mime: 'audio/flac', ext: 'flac', label: 'FLAC', offsets: [[0,[0x66,0x4C,0x61,0x43]]] },
  { mime: 'audio/mpeg', ext: 'mp3',  label: 'MP3',  offsets: [[0,[0x49,0x44,0x33]],[0,[0xFF,0xFB]],[0,[0xFF,0xF3]],[0,[0xFF,0xF2]]] },
  { mime: 'font/ttf',   ext: 'ttf',  label: 'TTF',  offsets: [[0,[0x00,0x01,0x00,0x00]]] },
  { mime: 'font/otf',   ext: 'otf',  label: 'OTF',  offsets: [[0,[0x4F,0x54,0x54,0x4F]]] },
  { mime: 'font/woff',  ext: 'woff', label: 'WOFF', offsets: [[0,[0x77,0x4F,0x46,0x46]]] },
];

// Format -> available conversion targets
const ROUTES = {
  'image/heic':  [{ label: 'Convert to JPG', href: '/heic-to-jpg' }, { label: 'Convert to PNG', href: '/heic-to-png' }, { label: 'Convert to WebP', href: '/heic-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/png':   [{ label: 'Convert to JPG', href: '/png-to-jpg' }, { label: 'Convert to WebP', href: '/png-to-webp' }, { label: 'Convert to PDF', href: '/png-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/jpeg':  [{ label: 'Convert to WebP', href: '/jpg-to-webp' }, { label: 'Convert to PNG', href: '/jpg-to-png' }, { label: 'Convert to PDF', href: '/jpg-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/webp':  [{ label: 'Convert to JPG', href: '/webp-to-jpg' }, { label: 'Convert to PNG', href: '/webp-to-png' }, { label: 'Convert to PDF', href: '/webp-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/gif':   [{ label: 'Convert to JPG', href: '/gif-to-jpg' }, { label: 'Convert to PNG', href: '/gif-to-png' }, { label: 'Convert to WebP', href: '/gif-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/bmp':   [{ label: 'Convert to JPG', href: '/bmp-to-jpg' }, { label: 'Convert to PNG', href: '/bmp-to-png' }, { label: 'Convert to WebP', href: '/bmp-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/avif':  [{ label: 'Convert to JPG', href: '/avif-to-jpg' }, { label: 'Convert to PNG', href: '/avif-to-png' }, { label: 'Convert to WebP', href: '/avif-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/tiff':  [{ label: 'Convert to JPG', href: '/tiff-to-jpg' }, { label: 'Convert to PNG', href: '/tiff-to-png' }, { label: 'Convert to WebP', href: '/tiff-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/x-icon': [{ label: 'Convert to JPG', href: '/ico-to-jpg' }, { label: 'Convert to PNG', href: '/ico-to-png' }, { label: 'Convert to WebP', href: '/ico-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'image/svg+xml': [{ label: 'Convert to JPG', href: '/svg-to-jpg' }, { label: 'Convert to PNG', href: '/svg-to-png' }, { label: 'Convert to WebP', href: '/svg-to-webp' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }],
  'application/pdf': [{ label: 'Convert to JPG', href: '/pdf-to-jpg' }, { label: 'Convert to PNG', href: '/pdf-to-png' }, { label: 'Merge PDFs', href: '/merge-pdf' }, { label: 'Split PDF', href: '/split-pdf' }],
  'video/mp4':       [{ label: 'Convert to WebM', href: '/mp4-to-webm' }, { label: 'Convert to GIF', href: '/video-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/webm':      [{ label: 'Convert to MP4', href: '/webm-to-mp4' }, { label: 'Convert to GIF', href: '/video-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/quicktime': [{ label: 'Convert to MP4', href: '/mov-to-mp4' }, { label: 'Convert to GIF', href: '/video-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/x-msvideo': [{ label: 'Convert to MP4', href: '/avi-to-mp4' }, { label: 'Compress', href: '/compress-video' }],
  'video/x-matroska':[{ label: 'Convert to MP4', href: '/mkv-to-mp4' }, { label: 'Compress', href: '/compress-video' }],
  'audio/mpeg': [{ label: 'Convert to WAV', href: '/mp3-to-wav' }],
  'audio/wav':  [{ label: 'Convert to MP3', href: '/wav-to-mp3' }],
  'audio/ogg':  [{ label: 'Convert to WAV', href: '/ogg-to-wav' }, { label: 'Convert to MP3', href: '/ogg-to-mp3' }],
  'audio/flac': [{ label: 'Convert to WAV', href: '/flac-to-wav' }, { label: 'Convert to MP3', href: '/flac-to-mp3' }],
  'audio/mp4':  [{ label: 'Convert to WAV', href: '/m4a-to-wav' }, { label: 'Convert to MP3', href: '/m4a-to-mp3' }],
  'audio/aac':  [{ label: 'Convert to WAV', href: '/aac-to-wav' }, { label: 'Convert to MP3', href: '/aac-to-mp3' }],
  'application/epub+zip': [{ label: 'Convert to TXT', href: '/epub-to-txt' }, { label: 'Convert to PDF', href: '/epub-to-pdf' }],
  'application/rtf': [{ label: 'Convert to TXT', href: '/rtf-to-txt' }, { label: 'Convert to PDF', href: '/rtf-to-pdf' }],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [{ label: 'Convert to TXT', href: '/docx-to-txt' }, { label: 'Convert to PDF', href: '/docx-to-pdf' }],
  'font/ttf':  [{ label: 'Convert to OTF', href: '/ttf-to-otf' }, { label: 'Convert to WOFF', href: '/ttf-to-woff' }],
  'font/otf':  [{ label: 'Convert to TTF', href: '/otf-to-ttf' }, { label: 'Convert to WOFF', href: '/otf-to-woff' }],
  'font/woff': [{ label: 'Convert to TTF', href: '/woff-to-ttf' }, { label: 'Convert to OTF', href: '/woff-to-otf' }],
  'application/zip': [{ label: 'Extract Files', href: '/extract-zip' }],
};

async function detect(file) {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const fmt of SIGS) {
    for (const [offset, sig] of fmt.offsets) {
      if (buf.length >= offset + sig.length && sig.every((b, i) => buf[offset + i] === b)) {
        return fmt;
      }
    }
  }
  // SVG: check extension or sniff text content
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (ext === 'svg' || file.type === 'image/svg+xml') {
    return SIGS.find(s => s.mime === 'image/svg+xml');
  }
  // ICO/TIFF: fallback on extension if magic bytes missed
  if (ext === 'ico') return SIGS.find(s => s.mime === 'image/x-icon');
  if (ext === 'tif' || ext === 'tiff') return SIGS.find(s => s.mime === 'image/tiff');
  if (ext === 'avif') return SIGS.find(s => s.mime === 'image/avif');
  // Audio fallbacks
  if (ext === 'mp3') return SIGS.find(s => s.mime === 'audio/mpeg');
  if (ext === 'wav') return SIGS.find(s => s.mime === 'audio/wav');
  if (ext === 'ogg') return SIGS.find(s => s.mime === 'audio/ogg');
  if (ext === 'flac') return SIGS.find(s => s.mime === 'audio/flac');
  if (ext === 'm4a') return { mime: 'audio/mp4', ext: 'm4a', label: 'M4A' };
  if (ext === 'aac') return { mime: 'audio/aac', ext: 'aac', label: 'AAC' };
  // Document fallbacks
  if (ext === 'epub') return { mime: 'application/epub+zip', ext: 'epub', label: 'EPUB' };
  if (ext === 'docx') return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx', label: 'DOCX' };
  if (ext === 'rtf') return { mime: 'application/rtf', ext: 'rtf', label: 'RTF' };
  // Font fallbacks
  if (ext === 'ttf') return SIGS.find(s => s.mime === 'font/ttf');
  if (ext === 'otf') return SIGS.find(s => s.mime === 'font/otf');
  if (ext === 'woff') return SIGS.find(s => s.mime === 'font/woff');
  // Video fallbacks
  if (ext === 'mov') return { mime: 'video/quicktime', ext: 'mov', label: 'MOV' };
  if (ext === 'avi') return { mime: 'video/x-msvideo', ext: 'avi', label: 'AVI' };
  if (ext === 'mkv') return { mime: 'video/x-matroska', ext: 'mkv', label: 'MKV' };
  // Archive fallback
  if (ext === 'zip') return { mime: 'application/zip', ext: 'zip', label: 'ZIP' };
  return null;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('irisfiles', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeFiles(files) {
  const db = await openDB();
  const tx = db.transaction('pending', 'readwrite');
  const store = tx.objectStore('pending');
  store.clear();
  for (let i = 0; i < files.length; i++) {
    store.put(files[i], i);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// Exported for converter pages to pick up stored files
export async function loadPendingFiles() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const keys = await idbRequest(store.getAllKeys());
    if (keys.length === 0) return null;
    const files = [];
    for (const k of keys) {
      files.push(await idbRequest(store.get(k)));
    }
    // Clear after reading
    const tx2 = db.transaction('pending', 'readwrite');
    tx2.objectStore('pending').clear();
    return files;
  } catch {
    return null;
  }
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function initSmartDrop() {
  const dropZone = document.getElementById('smart-drop');
  const fileInput = document.getElementById('smart-file-input');
  const routePanel = document.getElementById('route-panel');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleDrop(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => { handleDrop(fileInput.files); fileInput.value = ''; });

  async function handleDrop(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    routePanel.innerHTML = '<p class="route-panel__detecting">Detecting file type...</p>';
    routePanel.style.display = '';

    // Detect all files
    const detected = await Promise.all(files.map(f => detect(f)));
    const known = detected.filter(Boolean);

    if (known.length === 0) {
      routePanel.innerHTML = '<p class="route-panel__error">Could not recognize file format. Try dropping your files on a specific converter below.</p>';
      return;
    }

    // Find dominant format
    const counts = {};
    for (const d of known) {
      counts[d.mime] = (counts[d.mime] || 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const dominantInfo = known.find(d => d.mime === dominant);
    const routes = ROUTES[dominant];

    if (!routes) {
      routePanel.innerHTML = '<p class="route-panel__error">Unsupported format. Try a specific converter below.</p>';
      return;
    }

    const fileCount = files.length;
    const label = dominantInfo.label;
    const plural = fileCount === 1 ? 'file' : 'files';

    let html = `<p class="route-panel__info">${fileCount} ${label} ${plural} detected. What would you like to do?</p><div class="route-panel__buttons">`;
    for (const route of routes) {
      html += `<button class="btn btn--primary route-btn" data-href="${route.href}">${route.label}</button>`;
    }
    html += '</div>';
    routePanel.innerHTML = html;

    routePanel.querySelectorAll('.route-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.textContent = 'Loading...';
        btn.disabled = true;
        await storeFiles(files);
        window.location.href = btn.dataset.href;
      });
    });
  }
}
