/**
 * IrisFiles - Audio conversion engine
 * Decodes audio via Web Audio API, encodes to WAV (native) or MP3 (lamejs, lazy-loaded).
 * For OGG/FLAC/M4A/AAC output, uses FFmpeg.wasm via the shared loader.
 */

import { ensureFFmpeg } from './ffmpeg-shared.js';

const LAMEJS_CDN = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
let lameReady = null; // Promise that resolves when lamejs is loaded

/**
 * Lazy-load lamejs from CDN. Only called when MP3 output is needed.
 * @returns {Promise<void>}
 */
function loadLame() {
  if (lameReady) return lameReady;
  lameReady = new Promise((resolve, reject) => {
    if (typeof lamejs !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = LAMEJS_CDN;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load MP3 encoder from CDN'));
    document.head.appendChild(script);
  });
  return lameReady;
}

/**
 * Convert an audio file to the target format (WAV or MP3 only).
 * @param {File} file - Source audio file (MP3, WAV, OGG, FLAC, M4A, AAC)
 * @param {string} targetFormat - 'wav' or 'mp3'
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function convertAudio(file, targetFormat, onProgress = () => {}, opts = {}) {
  onProgress(0);

  // Read file into ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  onProgress(10);

  // Decode audio data via Web Audio API
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Audio processing is not supported in this browser.');
  const audioCtx = new Ctx();
  let audioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error('Could not decode audio. Format may not be supported by your browser.');
  } finally {
    audioCtx.close();
  }
  onProgress(30);

  if (targetFormat === 'wav') {
    const blob = encodeWav(audioBuffer, onProgress);
    onProgress(100);
    return blob;
  }

  if (targetFormat === 'mp3') {
    await loadLame();
    onProgress(40);
    const blob = await encodeMp3(audioBuffer, onProgress, opts.bitrate || 128);
    onProgress(100);
    return blob;
  }

  throw new Error(`Unsupported output format: ${targetFormat}`);
}

// FFmpeg-based audio format definitions
const AUDIO_FORMATS = {
  ogg:  { ext: 'ogg',  mime: 'audio/ogg',  args: ['-c:a', 'libvorbis', '-q:a', '4'] },
  flac: { ext: 'flac', mime: 'audio/flac', args: ['-c:a', 'flac'] },
  m4a:  { ext: 'm4a',  mime: 'audio/mp4',  args: ['-c:a', 'aac', '-b:a', '128k'] },
  aac:  { ext: 'aac',  mime: 'audio/aac',  args: ['-c:a', 'aac', '-b:a', '128k', '-f', 'adts'] },
};

/**
 * Convert an audio file to OGG, FLAC, M4A, or AAC using FFmpeg.wasm.
 * @param {File} file - Source audio file
 * @param {string} targetFormat - 'ogg', 'flac', 'm4a', or 'aac'
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function convertAudioFFmpeg(file, targetFormat, onProgress = () => {}, opts = {}) {
  const fmt = AUDIO_FORMATS[targetFormat];
  if (!fmt) throw new Error(`Unsupported FFmpeg audio format: ${targetFormat}`);

  onProgress(5);

  const ffmpeg = await ensureFFmpeg(msg => {});

  onProgress(15);

  const inputExt = ((file.name || '').match(/\.(\w+)$/) || [, 'wav'])[1].toLowerCase();
  const inputName = `input.${inputExt}`;
  const outputName = `output.${fmt.ext}`;

  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  onProgress(25);

  const progressHandler = ({ progress }) => {
    const pct = Math.min(90, 25 + Math.round(progress * 65));
    onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  // Build args, applying bitrate override for lossy formats
  let args = [...fmt.args];
  if (opts.bitrate && targetFormat !== 'flac') {
    const baIdx = args.indexOf('-b:a');
    if (baIdx >= 0) {
      args[baIdx + 1] = opts.bitrate + 'k';
    } else {
      const qaIdx = args.indexOf('-q:a');
      if (qaIdx >= 0) args.splice(qaIdx, 2, '-b:a', opts.bitrate + 'k');
    }
  }

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

  onProgress(95);

  const data = await ffmpeg.readFile(outputName);

  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  onProgress(100);
  return new Blob([data.buffer], { type: fmt.mime });
}

/**
 * Encode AudioBuffer to WAV (PCM 16-bit).
 * @param {AudioBuffer} audioBuffer
 * @param {function} onProgress
 * @returns {Blob}
 */
function encodeWav(audioBuffer, onProgress) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                          // fmt chunk size
  view.setUint16(20, 1, true);                            // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, 16, true);                           // bits per sample

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write PCM 16-bit samples
  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    // Report progress from 30% to 100%
    if (i % 100000 === 0) {
      onProgress(30 + Math.round((i / numSamples) * 70));
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Encode AudioBuffer to MP3 using lamejs. Yields to main thread periodically.
 * @param {AudioBuffer} audioBuffer
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
async function encodeMp3(audioBuffer, onProgress, kbps = 128) {
  const numChannels = Math.max(1, Math.min(audioBuffer.numberOfChannels, 2)); // lamejs supports mono/stereo
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
  const chunkSize = 1152;
  const mp3Chunks = [];

  // Get PCM data as Int16 arrays
  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const float32 = audioBuffer.getChannelData(ch);
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    channels.push(int16);
  }

  const totalSamples = channels[0].length;
  let samplesProcessed = 0;

  for (let i = 0; i < totalSamples; i += chunkSize) {
    const end = Math.min(i + chunkSize, totalSamples);
    let mp3buf;

    if (numChannels === 1) {
      mp3buf = encoder.encodeBuffer(channels[0].subarray(i, end));
    } else {
      mp3buf = encoder.encodeBuffer(channels[0].subarray(i, end), channels[1].subarray(i, end));
    }

    if (mp3buf.length > 0) {
      mp3Chunks.push(mp3buf);
    }

    samplesProcessed = end;

    // Report progress from 40% to 98%
    if (i % (chunkSize * 50) === 0) {
      onProgress(40 + Math.round((samplesProcessed / totalSamples) * 58));
      // Yield to main thread to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Flush remaining
  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Chunks.push(flush);
  }

  return new Blob(mp3Chunks, { type: 'audio/mpeg' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
