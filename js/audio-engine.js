/**
 * ConvertFast - Audio conversion engine
 * Decodes audio via Web Audio API, encodes to WAV (native) or MP3 (lamejs, lazy-loaded).
 */

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
 * Convert an audio file to the target format.
 * @param {File} file - Source audio file (MP3, WAV, OGG, FLAC, M4A, AAC)
 * @param {string} targetFormat - 'wav' or 'mp3'
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function convertAudio(file, targetFormat, onProgress = () => {}) {
  onProgress(0);

  // Read file into ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  onProgress(10);

  // Decode audio data via Web Audio API
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
    const blob = await encodeMp3(audioBuffer, onProgress);
    onProgress(100);
    return blob;
  }

  throw new Error(`Unsupported output format: ${targetFormat}`);
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
async function encodeMp3(audioBuffer, onProgress) {
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2); // lamejs supports mono/stereo
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128;
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
