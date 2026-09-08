/**
 * IrisFiles - Font conversion engine
 * Lazy-loads opentype.js from CDN for TTF/OTF parsing and generation.
 * Uses fflate (window.fflate) for WOFF zlib compression.
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
const SFNT_TRUETYPE = 0x00010000;
const SFNT_CFF = 0x4f54544f;  // 'OTTO'
const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'

/** Flavour a target extension requires in the underlying sfnt. */
const REQUIRED_FLAVOR = { ttf: SFNT_TRUETYPE, otf: SFNT_CFF };

export async function convertFont(file, targetFormat, onProgress) {
  if (onProgress) onProgress(5);
  if (!MIME_TYPES[targetFormat]) throw new Error('Unsupported target format: ' + targetFormat);

  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(20);

  const source = new Uint8Array(arrayBuffer);
  if (source.byteLength < 12) throw new Error('Could not parse font file. It may be corrupted or unsupported.');
  const signature = new DataView(arrayBuffer).getUint32(0);

  // WOFF is a compressed container around an sfnt, so unwrapping recovers the
  // original bytes exactly. Doing that here keeps every container-only
  // conversion lossless and avoids re-serializing tables we cannot rebuild.
  const sfnt = signature === WOFF_SIGNATURE ? unwrapWoff(source) : source;
  const flavor = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength).getUint32(0);
  if (flavor !== SFNT_TRUETYPE && flavor !== SFNT_CFF) {
    throw new Error('Could not parse font file. It may be corrupted or unsupported.');
  }
  if (onProgress) onProgress(45);

  if (targetFormat === 'woff') {
    if (onProgress) onProgress(100);
    return new Blob([wrapAsWoff(sfnt)], { type: MIME_TYPES.woff });
  }

  // ttf and otf name different outline formats, so they are only a container
  // operation when the sfnt already carries the matching outlines.
  if (flavor === REQUIRED_FLAVOR[targetFormat]) {
    if (onProgress) onProgress(100);
    return new Blob([sfnt.slice()], { type: MIME_TYPES[targetFormat] });
  }

  const converted = await convertOutlines(arrayBuffer, targetFormat, onProgress);
  if (onProgress) onProgress(100);
  return new Blob([converted], { type: MIME_TYPES[targetFormat] });
}

/**
 * Rebuild outlines in the other format via opentype.js. This is a genuine
 * re-encode, not a rewrap, and opentype.js cannot re-serialize every table it
 * can read, so an unsupported font is reported rather than half-written.
 */
async function convertOutlines(arrayBuffer, targetFormat, onProgress) {
  const opentype = await requireOpentype();
  if (onProgress) onProgress(55);

  const font = opentype.parse(arrayBuffer);
  if (!font || !font.supported) {
    throw new Error('Could not parse font file. It may be corrupted or unsupported.');
  }

  let sfntBuffer;
  try {
    // Serialize without triggering opentype.js's browser-download side effect.
    sfntBuffer = font.toArrayBuffer();
  } catch (err) {
    throw new Error(
      `This font uses typography features the converter cannot rebuild (${err.message.replace(/\.$/, '')}). ` +
      'Converting between TTF and OTF outlines needs to rewrite them; no file was created. ' +
      'WOFF conversion preserves this font exactly.'
    );
  }
  if (onProgress) onProgress(85);

  const rebuiltFlavor = new DataView(sfntBuffer).getUint32(0);
  if (rebuiltFlavor !== REQUIRED_FLAVOR[targetFormat]) {
    throw new Error(
      `${targetFormat.toUpperCase()} output is not supported for this conversion yet. ` +
      'Try WOFF instead; no file was created.'
    );
  }
  return sfntBuffer;
}

/**
 * Expand a WOFF 1.0 container back into the sfnt it was built from.
 * @param {Uint8Array} woff
 * @returns {Uint8Array} raw sfnt bytes
 */
function unwrapWoff(woff) {
  if (typeof fflate === 'undefined') throw new Error('Font library not loaded. Please reload the page.');
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);
  if (!numTables || 44 + numTables * 20 > woff.byteLength) {
    throw new Error('Could not read this WOFF file: its table directory is damaged.');
  }

  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const dir = 44 + i * 20;
    const tag = view.getUint32(dir);
    const offset = view.getUint32(dir + 4);
    const compLength = view.getUint32(dir + 8);
    const origLength = view.getUint32(dir + 12);
    const checksum = view.getUint32(dir + 16);
    if (offset + compLength > woff.byteLength) {
      throw new Error('Could not read this WOFF file: a table extends past the end of the file.');
    }
    const stored = woff.subarray(offset, offset + compLength);
    // Per WOFF 1.0 a table is stored uncompressed when compLength equals origLength.
    const data = compLength === origLength ? stored.slice() : fflate.unzlibSync(stored);
    if (data.length !== origLength) {
      throw new Error('Could not read this WOFF file: a table did not decompress to its declared size.');
    }
    tables.push({ tag, checksum, data });
  }

  tables.sort((a, b) => a.tag - b.tag);

  const dirSize = numTables * 16;
  let total = 12 + dirSize;
  for (const t of tables) total += (t.data.length + 3) & ~3;

  const sfnt = new Uint8Array(total);
  const out = new DataView(sfnt.buffer);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 16 * 2 ** entrySelector;
  out.setUint32(0, flavor);
  out.setUint16(4, numTables);
  out.setUint16(6, searchRange);
  out.setUint16(8, entrySelector);
  out.setUint16(10, numTables * 16 - searchRange);

  let dataOffset = 12 + dirSize;
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const dir = 12 + i * 16;
    out.setUint32(dir, t.tag);
    out.setUint32(dir + 4, t.checksum);
    out.setUint32(dir + 8, dataOffset);
    out.setUint32(dir + 12, t.data.length);
    sfnt.set(t.data, dataOffset);
    dataOffset += (t.data.length + 3) & ~3;
  }

  return sfnt;
}

/**
 * Wrap an sfnt (TTF/OTF) binary as WOFF 1.0.
 * WOFF structure: WOFFHeader + TableDirectory entries + zlib-compressed table data
 * @param {Uint8Array} sfnt - Raw sfnt bytes
 * @returns {ArrayBuffer} WOFF binary
 */
function wrapAsWoff(sfnt) {
  if (typeof fflate === 'undefined') throw new Error('Font library not loaded. Please reload the page.');
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

  // WOFF 1.0 requires zlib-wrapped table compression, not raw DEFLATE streams.
  const compressed = tables.map(t => {
    const comp = fflate.zlibSync(t.rawData);
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
