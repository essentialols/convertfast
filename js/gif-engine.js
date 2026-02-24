/**
 * IrisFiles - Video to GIF engine
 * Stream-encodes frames one at a time. Peak memory: ~2 frames regardless of video length.
 * Uses frame deduplication and global palette for efficiency on low-resource devices.
 */

// Device-adaptive defaults
const MEM = navigator.deviceMemory || 4;
const DEFAULT_MAX_WIDTH = MEM <= 2 ? 320 : MEM <= 4 ? 480 : 640;
const DEFAULT_FPS = MEM <= 2 ? 8 : MEM <= 4 ? 10 : 12;
const DEFAULT_MAX_DURATION = 60; // seconds

// Frame dedup: compare sampled pixels between consecutive frames
const SAMPLE_GRID = 16; // 16x16 = 256 sample points
const DEDUP_THRESHOLD = 0.02; // skip frame if <2% pixels changed

/**
 * Convert a video file to GIF.
 * @param {File} file - Video file
 * @param {object} opts - { maxWidth, fps, start, end, onProgress }
 * @returns {Promise<Blob>} GIF blob
 */
export async function videoToGif(file, opts = {}) {
  const maxWidth = opts.maxWidth || DEFAULT_MAX_WIDTH;
  const fps = opts.fps || DEFAULT_FPS;
  const onProgress = opts.onProgress || (() => {});

  // Load video
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error('Cannot decode video. Format may not be supported by your browser.'));
    video.src = url;
  });

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    throw new Error('Could not determine video duration.');
  }

  const start = Math.max(0, opts.start || 0);
  const end = Math.min(duration, opts.end || Math.min(duration, DEFAULT_MAX_DURATION));
  const clipDuration = end - start;

  if (clipDuration <= 0) throw new Error('Invalid time range.');

  // Compute output dimensions (maintain aspect ratio)
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);

  // Canvas for frame capture
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Step 1: Sample frames for global palette
  onProgress(0, 'Analyzing colors...');
  const sampleCount = Math.min(8, Math.ceil(clipDuration * fps));
  const sampleInterval = clipDuration / sampleCount;
  const samplePixels = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = start + i * sampleInterval;
    await seekTo(video, t);
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    // Sample evenly spaced pixels for palette
    const step = Math.max(1, Math.floor(data.length / 4 / 512));
    for (let j = 0; j < data.length; j += step * 4) {
      samplePixels.push(data[j], data[j + 1], data[j + 2]);
    }
  }

  if (typeof gifenc === 'undefined') throw new Error('GIF library not loaded');
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const palette = quantize(new Uint8Array(samplePixels), 256);

  // Step 2: Stream-encode frames
  const gif = GIFEncoder();
  const totalFrames = Math.ceil(clipDuration * fps);
  const frameDelay = Math.round(1000 / fps);
  let prevSamples = null;
  let encodedFrames = 0;
  let skippedFrames = 0;
  let prevDelay = frameDelay;

  for (let i = 0; i < totalFrames; i++) {
    const t = start + i / fps;
    if (t > end) break;

    await seekTo(video, t);
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const { data } = imageData;

    // Frame deduplication: sample grid of pixels
    const samples = sampleGridPixels(data, w, h);
    if (prevSamples && pixelDiffBelow(prevSamples, samples, DEDUP_THRESHOLD)) {
      // Frame is nearly identical, extend previous frame's delay
      skippedFrames++;
      prevDelay += frameDelay;
      onProgress(Math.round((i / totalFrames) * 100), `Encoding... (${encodedFrames} frames, ${skippedFrames} skipped)`);
      continue;
    }
    prevSamples = samples;

    // Apply global palette and write frame
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay: prevDelay, dispose: 0 });
    prevDelay = frameDelay;
    encodedFrames++;

    onProgress(Math.round((i / totalFrames) * 100), `Encoding... (${encodedFrames} frames, ${skippedFrames} skipped)`);

    // Yield to main thread every 5 frames to keep UI responsive
    if (i % 5 === 0) await yieldThread();
  }

  gif.finish();
  URL.revokeObjectURL(url);

  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  onProgress(100, `Done: ${encodedFrames} frames (${skippedFrames} duplicates skipped)`);
  return blob;
}

function seekTo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    video.onseeked = () => resolve();
    video.currentTime = time;
  });
}

function sampleGridPixels(data, w, h) {
  const samples = new Uint8Array(SAMPLE_GRID * SAMPLE_GRID * 3);
  let idx = 0;
  for (let gy = 0; gy < SAMPLE_GRID; gy++) {
    const y = Math.floor((gy / SAMPLE_GRID) * h);
    for (let gx = 0; gx < SAMPLE_GRID; gx++) {
      const x = Math.floor((gx / SAMPLE_GRID) * w);
      const pi = (y * w + x) * 4;
      samples[idx++] = data[pi];
      samples[idx++] = data[pi + 1];
      samples[idx++] = data[pi + 2];
    }
  }
  return samples;
}

function pixelDiffBelow(a, b, threshold) {
  let diff = 0;
  const total = a.length / 3;
  for (let i = 0; i < a.length; i += 3) {
    const dr = Math.abs(a[i] - b[i]);
    const dg = Math.abs(a[i + 1] - b[i + 1]);
    const db = Math.abs(a[i + 2] - b[i + 2]);
    if (dr + dg + db > 30) diff++;
  }
  return (diff / total) < threshold;
}

function yieldThread() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export { DEFAULT_MAX_WIDTH, DEFAULT_FPS, DEFAULT_MAX_DURATION };
