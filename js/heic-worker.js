/**
 * HEIC conversion loader.
 * Lazily loads the heic-to IIFE (with embedded WASM) on first use.
 * Runs on the main thread because heic-to needs Canvas/DOM access.
 */

let heicToFn = null;
let loadPromise = null;

export function loadHeicTo() {
  if (heicToFn) return Promise.resolve(heicToFn);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'wasm/heic/heic-to.iife.js';
    script.onload = () => {
      heicToFn = window.HeicTo;
      resolve(heicToFn);
    };
    script.onerror = () => reject(new Error('Failed to load HEIC decoder'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Convert a HEIC file using heic-to.
 * @param {File|Blob} file
 * @param {string} targetMime - e.g. 'image/jpeg'
 * @param {number} quality - 0-1
 * @returns {Promise<Blob>}
 */
export async function convertHeicFile(file, targetMime, quality) {
  const heicTo = await loadHeicTo();
  return heicTo({ blob: file, type: targetMime, quality });
}
