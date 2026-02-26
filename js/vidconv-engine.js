/**
 * IrisFiles - Video transcoding engine (experimental)
 * Uses FFmpeg.wasm (single-threaded) for client-side video conversion.
 * Lazy-loads ~25MB WASM binary from CDN on first use (~10MB with Brotli).
 * Cached by the browser after first download.
 */

import { ensureFFmpeg } from './ffmpeg-shared.js';

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
  avi: {
    ext: 'avi',
    mime: 'video/x-msvideo',
    args: ['-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'mp3', '-b:a', '128k'],
  },
  mkv: {
    ext: 'mkv',
    mime: 'video/x-matroska',
    args: ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
           '-c:a', 'aac', '-b:a', '128k'],
  },
  mov: {
    ext: 'mov',
    mime: 'video/quicktime',
    args: ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
           '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-f', 'mov'],
  },
};

/**
 * Convert a video file to a target format using FFmpeg.wasm.
 * @param {File} file - Source video file
 * @param {string} targetFormat - 'mp4', 'webm', 'avi', 'mkv', or 'mov'
 * @param {function} onProgress - Progress callback (0-100)
 * @param {function} onStatus - Status message callback (string)
 * @returns {Promise<Blob>}
 */
// CRF offsets for quality levels (added to format default)
const QUALITY_OFFSET = { high: 0, medium: 5, low: 12 };

function applyQualityToArgs(args, quality) {
  if (!quality || quality === 'high') return args;
  const out = [...args];
  const offset = QUALITY_OFFSET[quality] || 0;
  const crfIdx = out.indexOf('-crf');
  if (crfIdx >= 0) out[crfIdx + 1] = String(parseInt(out[crfIdx + 1]) + offset);
  const qvIdx = out.indexOf('-q:v');
  if (qvIdx >= 0) out[qvIdx + 1] = String(parseInt(out[qvIdx + 1]) + offset);
  // For webm, also scale the bitrate cap
  const bvIdx = out.indexOf('-b:v');
  if (bvIdx >= 0) {
    const base = parseInt(out[bvIdx + 1]);
    const scale = quality === 'medium' ? 0.6 : 0.35;
    out[bvIdx + 1] = Math.round(base * scale) + (out[bvIdx + 1].includes('M') ? 'M' : 'k');
  }
  return out;
}

export async function convertVideo(file, targetFormat, onProgress, onStatus, opts = {}) {
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 100MB.`);
  }

  const fmt = FORMATS[targetFormat];
  if (!fmt) throw new Error(`Unsupported target format: ${targetFormat}`);

  if (onProgress) onProgress(5);

  const ffmpeg = await ensureFFmpeg(onStatus);

  if (onProgress) onProgress(15);
  if (onStatus) onStatus('Reading file...');

  const inputExt = ((file.name || '').match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
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

  const args = applyQualityToArgs(fmt.args, opts.quality);
  let exitCode;
  try {
    exitCode = await ffmpeg.exec(['-i', inputName, ...args, '-y', outputName]);
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

/**
 * Convert an animated GIF to a video format using FFmpeg.wasm.
 * @param {File} file - GIF file
 * @param {string} targetFormat - 'mp4', 'webm', 'avi', 'mkv', or 'mov'
 * @param {function} onProgress - Progress callback (0-100)
 * @param {function} onStatus - Status message callback (string)
 * @returns {Promise<Blob>}
 */
export async function gifToVideo(file, targetFormat, onProgress, onStatus, opts = {}) {
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 100MB.`);
  }

  const fmt = FORMATS[targetFormat];
  if (!fmt) throw new Error(`Unsupported target format: ${targetFormat}`);

  if (onProgress) onProgress(5);

  const ffmpeg = await ensureFFmpeg(onStatus);

  if (onProgress) onProgress(15);
  if (onStatus) onStatus('Reading GIF...');

  const inputName = 'input.gif';
  const outputName = `output.${fmt.ext}`;

  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  if (onProgress) onProgress(20);
  if (onStatus) onStatus('Converting GIF to video (this may take a moment)...');

  const progressHandler = ({ progress }) => {
    const pct = Math.min(90, 20 + Math.round(progress * 70));
    if (onProgress) onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  const args = applyQualityToArgs(fmt.args, opts.quality);
  let exitCode;
  try {
    exitCode = await ffmpeg.exec(['-i', inputName, ...args, '-y', outputName]);
  } finally {
    ffmpeg.off('progress', progressHandler);
  }

  if (exitCode !== 0) {
    try { await ffmpeg.deleteFile(inputName); } catch {}
    try { await ffmpeg.deleteFile(outputName); } catch {}
    throw new Error('Conversion failed. The GIF may be corrupted or too complex.');
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

  const inputExt = ((file.name || '').match(/\.(\w+)$/) || [, 'mp4'])[1].toLowerCase();
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
    const timeout = setTimeout(() => { URL.revokeObjectURL(url); resolve(0); }, 5000);
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
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
    const timeout = setTimeout(() => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0, duration: 0 }); }, 5000);
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: isFinite(video.duration) ? video.duration : 0,
      });
    };
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, duration: 0 });
    };
    video.src = url;
  });
}
