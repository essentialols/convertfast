/**
 * IrisFiles - Shared FFmpeg.wasm loader
 * Single instance reused by video and audio engines.
 * Lazy-loads ~25MB WASM binary from CDN on first use (~10MB with Brotli).
 */

let ffmpegInstance = null;
let loadingPromise = null;
const CDN = 'https://cdn.jsdelivr.net/npm';

async function loadScript(url) {
  if (document.querySelector(`script[src="${url}"]`)) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load video converter. Check your internet connection.'));
    document.head.appendChild(s);
  });
}

/**
 * Ensure FFmpeg.wasm is loaded and ready. Returns the shared instance.
 * @param {function} onStatus - Status message callback
 * @returns {Promise<FFmpeg>}
 */
export async function ensureFFmpeg(onStatus) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (onStatus) onStatus('Loading video converter...');

    await loadScript(`${CDN}/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js`);

    if (!window.FFmpegWASM) throw new Error('FFmpeg library failed to initialize. Please reload the page.');
    const { FFmpeg } = window.FFmpegWASM;
    const ffmpeg = new FFmpeg();

    if (onStatus) onStatus('Downloading codec (~10MB compressed, cached after first use)...');

    await ffmpeg.load({
      coreURL: `${CDN}/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js`,
      wasmURL: `${CDN}/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm`,
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadingPromise;
  } catch (e) {
    loadingPromise = null;
    throw e;
  }
}
