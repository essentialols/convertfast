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

/**
 * Detect image format from magic bytes (not file extension).
 * @param {File} file
 * @returns {Promise<{mime: string, ext: string}|null>}
 */
export async function detectFormat(file) {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const fmt of FORMAT_SIGNATURES) {
    for (const [offset, sig] of fmt.offsets) {
      if (buf.length >= offset + sig.length &&
          sig.every((byte, i) => buf[offset + i] === byte)) {
        return { mime: fmt.mime, ext: fmt.ext };
      }
    }
  }
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

/**
 * Convert an image using the Canvas API (for natively-supported formats).
 * @param {File|Blob} file - Source image
 * @param {string} targetMime - e.g. 'image/jpeg', 'image/png'
 * @param {number} quality - 0-1 quality for lossy formats
 * @returns {Promise<Blob>}
 */
export async function convertWithCanvas(file, targetMime, quality) {
  // createImageBitmap with imageOrientation auto-corrects EXIF rotation from iPhone photos
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    validateDimensions(bmp.width, bmp.height);
  } catch (e) {
    bmp.close();
    throw e;
  }
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
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
  if (typeof fflate === 'undefined') throw new Error('ZIP library (fflate) failed to load');
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
