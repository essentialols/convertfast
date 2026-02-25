/**
 * IrisFiles - Video metadata read/strip engine
 * Uses mediainfo.js for comprehensive metadata extraction,
 * FFmpeg.wasm (via ffmpeg-shared.js) for lossless metadata stripping.
 */

import { ensureFFmpeg } from './ffmpeg-shared.js';

const MEDIAINFO_BASE = 'https://cdn.jsdelivr.net/npm/mediainfo.js@0.3.7';

let mediaInfoReady = null;

function ensureMediaInfo() {
  if (mediaInfoReady) return mediaInfoReady;
  mediaInfoReady = (async () => {
    const mod = await import(`${MEDIAINFO_BASE}/dist/esm-bundle/index.min.js`);
    const factory = mod.default || mod.MediaInfo || mod;
    return factory({
      format: 'JSON',
      locateFile: (path) => `${MEDIAINFO_BASE}/dist/${path}`,
    });
  })();
  return mediaInfoReady;
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  return m + ':' + String(sec).padStart(2, '0');
}

function formatBitrate(bps) {
  if (!bps) return null;
  const n = Number(bps);
  if (!n || !isFinite(n)) return null;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + ' Mbps';
  if (n >= 1000) return Math.round(n / 1000) + ' kbps';
  return n + ' bps';
}

function channelLabel(count) {
  const n = Number(count);
  if (n === 1) return 'Mono';
  if (n === 2) return 'Stereo';
  if (n === 6) return '5.1';
  if (n === 8) return '7.1';
  return n + ' channels';
}

/**
 * Read comprehensive metadata from a video file using mediainfo.js.
 * Returns grouped metadata: { general, video, audio, tags, _empty }
 */
export async function readVideoMetadata(file) {
  const mi = await ensureMediaInfo();

  const getSize = () => file.size;
  const readChunk = (chunkSize, offset) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target.error) { reject(e.target.error); return; }
        resolve(new Uint8Array(e.target.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
    });
  };

  const rawJson = await mi.analyzeData(getSize, readChunk);
  const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  const tracks = parsed.media?.track || [];

  const gen = tracks.find(t => t['@type'] === 'General') || {};
  const vid = tracks.find(t => t['@type'] === 'Video') || {};
  const aud = tracks.find(t => t['@type'] === 'Audio') || {};

  const result = {
    _empty: false,
    general: {
      'Container': gen.Format || null,
      'File Size': file.size,
      'Duration': formatDuration(Number(gen.Duration)),
      'Overall Bitrate': formatBitrate(gen.OverallBitRate),
      'Creation Date': gen.Encoded_Date || gen.Tagged_Date || null,
      'Encoder': gen.Encoded_Application || gen.Encoded_Library || null,
    },
    video: {
      'Codec': vid.Format ? (vid.Format + (vid.Format_Profile ? ' ' + vid.Format_Profile : '')) : null,
      'Width': vid.Width ? Number(vid.Width) : null,
      'Height': vid.Height ? Number(vid.Height) : null,
      'Frame Rate': vid.FrameRate ? Number(vid.FrameRate).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + ' fps' : null,
      'Bitrate': formatBitrate(vid.BitRate),
      'Bit Depth': vid.BitDepth ? vid.BitDepth + ' bit' : null,
      'Color Space': vid.ColorSpace || null,
      'Chroma': vid.ChromaSubsampling || null,
      'Scan Type': vid.ScanType || null,
      'HDR Format': vid.HDR_Format || null,
    },
    audio: {
      'Codec': aud.Format || null,
      'Sample Rate': aud.SamplingRate ? (Number(aud.SamplingRate) / 1000).toFixed(1) + ' kHz' : null,
      'Channels': aud.Channels ? channelLabel(aud.Channels) : null,
      'Bitrate': formatBitrate(aud.BitRate),
      'Language': aud.Language || null,
    },
    tags: {
      'Title': gen.Title || gen.Movie || null,
      'Artist': gen.Performer || gen.Director || null,
      'Album': gen.Album || null,
      'Comment': gen.Comment || null,
      'Copyright': gen.Copyright || null,
    },
  };

  // Check if all groups empty
  const hasData = Object.entries(result).some(([key, group]) => {
    if (key === '_empty' || typeof group !== 'object') return false;
    return Object.values(group).some(v => v !== null && v !== undefined);
  });
  result._empty = !hasData;

  return result;
}

/**
 * Strip all metadata from a video file using FFmpeg.wasm.
 * Uses copy mode (no re-encoding) for fast, lossless operation.
 * @param {File} file - Source video file
 * @param {function} onStatus - Status message callback
 * @param {function} onProgress - Progress percentage callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function stripVideoMetadata(file, onStatus, onProgress) {
  const ffmpeg = await ensureFFmpeg(onStatus);

  if (onStatus) onStatus('Reading video file...');
  if (onProgress) onProgress(10);

  const data = new Uint8Array(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const inName = 'input.' + ext;
  const outName = 'output.' + ext;

  await ffmpeg.writeFile(inName, data);
  if (onProgress) onProgress(30);

  if (onStatus) onStatus('Stripping metadata...');
  await ffmpeg.exec(['-i', inName, '-map_metadata', '-1', '-c', 'copy', '-y', outName]);
  if (onProgress) onProgress(80);

  const outData = await ffmpeg.readFile(outName);
  if (onProgress) onProgress(90);

  // Cleanup
  await ffmpeg.deleteFile(inName);
  await ffmpeg.deleteFile(outName);

  const mimeMap = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska' };
  const mime = mimeMap[ext] || 'video/mp4';

  if (onProgress) onProgress(100);
  return new Blob([outData.buffer], { type: mime });
}
