/**
 * IrisFiles - MOV to MP4 remux engine
 * Repackages MOV container as MP4 by rewriting the ftyp (file type) box.
 * Zero dependencies, near-instant execution.
 *
 * MOV and MP4 are both ISOBMFF containers. The only meaningful difference is
 * the brand identifier in the ftyp box. Changing 'qt  ' to 'isom' tells
 * players "this is MP4" instead of "this is QuickTime." All codec data,
 * track metadata, and media samples remain untouched.
 */

/**
 * Remux a MOV file to MP4 by rewriting the ftyp box brands in-place.
 * @param {File|Blob} file - Source MOV file
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function remuxMovToMp4(file, onProgress) {
  if (onProgress) onProgress(10);

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  if (onProgress) onProgress(40);

  // Find ftyp box (almost always the very first box)
  let found = false;
  let pos = 0;
  while (pos + 8 <= bytes.length && pos < 4096) {
    const size = view.getUint32(pos);
    if (size < 8 || size > bytes.length - pos) break;
    const type = chr4(bytes, pos + 4);

    if (type === 'ftyp') {
      found = true;
      const brand = chr4(bytes, pos + 8);

      // Only rewrite if it's a QuickTime brand
      if (brand === 'qt  ' || brand === 'MSNV' || brand === 'mqt ') {
        // Overwrite major brand to 'isom'
        writeStr4(bytes, pos + 8, 'isom');
      }

      // Also rewrite 'qt  ' in compatible brands list (starts at pos+16)
      const ftypEnd = pos + size;
      for (let cp = pos + 16; cp + 4 <= ftypEnd; cp += 4) {
        if (chr4(bytes, cp) === 'qt  ') {
          writeStr4(bytes, cp, 'isom');
          break;
        }
      }
      break;
    }
    pos += size;
  }

  if (!found) {
    throw new Error('Not a valid MOV file (no file type header found).');
  }

  if (onProgress) onProgress(80);

  const blob = new Blob([buffer], { type: 'video/mp4' });

  if (onProgress) onProgress(100);
  return blob;
}

function chr4(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function writeStr4(bytes, offset, str) {
  bytes[offset]     = str.charCodeAt(0);
  bytes[offset + 1] = str.charCodeAt(1);
  bytes[offset + 2] = str.charCodeAt(2);
  bytes[offset + 3] = str.charCodeAt(3);
}
