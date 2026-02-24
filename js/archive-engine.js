/**
 * IrisFiles - Archive engine
 * ZIP extraction and creation using fflate (window.fflate from js/fflate.min.js).
 */

/**
 * Extract all files from a ZIP archive.
 * @param {File} file - ZIP file
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Array<{name: string, blob: Blob, size: number}>>}
 */
export async function extractZip(file, onProgress) {
  if (onProgress) onProgress(10);
  const buffer = await file.arrayBuffer();
  if (onProgress) onProgress(30);

  if (typeof fflate === 'undefined') throw new Error('ZIP library not loaded');
  const unzipped = fflate.unzipSync(new Uint8Array(buffer));
  if (onProgress) onProgress(80);

  const entries = [];
  for (const [name, data] of Object.entries(unzipped)) {
    // Skip directory entries (they end with / and have zero length)
    if (name.endsWith('/') && data.length === 0) continue;
    entries.push({
      name,
      blob: new Blob([data]),
      size: data.length,
    });
  }

  if (onProgress) onProgress(100);
  return entries;
}

/**
 * Create a ZIP archive from multiple files.
 * @param {Array<{name: string, blob: Blob}>} files
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function createZip(files, onProgress) {
  const zipInput = {};

  for (let i = 0; i < files.length; i++) {
    const buffer = await files[i].blob.arrayBuffer();
    zipInput[files[i].name] = new Uint8Array(buffer);
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 60));
  }

  if (typeof fflate === 'undefined') throw new Error('ZIP library not loaded');
  const zipped = fflate.zipSync(zipInput);
  if (onProgress) onProgress(90);

  const blob = new Blob([zipped], { type: 'application/zip' });
  if (onProgress) onProgress(100);
  return blob;
}

/**
 * List files inside a ZIP without keeping extracted data.
 * fflate has no list-only mode, so this does a full unzip and returns metadata.
 * @param {File} file - ZIP file
 * @returns {Promise<Array<{name: string, compressedSize: number, uncompressedSize: number}>>}
 */
export async function zipToFileList(file) {
  const buffer = await file.arrayBuffer();
  const raw = new Uint8Array(buffer);
  if (typeof fflate === 'undefined') throw new Error('ZIP library not loaded');
  const unzipped = fflate.unzipSync(raw);

  const entries = [];
  for (const [name, data] of Object.entries(unzipped)) {
    if (name.endsWith('/') && data.length === 0) continue;
    entries.push({
      name,
      compressedSize: 0, // fflate doesn't expose per-entry compressed sizes
      uncompressedSize: data.length,
    });
  }
  return entries;
}
