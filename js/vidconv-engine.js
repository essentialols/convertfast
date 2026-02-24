/**
 * IrisFiles - Video transcoding engine (experimental)
 * Uses FFmpeg.wasm (single-threaded) for client-side video conversion.
 * Lazy-loads ~25MB WASM binary from CDN on first use (~10MB with Brotli).
 * Cached by the browser after first download.
 */

let ffmpegInstance = null;
let loadingPromise = null;
const CDN = 'https://cdn.jsdelivr.net/npm';

// Guardrails
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_DURATION = 600; // 10 minutes

const FORMATS = {
  mp4: {
    ext: 'mp4',
    mime: 'video/mp4',
    args: ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
           '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'],
  },
  webm: {
    ext: 'webm',
    mime: 'video/webm',
    args: ['-c:v', 'libvpx', '-crf', '30', '-b:v', '1M',
           '-c:a', 'libvorbis', '-q:a', '4'],
  },
};

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

async function ensureFFmpeg(onStatus) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (onStatus) onStatus('Loading video converter...');

    await loadScript(`${CDN}/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js`);

    const { FFmpeg } = window.FFmpegWASM;
    const ffmpeg = new FFmpeg();

    if (onStatus) onStatus('Downloading video codec (~10MB compressed, cached after first use)...');

    // Use direct CDN URLs (no blob URLs needed, avoids CSP issues)
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
    loadingPromise = null; // Allow retry on failure
    throw e;
  }
}

/**
 * Convert a video file to a target format using FFmpeg.wasm.
 * @param {File} file - Source video file
 * @param {string} targetFormat - 'mp4' or 'webm'
 * @param {function} onProgress - Progress callback (0-100)
 * @param {function} onStatus - Status message callback (string)
 * @returns {Promise<Blob>}
 */
export async function convertVideo(file, targetFormat, onProgress, onStatus) {
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 100MB.`);
  }

  const fmt = FORMATS[targetFormat];
  if (!fmt) throw new Error(`Unsupported target format: ${targetFormat}`);

  if (onProgress) onProgress(5);

  const ffmpeg = await ensureFFmpeg(onStatus);

  if (onProgress) onProgress(15);
  if (onStatus) onStatus('Reading file...');

  const inputExt = (file.name.match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
  const inputName = `input.${inputExt}`;
  const outputName = `output.${fmt.ext}`;

  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  if (onProgress) onProgress(20);
  if (onStatus) onStatus('Converting (this may take a while)...');

  const progressHandler = ({ progress }) => {
    const pct = Math.min(90, 20 + Math.round(progress * 70));
    if (onProgress) onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  let exitCode;
  try {
    exitCode = await ffmpeg.exec(['-i', inputName, ...fmt.args, '-y', outputName]);
  } finally {
    ffmpeg.off('progress', progressHandler);
  }

  if (exitCode !== 0) {
    try { await ffmpeg.deleteFile(inputName); } catch {}
    try { await ffmpeg.deleteFile(outputName); } catch {}
    throw new Error('Conversion failed. The file may be corrupted or use an unsupported codec.');
  }

  if (onProgress) onProgress(95);
  if (onStatus) onStatus('Preparing download...');

  const data = await ffmpeg.readFile(outputName);

  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  if (onProgress) onProgress(100);
  return new Blob([data.buffer], { type: fmt.mime });
}

const CRF = { high: '23', medium: '28', low: '35' };
const HEIGHTS = { '1080': 1080, '720': 720, '480': 480 };

/**
 * Compress a video by re-encoding with adjustable quality and optional downscale.
 * Output is always MP4 (H.264 + AAC).
 * @param {File} file - Source video
 * @param {object} opts - { quality: 'high'|'medium'|'low', maxHeight: 0|1080|720|480 }
 * @param {function} onProgress - Progress callback (0-100)
 * @param {function} onStatus - Status message callback
 * @returns {Promise<Blob>}
 */
export async function compressVideo(file, opts, onProgress, onStatus) {
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 100MB.`);
  }

  if (onProgress) onProgress(5);

  const ffmpeg = await ensureFFmpeg(onStatus);

  if (onProgress) onProgress(15);
  if (onStatus) onStatus('Reading file...');

  const inputExt = (file.name.match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
  const inputName = `input.${inputExt}`;
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  if (onProgress) onProgress(20);
  if (onStatus) onStatus('Compressing (this may take a while)...');

  const crf = CRF[opts.quality] || '28';
  const args = ['-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', crf,
                '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'];

  // Add scale filter if downscaling requested and source is larger
  if (opts.maxHeight > 0) {
    const meta = await getVideoMetadata(file);
    if (meta.height > opts.maxHeight) {
      args.push('-vf', `scale=-2:${opts.maxHeight}`);
    }
  }

  args.push('-y', outputName);

  const progressHandler = ({ progress }) => {
    const pct = Math.min(90, 20 + Math.round(progress * 70));
    if (onProgress) onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  let exitCode;
  try {
    exitCode = await ffmpeg.exec(args);
  } finally {
    ffmpeg.off('progress', progressHandler);
  }

  if (exitCode !== 0) {
    try { await ffmpeg.deleteFile(inputName); } catch {}
    try { await ffmpeg.deleteFile(outputName); } catch {}
    throw new Error('Compression failed. The file may be corrupted or use an unsupported codec.');
  }

  if (onProgress) onProgress(95);
  if (onStatus) onStatus('Preparing download...');

  const data = await ffmpeg.readFile(outputName);

  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  if (onProgress) onProgress(100);
  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Get video duration using HTML video element (fast, no WASM needed).
 * Returns 0 if duration cannot be determined.
 * @param {File} file
 * @returns {Promise<number>} Duration in seconds
 */
export function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

/**
 * Get video dimensions and duration using HTML video element.
 * @param {File} file
 * @returns {Promise<{width: number, height: number, duration: number}>}
 */
export function getVideoMetadata(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: isFinite(video.duration) ? video.duration : 0,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, duration: 0 });
    };
  });
}
