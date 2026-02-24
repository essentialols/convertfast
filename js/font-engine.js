/**
 * IrisFiles - Font conversion engine
 * Lazy-loads opentype.js from CDN for TTF/OTF parsing and generation.
 * Uses fflate (window.fflate) for WOFF DEFLATE compression.
 */

const OPENTYPE_CDN = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js';

let opentypeLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}

async function requireOpentype() {
  if (opentypeLoaded) return window.opentype;
  await loadScript(OPENTYPE_CDN);
  if (!window.opentype) throw new Error('opentype.js failed to load');
  opentypeLoaded = true;
  return window.opentype;
}

const MIME_TYPES = {
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
};

/**
 * Convert a font file to the target format.
 * @param {File} file - Source font file (TTF, OTF, or WOFF)
 * @param {string} targetFormat - 'ttf', 'otf', or 'woff'
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function convertFont(file, targetFormat, onProgress) {
  if (onProgress) onProgress(5);

  const opentype = await requireOpentype();
  if (onProgress) onProgress(20);

  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(30);

  // Parse the font. If input is WOFF, opentype.js handles it natively.
  const font = opentype.parse(arrayBuffer);
  if (!font || !font.supported) {
    throw new Error('Could not parse font file. It may be corrupted or unsupported.');
  }
  if (onProgress) onProgress(50);

  // opentype.js download() produces a TTF/OTF ArrayBuffer
  const sfntBuffer = font.download();
  if (onProgress) onProgress(70);

  let resultBuffer;

  if (targetFormat === 'ttf' || targetFormat === 'otf') {
    // opentype.js outputs sfnt (TTF/OTF) directly
    resultBuffer = sfntBuffer;
  } else if (targetFormat === 'woff') {
    resultBuffer = wrapAsWoff(new Uint8Array(sfntBuffer));
  } else {
    throw new Error('Unsupported target format: ' + targetFormat);
  }

  if (onProgress) onProgress(100);

  const mime = MIME_TYPES[targetFormat] || 'application/octet-stream';
  return new Blob([resultBuffer], { type: mime });
}

/**
 * Wrap an sfnt (TTF/OTF) binary as WOFF 1.0.
 * WOFF structure: WOFFHeader + TableDirectory entries + compressed table data
 * @param {Uint8Array} sfnt - Raw sfnt bytes
 * @returns {ArrayBuffer} WOFF binary
 */
function wrapAsWoff(sfnt) {
  const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);

  // Read sfnt header
  const sfntFlavor = view.getUint32(0); // 0x00010000 for TrueType, 'OTTO' for CFF
  const numTables = view.getUint16(4);

  // Read table directory (starts at offset 12 in sfnt)
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const dirOffset = 12 + i * 16;
    const tag = view.getUint32(dirOffset);
    const checksum = view.getUint32(dirOffset + 4);
    const offset = view.getUint32(dirOffset + 8);
    const length = view.getUint32(dirOffset + 12);
    const rawData = sfnt.slice(offset, offset + length);
    tables.push({ tag, checksum, origLength: length, rawData });
  }

  // Compress each table with fflate DEFLATE
  if (typeof fflate === 'undefined') throw new Error('ZIP library not loaded');
  const compressed = tables.map(t => {
    const comp = fflate.deflateSync(t.rawData);
    // Only use compressed version if it is actually smaller
    if (comp.length < t.rawData.length) {
      return { ...t, compData: comp, compLength: comp.length };
    }
    return { ...t, compData: t.rawData, compLength: t.rawData.length };
  });

  // Calculate WOFF total size
  // WOFFHeader: 44 bytes
  // TableDirectory: numTables * 20 bytes
  const headerSize = 44;
  const dirSize = numTables * 20;
  let dataOffset = headerSize + dirSize;

  // Align table data to 4-byte boundaries
  const alignedEntries = compressed.map(t => {
    const off = dataOffset;
    const padded = (t.compLength + 3) & ~3; // 4-byte align
    dataOffset += padded;
    return { ...t, woffOffset: off, paddedLength: padded };
  });

  const totalSize = dataOffset;

  // Build WOFF buffer
  const woff = new ArrayBuffer(totalSize);
  const wv = new DataView(woff);
  const wu = new Uint8Array(woff);

  // WOFF Header (44 bytes)
  wv.setUint32(0, 0x774F4646);          // signature 'wOFF'
  wv.setUint32(4, sfntFlavor);           // flavor (original sfnt type)
  wv.setUint32(8, totalSize);            // total WOFF size
  wv.setUint16(12, numTables);           // numTables
  wv.setUint16(14, 0);                   // reserved
  wv.setUint32(16, sfnt.byteLength);     // totalSfntSize
  // WOFF version (major.minor) - use 1.0
  wv.setUint16(20, 1);                   // majorVersion
  wv.setUint16(22, 0);                   // minorVersion
  wv.setUint32(24, 0);                   // metaOffset
  wv.setUint32(28, 0);                   // metaLength
  wv.setUint32(32, 0);                   // metaOrigLength
  wv.setUint32(36, 0);                   // privOffset
  wv.setUint32(40, 0);                   // privLength

  // Table directory entries (20 bytes each)
  for (let i = 0; i < alignedEntries.length; i++) {
    const t = alignedEntries[i];
    const off = headerSize + i * 20;
    wv.setUint32(off, t.tag);             // tag
    wv.setUint32(off + 4, t.woffOffset);  // offset to compressed data
    wv.setUint32(off + 8, t.compLength);  // compLength
    wv.setUint32(off + 12, t.origLength); // origLength
    wv.setUint32(off + 16, t.checksum);   // origChecksum
  }

  // Write compressed table data
  for (const t of alignedEntries) {
    wu.set(t.compData, t.woffOffset);
  }

  return woff;
}
