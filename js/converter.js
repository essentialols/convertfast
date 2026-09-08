/**
 * IrisFiles - Core conversion engine
 * Format detection via magic bytes, Canvas-based conversion, HEIC via lazy WASM, ZIP packaging
 */

import { convertHeicFile } from './heic-worker.js';

const FORMAT_SIGNATURES = [
  { mime: 'image/heic',  ext: 'heic', offsets: [[4, [0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x63]],  // ftypheic
                                                  [4, [0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x78]],  // ftypheix
                                                  [4, [0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x63]],  // ftyphevc
                                                  [4, [0x66,0x74,0x79,0x70,0x6d,0x69,0x66,0x31]],  // ftypmif1
                                                  [4, [0x66,0x74,0x79,0x70,0x6d,0x73,0x66,0x31]],  // ftypmsf1
                                                  [4, [0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x66]],  // ftypheif
                                                  [4, [0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x78]]] }, // ftyphevx
  { mime: 'image/png',   ext: 'png',  offsets: [[0, [0x89,0x50,0x4E,0x47]]] },
  { mime: 'image/jpeg',  ext: 'jpg',  offsets: [[0, [0xFF,0xD8,0xFF]]] },
  { mime: 'image/webp',  ext: 'webp', offsets: [[8, [0x57,0x45,0x42,0x50]]] },
  { mime: 'image/gif',   ext: 'gif',  offsets: [[0, [0x47,0x49,0x46]]] },
  { mime: 'image/bmp',   ext: 'bmp',  offsets: [[0, [0x42,0x4D]]] },
  { mime: 'image/avif',  ext: 'avif', offsets: [[4,[0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66]],[4,[0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x73]]] },
];

function looksLikeSvg(bytes) {
  const text = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes)
    .replace(/^\uFEFF/, '');
  const normalized = text
    .replace(/^\s*<\?xml[\s\S]*?\?>/i, '')
    .replace(/^\s*(?:<!--[\s\S]*?-->\s*)*/i, '')
    .replace(/^\s*<!DOCTYPE[^>]*>/i, '')
    .trimStart();
  return /^<svg(?:\s|>)/i.test(normalized);
}

/**
 * Detect image format from magic bytes (not file extension).
 * @param {File} file
 * @returns {Promise<{mime: string, ext: string}|null>}
 */
function readFourCC(bytes, offset) {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function detectHeifFamily(bytes) {
  if (bytes.length < 16 || readFourCC(bytes, 4) !== 'ftyp') return null;

  const declaredSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  const end = declaredSize >= 16 ? Math.min(declaredSize, bytes.length) : bytes.length;
  const brands = [readFourCC(bytes, 8)];
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    brands.push(readFourCC(bytes, offset));
  }

  if (brands.includes('avif') || brands.includes('avis')) {
    return { mime: 'image/avif', ext: 'avif' };
  }
  if (brands.some(brand => ['heic', 'heix', 'hevc', 'hevx'].includes(brand))) {
    return { mime: 'image/heic', ext: 'heic' };
  }
  return null;
}

export async function detectFormat(file) {
  const buf = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const heifFamily = detectHeifFamily(buf);
  if (heifFamily) return heifFamily;

  for (const fmt of FORMAT_SIGNATURES) {
    for (const [offset, sig] of fmt.offsets) {
      if (buf.length >= offset + sig.length &&
          sig.every((byte, i) => buf[offset + i] === byte)) {
        return { mime: fmt.mime, ext: fmt.ext };
      }
    }
  }
  if (looksLikeSvg(buf)) return { mime: 'image/svg+xml', ext: 'svg' };
  return null;
}

/**
 * Check if a format needs the HEIC WASM decoder.
 */
export function needsHeicDecoder(mime) {
  return mime === 'image/heic' || mime === 'image/heif';
}

// Safeguards
const MAX_FILE_SIZE = 100 * 1024 * 1024;  // 100MB
const MAX_PIXELS = 100_000_000;            // 100 megapixels (e.g. 10000x10000)
const MAX_BATCH_SIZE = 50;

/**
 * Validate a file before processing. Throws descriptive errors.
 */
export function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${formatSize(file.size)}). Max is ${formatSize(MAX_FILE_SIZE)}.`);
  }
}

/**
 * Validate image dimensions before Canvas allocation. Throws if too large.
 */
export function validateDimensions(width, height) {
  const pixels = width * height;
  if (pixels > MAX_PIXELS) {
    throw new Error(`Image too large (${width}x${height} = ${Math.round(pixels/1e6)}MP). Max is ${Math.round(MAX_PIXELS/1e6)}MP.`);
  }
}

export { MAX_BATCH_SIZE };

async function loadSvgImage(file) {
  const svgBlob = file.type === 'image/svg+xml'
    ? file
    : new Blob([await file.arrayBuffer()], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return { image: img, cleanup: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Could not decode image. The file may be corrupted or in an unsupported format.');
  }
}

/**
 * Convert an image using the Canvas API (for natively-supported formats).
 * @param {File|Blob} file - Source image
 * @param {string} targetMime - e.g. 'image/jpeg', 'image/png'
 * @param {number} quality - 0-1 quality for lossy formats
 * @returns {Promise<Blob>}
 */
export async function convertWithCanvas(file, targetMime, quality) {
  // createImageBitmap with imageOrientation auto-corrects EXIF rotation from iPhone photos.
  // Chromium does not decode SVG blobs through createImageBitmap, so SVG uses an HTMLImageElement fallback.
  let source;
  let cleanup = () => {};
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    cleanup = () => source.close();
  } catch {
    const fmt = await detectFormat(file);
    if (fmt?.mime !== 'image/svg+xml') {
      throw new Error('Could not decode image. The file may be corrupted or in an unsupported format.');
    }
    const loaded = await loadSvgImage(file);
    source = loaded.image;
    cleanup = loaded.cleanup;
  }

  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  let canvas;
  try {
    validateDimensions(width, height);
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(source, 0, 0);
  } finally {
    cleanup();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      targetMime,
      quality
    );
  });
}

/**
 * Convert a HEIC file. Lazily loads the WASM decoder on first call.
 * Runs on the main thread (heic-to needs Canvas/DOM access).
 * @param {File} file
 * @param {string} targetMime
 * @param {number} quality - 0-1
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function convertHeic(file, targetMime, quality, onProgress) {
  if (onProgress) onProgress(10);
  const blob = await convertHeicFile(file, targetMime, quality);
  if (onProgress) onProgress(100);
  return blob;
}

/**
 * Generate output filename.
 */
export function outputFilename(originalName, targetExt) {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}.${targetExt}`;
}

/**
 * Trigger file download in the browser.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Create a ZIP from multiple files and download it.
 * @param {Array<{name: string, data: Uint8Array}>} files
 * @param {string} zipName
 */
export async function downloadAsZip(files, zipName) {
  // fflate is loaded as a global from fflate.min.js
  if (typeof fflate === 'undefined') throw new Error('ZIP library not loaded. Please reload the page.');
  const zipData = fflate.zipSync(
    Object.fromEntries(files.map(f => [f.name, f.data])),
    { level: 0 } // images are already compressed, no point re-compressing
  );
  const blob = new Blob([zipData], { type: 'application/zip' });
  downloadBlob(blob, zipName);
}

/**
 * Format file size for display.
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Snap a numeric value to the nearest snap point if within threshold.
 * threshold defaults to ~3% of the total range.
 */
export function snapTo(val, snaps, range) {
  const threshold = range * 0.03;
  for (const s of snaps) {
    if (Math.abs(val - s) <= threshold) return s;
  }
  return val;
}
