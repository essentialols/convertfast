/**
 * HEIC conversion loader.
 * Lazily loads the heic-to IIFE (with embedded WASM) on first use.
 * Primary: jsDelivr CDN (free, unlimited bandwidth, not counted against Vercel).
 * Fallback: local copy in wasm/heic/.
 * Runs on the main thread because heic-to needs Canvas/DOM access.
 */

const CDN_URL = 'https://cdn.jsdelivr.net/npm/heic-to@1.4.2/dist/iife/heic-to.js';
const LOCAL_URL = 'wasm/heic/heic-to.iife.js';

let heicToFn = null;
let loadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(script);
  });
}

export function loadHeicTo() {
  if (heicToFn) return Promise.resolve(heicToFn);
  if (loadPromise) return loadPromise;

  loadPromise = loadScript(CDN_URL)
    .catch(() => loadScript(LOCAL_URL))
    .then(() => {
      heicToFn = window.HeicTo;
      if (!heicToFn) throw new Error('HEIC decoder not found after loading');
      return heicToFn;
    })
    .catch((err) => {
      loadPromise = null; // allow retry
      throw err;
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
