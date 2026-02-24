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
  'image/heic':  [{ label: 'Convert to JPG', href: '/heic-to-jpg' }, { label: 'Convert to PNG', href: '/heic-to-png' }, { label: 'Convert to WebP', href: '/heic-to-webp' }, { label: 'Convert to PDF', href: '/heic-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/png':   [{ label: 'Convert to JPG', href: '/png-to-jpg' }, { label: 'Convert to WebP', href: '/png-to-webp' }, { label: 'Convert to GIF', href: '/png-to-gif' }, { label: 'Convert to PDF', href: '/png-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/jpeg':  [{ label: 'Convert to WebP', href: '/jpg-to-webp' }, { label: 'Convert to PNG', href: '/jpg-to-png' }, { label: 'Convert to GIF', href: '/jpg-to-gif' }, { label: 'Convert to PDF', href: '/jpg-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/webp':  [{ label: 'Convert to JPG', href: '/webp-to-jpg' }, { label: 'Convert to PNG', href: '/webp-to-png' }, { label: 'Convert to GIF', href: '/webp-to-gif' }, { label: 'Convert to PDF', href: '/webp-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/gif':   [{ label: 'Convert to JPG', href: '/gif-to-jpg' }, { label: 'Convert to PNG', href: '/gif-to-png' }, { label: 'Convert to WebP', href: '/gif-to-webp' }, { label: 'Convert to PDF', href: '/gif-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/bmp':   [{ label: 'Convert to JPG', href: '/bmp-to-jpg' }, { label: 'Convert to PNG', href: '/bmp-to-png' }, { label: 'Convert to WebP', href: '/bmp-to-webp' }, { label: 'Convert to PDF', href: '/bmp-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/avif':  [{ label: 'Convert to JPG', href: '/avif-to-jpg' }, { label: 'Convert to PNG', href: '/avif-to-png' }, { label: 'Convert to WebP', href: '/avif-to-webp' }, { label: 'Convert to PDF', href: '/avif-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/tiff':  [{ label: 'Convert to JPG', href: '/tiff-to-jpg' }, { label: 'Convert to PNG', href: '/tiff-to-png' }, { label: 'Convert to WebP', href: '/tiff-to-webp' }, { label: 'Convert to PDF', href: '/tiff-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/x-icon': [{ label: 'Convert to JPG', href: '/ico-to-jpg' }, { label: 'Convert to PNG', href: '/ico-to-png' }, { label: 'Convert to WebP', href: '/ico-to-webp' }, { label: 'Convert to PDF', href: '/ico-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'image/svg+xml': [{ label: 'Convert to JPG', href: '/svg-to-jpg' }, { label: 'Convert to PNG', href: '/svg-to-png' }, { label: 'Convert to WebP', href: '/svg-to-webp' }, { label: 'Convert to PDF', href: '/svg-to-pdf' }, { label: 'View Metadata', href: '/image-metadata' }, { label: 'Compress', href: '/compress' }, { label: 'Resize', href: '/resize-image' }, { label: 'Strip EXIF', href: '/strip-exif' }],
  'application/pdf': [{ label: 'Convert to JPG', href: '/pdf-to-jpg' }, { label: 'Convert to PNG', href: '/pdf-to-png' }, { label: 'Merge PDFs', href: '/merge-pdf' }, { label: 'Split PDF', href: '/split-pdf' }],
  'video/mp4':       [{ label: 'Convert to WebM', href: '/mp4-to-webm' }, { label: 'Convert to MOV', href: '/mp4-to-mov' }, { label: 'Convert to AVI', href: '/mp4-to-avi' }, { label: 'Convert to MKV', href: '/mp4-to-mkv' }, { label: 'Convert to GIF', href: '/mp4-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/webm':      [{ label: 'Convert to MP4', href: '/webm-to-mp4' }, { label: 'Convert to MOV', href: '/webm-to-mov' }, { label: 'Convert to AVI', href: '/webm-to-avi' }, { label: 'Convert to MKV', href: '/webm-to-mkv' }, { label: 'Convert to GIF', href: '/webm-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/quicktime': [{ label: 'Convert to MP4', href: '/mov-to-mp4' }, { label: 'Convert to WebM', href: '/mov-to-webm' }, { label: 'Convert to AVI', href: '/mov-to-avi' }, { label: 'Convert to MKV', href: '/mov-to-mkv' }, { label: 'Convert to GIF', href: '/mov-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/x-msvideo': [{ label: 'Convert to MP4', href: '/avi-to-mp4' }, { label: 'Convert to WebM', href: '/avi-to-webm' }, { label: 'Convert to MOV', href: '/avi-to-mov' }, { label: 'Convert to MKV', href: '/avi-to-mkv' }, { label: 'Convert to GIF', href: '/avi-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'video/x-matroska':[{ label: 'Convert to MP4', href: '/mkv-to-mp4' }, { label: 'Convert to WebM', href: '/mkv-to-webm' }, { label: 'Convert to MOV', href: '/mkv-to-mov' }, { label: 'Convert to AVI', href: '/mkv-to-avi' }, { label: 'Convert to GIF', href: '/mkv-to-gif' }, { label: 'Compress', href: '/compress-video' }],
  'image/gif-video': [{ label: 'Convert to MP4', href: '/gif-to-mp4' }, { label: 'Convert to WebM', href: '/gif-to-webm' }, { label: 'Convert to MOV', href: '/gif-to-mov' }, { label: 'Convert to AVI', href: '/gif-to-avi' }, { label: 'Convert to MKV', href: '/gif-to-mkv' }],
  'audio/mpeg': [{ label: 'Convert to WAV', href: '/mp3-to-wav' }, { label: 'Convert to OGG', href: '/mp3-to-ogg' }, { label: 'Convert to FLAC', href: '/mp3-to-flac' }, { label: 'Convert to M4A', href: '/mp3-to-m4a' }, { label: 'Convert to AAC', href: '/mp3-to-aac' }, { label: 'Compress', href: '/compress-audio' }],
  'audio/wav':  [{ label: 'Convert to MP3', href: '/wav-to-mp3' }, { label: 'Convert to OGG', href: '/wav-to-ogg' }, { label: 'Convert to FLAC', href: '/wav-to-flac' }, { label: 'Convert to M4A', href: '/wav-to-m4a' }, { label: 'Convert to AAC', href: '/wav-to-aac' }, { label: 'Compress', href: '/compress-audio' }],
  'audio/ogg':  [{ label: 'Convert to WAV', href: '/ogg-to-wav' }, { label: 'Convert to MP3', href: '/ogg-to-mp3' }, { label: 'Convert to FLAC', href: '/ogg-to-flac' }, { label: 'Convert to M4A', href: '/ogg-to-m4a' }, { label: 'Convert to AAC', href: '/ogg-to-aac' }, { label: 'Compress', href: '/compress-audio' }],
  'audio/flac': [{ label: 'Convert to WAV', href: '/flac-to-wav' }, { label: 'Convert to MP3', href: '/flac-to-mp3' }, { label: 'Convert to OGG', href: '/flac-to-ogg' }, { label: 'Convert to M4A', href: '/flac-to-m4a' }, { label: 'Convert to AAC', href: '/flac-to-aac' }, { label: 'Compress', href: '/compress-audio' }],
  'audio/mp4':  [{ label: 'Convert to WAV', href: '/m4a-to-wav' }, { label: 'Convert to MP3', href: '/m4a-to-mp3' }, { label: 'Convert to OGG', href: '/m4a-to-ogg' }, { label: 'Convert to FLAC', href: '/m4a-to-flac' }, { label: 'Convert to AAC', href: '/m4a-to-aac' }, { label: 'Compress', href: '/compress-audio' }],
  'audio/aac':  [{ label: 'Convert to WAV', href: '/aac-to-wav' }, { label: 'Convert to MP3', href: '/aac-to-mp3' }, { label: 'Convert to OGG', href: '/aac-to-ogg' }, { label: 'Convert to FLAC', href: '/aac-to-flac' }, { label: 'Convert to M4A', href: '/aac-to-m4a' }, { label: 'Compress', href: '/compress-audio' }],
  'application/epub+zip': [{ label: 'Convert to TXT', href: '/epub-to-txt' }, { label: 'Convert to PDF', href: '/epub-to-pdf' }],
  'application/rtf': [{ label: 'Convert to TXT', href: '/rtf-to-txt' }, { label: 'Convert to PDF', href: '/rtf-to-pdf' }],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [{ label: 'Convert to TXT', href: '/docx-to-txt' }, { label: 'Convert to PDF', href: '/docx-to-pdf' }],
  'application/x-mobipocket-ebook': [{ label: 'Convert to TXT', href: '/mobi-to-txt' }, { label: 'Convert to PDF', href: '/mobi-to-pdf' }],
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
  if (ext === 'mobi' || ext === 'prc') return { mime: 'application/x-mobipocket-ebook', ext: 'mobi', label: 'MOBI' };
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

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function formatDuration(s) {
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return min + ':' + String(sec).padStart(2, '0');
}

async function getMediaMeta(file, mime) {
  const meta = [];
  try {
    if (mime.startsWith('image/')) {
      const { readMetadata } = await import('./exif-engine.js');
      const md = await readMetadata(file);
      const w = md.basic?.['Width'], h = md.basic?.['Height'];
      if (w && h) meta.push(w + ' x ' + h);
      const model = md.camera?.['Model'];
      if (model) meta.push(model.trim());
      const date = md.dates?.['Date Taken'];
      if (date) meta.push(date.split(' ')[0].replace(/:/g, '-'));
    } else if (mime.startsWith('video/')) {
      const info = await new Promise((resolve, reject) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          resolve({ dur: v.duration, w: v.videoWidth, h: v.videoHeight });
          URL.revokeObjectURL(v.src);
        };
        v.onerror = () => { URL.revokeObjectURL(v.src); reject(); };
        v.src = URL.createObjectURL(file);
      });
      if (info.w && info.h) meta.push(info.w + ' x ' + info.h);
      if (info.dur && isFinite(info.dur)) meta.push(formatDuration(info.dur));
      const codec = await detectVideoCodec(file);
      if (codec) meta.push(codec);
    } else if (mime === 'application/pdf') {
      const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      meta.push(pdf.numPages + (pdf.numPages === 1 ? ' page' : ' pages'));
    } else if (mime.startsWith('audio/')) {
      const dur = await new Promise((resolve, reject) => {
        const a = document.createElement('audio');
        a.preload = 'metadata';
        a.onloadedmetadata = () => { resolve(a.duration); URL.revokeObjectURL(a.src); };
        a.onerror = () => { URL.revokeObjectURL(a.src); reject(); };
        a.src = URL.createObjectURL(file);
      });
      if (dur && isFinite(dur)) meta.push(formatDuration(dur));
    }
  } catch { /* graceful failure */ }
  return meta;
}

async function renderPdfPreview(file, container) {
  try {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const scale = 200 / vp.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'route-preview-img';
    canvas.style.background = '#fff';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    container.appendChild(canvas);
  } catch { /* graceful failure */ }
}

function detectVideoCodec(file) {
  return file.slice(0, 64).arrayBuffer().then(ab => {
    const b = new Uint8Array(ab);
    const str = String.fromCharCode(...b);
    // MP4 ftyp brands
    if (str.includes('avc1') || str.includes('isom')) return 'H.264';
    if (str.includes('hev1') || str.includes('hvc1')) return 'H.265';
    if (str.includes('av01')) return 'AV1';
    // WebM: usually VP8/VP9/AV1 but can't tell from first 64 bytes easily
    if (str.includes('\x1a\x45\xdf\xa3')) return 'VP8/VP9';
    return null;
  }).catch(() => null);
}

async function extractVideoFrames(file, container, count) {
  count = count || 6;
  try {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.src = url;
    await new Promise((resolve, reject) => {
      v.onloadeddata = resolve;
      v.onerror = reject;
    });
    const dur = v.duration;
    if (!dur || !isFinite(dur) || !v.videoWidth) { URL.revokeObjectURL(url); return; }
    // Size frames to fill container, works for landscape and portrait
    const gap = 3;
    const containerW = container.offsetWidth || 700;
    const aspect = v.videoWidth / v.videoHeight;
    const frameW = Math.floor((containerW - gap * (count - 1)) / count);
    const frameH = Math.round(frameW / aspect);
    for (let i = 0; i < count; i++) {
      const t = dur * ((i + 1) / (count + 1));
      v.currentTime = t;
      await new Promise((resolve) => {
        const onSeeked = () => { v.removeEventListener('seeked', onSeeked); resolve(); };
        v.addEventListener('seeked', onSeeked);
      });
      if (!v.videoWidth) continue;
      const canvas = document.createElement('canvas');
      canvas.width = frameW;
      canvas.height = frameH;
      canvas.className = 'route-frame';
      const ctx = canvas.getContext('2d');
      ctx.drawImage(v, 0, 0, frameW, frameH);
      container.appendChild(canvas);
    }
    URL.revokeObjectURL(url);
  } catch { /* graceful failure: filmstrip stays empty */ }
}

// --- Inline conversion support ---

const INLINE_MIME_MAP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', pdf: 'application/pdf',
  mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac',
  ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff',
  txt: 'text/plain',
};

function resolveEngine(sourceMime, href) {
  const m = href.match(/\/(\w+)-to-(\w+)/);
  if (!m) return null;
  const [, src, tgt] = m;
  const targetMime = INLINE_MIME_MAP[tgt];
  if (!targetMime) return null;
  if (sourceMime === 'image/heic' && targetMime.startsWith('image/'))
    return { type: 'heic', targetMime, targetExt: tgt };
  if (sourceMime.startsWith('image/') && sourceMime !== 'image/gif-video' && targetMime.startsWith('image/'))
    return { type: 'image', targetMime, targetExt: tgt };
  if (sourceMime.startsWith('image/') && tgt === 'pdf')
    return { type: 'img-to-pdf', targetExt: 'pdf' };
  if (sourceMime === 'application/pdf' && targetMime.startsWith('image/'))
    return { type: 'pdf-to-img', targetMime, targetExt: tgt };
  if (sourceMime === 'image/gif-video')
    return { type: 'gif-to-video', targetExt: tgt, targetFormat: tgt };
  if (sourceMime.startsWith('video/') && tgt === 'gif')
    return { type: 'vid-to-gif', targetExt: 'gif', notice: 'GIF files from video are often very large (easily 20 MB+ for a few seconds of footage).' };
  if (sourceMime.startsWith('video/'))
    return { type: 'video', targetExt: tgt, targetFormat: tgt };
  if (sourceMime.startsWith('audio/') && (tgt === 'mp3' || tgt === 'wav'))
    return { type: 'audio', targetExt: tgt, targetFormat: tgt };
  if (sourceMime.startsWith('audio/'))
    return { type: 'audio-ff', targetExt: tgt, targetFormat: tgt };
  if (sourceMime.startsWith('font/'))
    return { type: 'font', targetExt: tgt, targetFormat: tgt };
  if (['epub', 'rtf', 'docx', 'mobi'].includes(src))
    return { type: 'doc', targetExt: tgt, srcFmt: src, tgtFmt: tgt };
  return null;
}

function inlineOutputName(name, ext) {
  return name.replace(/\.[^.]+$/, '') + '.' + ext;
}

async function executeConversion(file, sourceMime, resolved, onProgress, onStatus) {
  switch (resolved.type) {
    case 'image': {
      onProgress(20);
      const { convertWithCanvas } = await import('./converter.js');
      onProgress(50);
      const blob = await convertWithCanvas(file, resolved.targetMime, 0.92);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'heic': {
      const { convertHeic } = await import('./converter.js');
      const blob = await convertHeic(file, resolved.targetMime, 0.92, onProgress);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'img-to-pdf': {
      let imgBlob = file, imgMime = sourceMime;
      if (sourceMime === 'image/heic') {
        const { convertHeic } = await import('./converter.js');
        imgBlob = await convertHeic(file, 'image/jpeg', 0.92, p => onProgress(Math.round(p * 0.5)));
        imgMime = 'image/jpeg';
      }
      const { imagesToPdf } = await import('./pdf-engine.js');
      const blob = await imagesToPdf(
        [{ blob: imgBlob, mime: imgMime }],
        p => onProgress(sourceMime === 'image/heic' ? 50 + Math.round(p * 0.5) : p)
      );
      return { blob, name: inlineOutputName(file.name, 'pdf') };
    }
    case 'pdf-to-img': {
      const { pdfToImages } = await import('./pdf-engine.js');
      const pages = await pdfToImages(file, resolved.targetMime, 0.92, onProgress);
      if (pages.length === 1) return { blob: pages[0].blob, name: pages[0].name };
      return { pages };
    }
    case 'vid-to-gif': {
      if (!window.gifenc) {
        onStatus('Loading GIF encoder\u2026');
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/js/gifenc.min.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load GIF encoder'));
          document.head.appendChild(s);
        });
      }
      const { videoToGif } = await import('./gif-engine.js');
      const blob = await videoToGif(file, {
        onProgress: (pct, msg) => { onProgress(pct); if (msg) onStatus(msg); },
      });
      return { blob, name: inlineOutputName(file.name, 'gif') };
    }
    case 'gif-to-video': {
      const { gifToVideo } = await import('./vidconv-engine.js');
      const blob = await gifToVideo(file, resolved.targetFormat, onProgress, onStatus);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'video': {
      const { convertVideo } = await import('./vidconv-engine.js');
      const blob = await convertVideo(file, resolved.targetFormat, onProgress, onStatus);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'audio': {
      const { convertAudio } = await import('./audio-engine.js');
      const blob = await convertAudio(file, resolved.targetFormat, onProgress);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'audio-ff': {
      const { convertAudioFFmpeg } = await import('./audio-engine.js');
      const blob = await convertAudioFFmpeg(file, resolved.targetFormat, onProgress);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'font': {
      const { convertFont } = await import('./font-engine.js');
      const blob = await convertFont(file, resolved.targetFormat, onProgress);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
    case 'doc': {
      const mod = await import('./doc-engine.js');
      const fnName = resolved.srcFmt + 'To' + (resolved.tgtFmt === 'txt' ? 'Text' : 'Pdf');
      const fn = mod[fnName];
      if (!fn) throw new Error('Conversion not supported');
      const blob = await fn(file, onProgress);
      return { blob, name: inlineOutputName(file.name, resolved.targetExt) };
    }
  }
  throw new Error('Unknown conversion type');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function runInlineConversion(file, sourceMime, resolved, routePanel, onDismiss) {
  routePanel.querySelectorAll('.route-section').forEach(s => s.style.display = 'none');
  const prev = routePanel.querySelector('.route-inline-convert');
  if (prev) prev.remove();

  const wrap = document.createElement('div');
  wrap.className = 'route-inline-convert';

  const statusEl = document.createElement('div');
  statusEl.className = 'route-convert-status';
  statusEl.textContent = 'Converting to ' + resolved.targetExt.toUpperCase() + '\u2026';
  wrap.appendChild(statusEl);

  if (resolved.notice) {
    const noticeEl = document.createElement('div');
    noticeEl.className = 'route-convert-notice';
    noticeEl.textContent = resolved.notice;
    wrap.appendChild(noticeEl);
  }

  const progressWrap = document.createElement('div');
  progressWrap.className = 'route-convert-progress';
  const bar = document.createElement('div');
  bar.className = 'route-convert-bar';
  progressWrap.appendChild(bar);
  wrap.appendChild(progressWrap);

  const resultEl = document.createElement('div');
  resultEl.className = 'route-convert-result';
  resultEl.style.display = 'none';
  wrap.appendChild(resultEl);

  const errorEl = document.createElement('div');
  errorEl.className = 'route-convert-error';
  errorEl.style.display = 'none';
  wrap.appendChild(errorEl);

  const actionsEl = document.createElement('div');
  actionsEl.className = 'route-convert-actions';
  actionsEl.style.display = 'none';
  wrap.appendChild(actionsEl);

  routePanel.appendChild(wrap);

  const resultUrls = [];
  const cleanup = () => { resultUrls.forEach(u => URL.revokeObjectURL(u)); resultUrls.length = 0; };
  const onProgress = pct => { bar.style.width = Math.min(100, Math.max(0, pct)) + '%'; };
  const onStatus = msg => { if (msg) statusEl.textContent = msg; };

  const showActions = (includeRetry) => {
    actionsEl.style.display = '';
    if (includeRetry) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn--primary';
      retryBtn.textContent = 'Try again';
      retryBtn.addEventListener('click', () => {
        cleanup();
        wrap.remove();
        runInlineConversion(file, sourceMime, resolved, routePanel, onDismiss);
      });
      actionsEl.appendChild(retryBtn);
    }
    const anotherBtn = document.createElement('button');
    anotherBtn.className = 'btn btn--secondary';
    anotherBtn.textContent = 'Convert to another format';
    anotherBtn.addEventListener('click', () => {
      cleanup();
      wrap.remove();
      routePanel.querySelectorAll('.route-section').forEach(s => s.style.display = '');
    });
    actionsEl.appendChild(anotherBtn);
    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn--secondary';
    newBtn.textContent = 'Drop new file';
    newBtn.addEventListener('click', () => { cleanup(); onDismiss(); });
    actionsEl.appendChild(newBtn);
  };

  try {
    const result = await executeConversion(file, sourceMime, resolved, onProgress, onStatus);
    bar.style.width = '100%';
    bar.classList.add('done');
    progressWrap.style.display = 'none';

    if (result.pages) {
      // Multi-page PDF-to-image
      statusEl.textContent = result.pages.length + ' pages converted';
      resultEl.style.display = '';
      resultEl.style.flexDirection = 'column';
      resultEl.style.alignItems = 'stretch';
      if (result.pages.length > 1) {
        const zipBtn = document.createElement('button');
        zipBtn.className = 'btn btn--success';
        zipBtn.textContent = 'Download All as ZIP (' + result.pages.length + ' files)';
        zipBtn.addEventListener('click', async () => {
          zipBtn.textContent = 'Preparing ZIP\u2026';
          zipBtn.disabled = true;
          if (!window.fflate) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = '/js/fflate.min.js';
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
          }
          const entries = {};
          for (const pg of result.pages) entries[pg.name] = new Uint8Array(await pg.blob.arrayBuffer());
          const zipBlob = new Blob([fflate.zipSync(entries, { level: 0 })], { type: 'application/zip' });
          triggerDownload(zipBlob, file.name.replace(/\.[^.]+$/, '') + '-pages.zip');
          zipBtn.textContent = 'Download All as ZIP (' + result.pages.length + ' files)';
          zipBtn.disabled = false;
        });
        resultEl.appendChild(zipBtn);
      }
      for (const pg of result.pages) {
        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn btn--secondary';
        dlBtn.textContent = pg.name + ' (' + formatSize(pg.blob.size) + ')';
        dlBtn.addEventListener('click', () => triggerDownload(pg.blob, pg.name));
        resultEl.appendChild(dlBtn);
      }
    } else {
      // Single blob result
      statusEl.textContent = 'Done!';
      // Show constrained preview for image results
      if (result.blob.type && result.blob.type.startsWith('image/')) {
        const previewImg = document.createElement('img');
        previewImg.className = 'route-convert-preview';
        const previewUrl = URL.createObjectURL(result.blob);
        resultUrls.push(previewUrl);
        previewImg.src = previewUrl;
        previewImg.alt = result.name;
        wrap.insertBefore(previewImg, resultEl);
      }
      resultEl.style.display = '';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn--success';
      dlBtn.textContent = 'Download ' + result.name + ' (' + formatSize(result.blob.size) + ')';
      const dlUrl = URL.createObjectURL(result.blob);
      resultUrls.push(dlUrl);
      dlBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = result.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      resultEl.appendChild(dlBtn);
      if (result.blob.size < file.size) {
        const pct = Math.round((1 - result.blob.size / file.size) * 100);
        if (pct > 0) {
          const savingsEl = document.createElement('span');
          savingsEl.className = 'route-convert-savings';
          savingsEl.textContent = pct + '% smaller';
          resultEl.appendChild(savingsEl);
        }
      } else if (result.blob.size > file.size * 1.5) {
        const warningEl = document.createElement('span');
        warningEl.className = 'route-convert-warning';
        const ratio = result.blob.size / file.size;
        warningEl.textContent = (ratio >= 2
          ? ratio.toFixed(1) + 'x larger than original'
          : Math.round((ratio - 1) * 100) + '% larger than original');
        resultEl.appendChild(warningEl);
      }
    }
    showActions(false);
  } catch (err) {
    progressWrap.style.display = 'none';
    statusEl.style.display = 'none';
    errorEl.style.display = '';
    errorEl.textContent = 'Conversion failed: ' + (err.message || 'Unknown error');
    showActions(true);
  }
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

  // Track blob URLs for cleanup
  let prevBlobUrls = [];

  async function handleDrop(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Revoke previous blob URLs
    for (const u of prevBlobUrls) URL.revokeObjectURL(u);
    prevBlobUrls = [];

    routePanel.innerHTML = '<p class="route-panel__detecting">Detecting file type...</p>';
    routePanel.style.display = '';
    dropZone.classList.add('compact');

    const detected = await Promise.all(files.map(f => detect(f)));
    const known = detected.filter(Boolean);

    if (known.length === 0) {
      routePanel.innerHTML = '<p class="route-panel__error">Could not recognize file format. Try dropping your files on a specific converter below.</p>';
      return;
    }

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

    const isSingle = files.length === 1;
    const isImage = dominant.startsWith('image/');
    const isVideo = dominant.startsWith('video/');
    const isAudio = dominant.startsWith('audio/');
    const isPdf = dominant === 'application/pdf';
    const hasPreview = isImage || isVideo || isPdf;
    const conversions = routes.filter(r => r.label.startsWith('Convert to'));
    const tools = routes.filter(r => !r.label.startsWith('Convert to'));

    // Build DOM
    routePanel.innerHTML = '';

    // Dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'route-dismiss';
    dismissBtn.setAttribute('aria-label', 'Remove file');
    dismissBtn.innerHTML = '&#215;';
    dismissBtn.addEventListener('click', () => {
      for (const u of prevBlobUrls) URL.revokeObjectURL(u);
      prevBlobUrls = [];
      routePanel.innerHTML = '';
      routePanel.style.display = 'none';
      dropZone.classList.remove('compact');
    });
    routePanel.appendChild(dismissBtn);

    // File info section
    let inlineMetaEl = null;

    if (isSingle && isVideo) {
      // Video: full-width filmstrip above file details
      const wrapper = document.createElement('div');
      wrapper.className = 'route-video-preview';

      const filmstrip = document.createElement('div');
      filmstrip.className = 'route-filmstrip';
      wrapper.appendChild(filmstrip);
      extractVideoFrames(files[0], filmstrip);

      const det = document.createElement('div');
      det.className = 'route-file-details';
      det.style.marginTop = '0.5rem';

      const nameEl = document.createElement('div');
      nameEl.className = 'route-file-name';
      nameEl.textContent = files[0].name;
      det.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'route-file-meta';
      metaEl.innerHTML = formatSize(files[0].size) + ' &middot; ' + esc(dominantInfo.label);
      det.appendChild(metaEl);

      inlineMetaEl = document.createElement('div');
      inlineMetaEl.className = 'route-inline-meta';
      det.appendChild(inlineMetaEl);

      wrapper.appendChild(det);
      wrapper.style.paddingBottom = '0.75rem';
      wrapper.style.borderBottom = '1px solid var(--border)';
      wrapper.style.marginBottom = '0.75rem';
      wrapper.style.textAlign = 'left';
      routePanel.appendChild(wrapper);
    } else if (isSingle && (isImage || isPdf)) {
      // Image/PDF: preview left, details right
      const row = document.createElement('div');
      row.className = 'route-preview-row';

      const previewDiv = document.createElement('div');
      previewDiv.className = 'route-preview';

      if (isImage) {
        const img = document.createElement('img');
        const blobUrl = URL.createObjectURL(files[0]);
        prevBlobUrls.push(blobUrl);
        img.src = blobUrl;
        img.className = 'route-preview-img';
        img.alt = files[0].name;
        previewDiv.appendChild(img);
      } else {
        renderPdfPreview(files[0], previewDiv);
      }

      row.appendChild(previewDiv);

      const detCol = document.createElement('div');
      detCol.className = 'route-file-details-col';

      const nameEl = document.createElement('div');
      nameEl.className = 'route-file-name';
      nameEl.textContent = files[0].name;
      detCol.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'route-file-meta';
      metaEl.innerHTML = formatSize(files[0].size) + ' &middot; ' + esc(dominantInfo.label);
      detCol.appendChild(metaEl);

      inlineMetaEl = document.createElement('div');
      inlineMetaEl.className = 'route-inline-meta';
      detCol.appendChild(inlineMetaEl);

      row.appendChild(detCol);
      routePanel.appendChild(row);
    } else if (isSingle) {
      // Audio/PDF/doc/font: no visual preview
      const info = document.createElement('div');
      info.className = 'route-file-info';

      const det = document.createElement('div');
      det.className = 'route-file-details';

      const nameEl = document.createElement('div');
      nameEl.className = 'route-file-name';
      nameEl.textContent = files[0].name;
      det.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'route-file-meta';
      metaEl.innerHTML = formatSize(files[0].size) + ' &middot; ' + esc(dominantInfo.label);
      det.appendChild(metaEl);

      inlineMetaEl = document.createElement('div');
      inlineMetaEl.className = 'route-inline-meta';
      det.appendChild(inlineMetaEl);

      info.appendChild(det);
      routePanel.appendChild(info);
    } else {
      // Multi-file: count + format label
      const info = document.createElement('div');
      info.className = 'route-file-info';
      const det = document.createElement('div');
      det.className = 'route-file-details';
      const nameEl = document.createElement('div');
      nameEl.className = 'route-file-name';
      nameEl.textContent = files.length + ' ' + dominantInfo.label + ' files';
      det.appendChild(nameEl);
      info.appendChild(det);
      routePanel.appendChild(info);
    }

    // Async metadata fill-in
    if (isSingle && inlineMetaEl) {
      getMediaMeta(files[0], dominant).then(parts => {
        if (parts.length > 0) inlineMetaEl.textContent = parts.join(' \u00b7 ');
      });
    }

    // Route buttons
    if (conversions.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'route-section';
      const label = document.createElement('div');
      label.className = 'route-section-label';
      label.textContent = 'Convert to';
      sec.appendChild(label);
      for (const r of conversions) {
        const btn = document.createElement('button');
        btn.className = 'route-option';
        btn.dataset.href = r.href;
        btn.textContent = r.label.replace('Convert to ', '');
        sec.appendChild(btn);
      }
      routePanel.appendChild(sec);
    }

    if (tools.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'route-section';
      const label = document.createElement('div');
      label.className = 'route-section-label';
      label.textContent = 'Tools';
      sec.appendChild(label);
      for (const r of tools) {
        const btn = document.createElement('button');
        btn.className = 'route-option';
        btn.dataset.href = r.href;
        btn.textContent = r.label === 'View Metadata' ? 'View Full Metadata' : r.label;
        sec.appendChild(btn);
      }
      routePanel.appendChild(sec);
    }

    routePanel.querySelectorAll('.route-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const resolved = isSingle ? resolveEngine(dominant, btn.dataset.href) : null;
        if (resolved) {
          runInlineConversion(files[0], dominant, resolved, routePanel, () => {
            for (const u of prevBlobUrls) URL.revokeObjectURL(u);
            prevBlobUrls = [];
            routePanel.innerHTML = '';
            routePanel.style.display = 'none';
            dropZone.classList.remove('compact');
          });
        } else {
          btn.textContent = 'Loading...';
          btn.disabled = true;
          await storeFiles(files);
          window.location.href = btn.dataset.href;
        }
      });
    });
  }
}
