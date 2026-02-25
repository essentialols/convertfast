/**
 * IrisFiles - Document/ebook conversion engine
 * Handles EPUB, RTF, DOCX -> text/PDF conversions.
 * Uses fflate (global) for ZIP, jsPDF (lazy CDN) for PDF output.
 */

const JSPDF_CDN = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
let jspdfLoaded = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}

async function getJsPDF() {
  if (jspdfLoaded) return jspdfLoaded;
  await loadScript(JSPDF_CDN);
  jspdfLoaded = window.jspdf;
  if (!jspdfLoaded) throw new Error('jsPDF not found after loading');
  return jspdfLoaded;
}

/** Render plain text to a PDF blob using jsPDF. */
async function textToPdfBlob(text, onProgress) {
  const { jsPDF } = await getJsPDF();
  if (onProgress) onProgress(60);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usable = pageWidth - margin * 2;
  const lineHeight = 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  const lines = doc.splitTextToSize(text, usable);
  let y = margin;

  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines[i], margin, y);
    y += lineHeight;
  }

  if (onProgress) onProgress(90);
  return doc.output('blob');
}

// --------------- EPUB ---------------

/** Parse EPUB (ZIP) and extract chapter text in spine order. */
async function extractEpubText(file, onProgress) {
  if (onProgress) onProgress(10);
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = fflate.unzipSync(buf);
  if (onProgress) onProgress(20);

  // Find the .opf file (package document)
  let opfPath = null;
  let opfData = null;

  // First check META-INF/container.xml for the rootfile path
  const containerKey = Object.keys(zip).find(k => k.toLowerCase() === 'meta-inf/container.xml');
  if (containerKey) {
    const containerXml = new TextDecoder().decode(zip[containerKey]);
    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    if (rootfile) {
      opfPath = rootfile.getAttribute('full-path');
    }
  }

  // Fallback: find any .opf file
  if (!opfPath) {
    opfPath = Object.keys(zip).find(k => k.endsWith('.opf'));
  }

  if (opfPath && zip[opfPath]) {
    opfData = new TextDecoder().decode(zip[opfPath]);
  }

  // Determine base directory of OPF
  const opfDir = opfPath ? opfPath.replace(/[^/]*$/, '') : '';

  // Parse OPF to get spine order
  let orderedFiles = [];
  if (opfData) {
    const opfDoc = new DOMParser().parseFromString(opfData, 'application/xml');

    // Build manifest id -> href map
    const manifest = {};
    opfDoc.querySelectorAll('manifest > item').forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type') || '';
      if (id && href) manifest[id] = { href, mediaType };
    });

    // Get spine order
    opfDoc.querySelectorAll('spine > itemref').forEach(ref => {
      const idref = ref.getAttribute('idref');
      if (idref && manifest[idref]) {
        const entry = manifest[idref];
        if (entry.mediaType.includes('html') || entry.mediaType.includes('xml') ||
            entry.href.match(/\.(x?html?|xml)$/i)) {
          orderedFiles.push(opfDir + entry.href);
        }
      }
    });
  }

  // Fallback: if no spine, grab all html/xhtml files sorted by name
  if (orderedFiles.length === 0) {
    orderedFiles = Object.keys(zip)
      .filter(k => k.match(/\.(x?html?|xml)$/i) && !k.toLowerCase().includes('meta-inf'))
      .sort();
  }

  if (onProgress) onProgress(30);

  // Extract text from each content file
  const chapters = [];
  for (let i = 0; i < orderedFiles.length; i++) {
    const path = orderedFiles[i];
    // Try exact match first, then try decoding URI components
    let data = zip[path];
    if (!data) {
      const decoded = decodeURIComponent(path);
      data = zip[decoded];
    }
    if (!data) continue;

    const html = new TextDecoder().decode(data);
    const doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');
    const body = doc.body || doc.documentElement;
    const text = (body.textContent || '').trim();
    if (text) chapters.push(text);

    if (onProgress) onProgress(30 + Math.round((i / orderedFiles.length) * 40));
  }

  return chapters.join('\n\n');
}

export async function epubToText(file, onProgress) {
  const text = await extractEpubText(file, onProgress);
  if (onProgress) onProgress(100);
  return new Blob([text], { type: 'text/plain' });
}

export async function epubToPdf(file, onProgress) {
  const text = await extractEpubText(file, onProgress);
  if (onProgress) onProgress(50);
  const blob = await textToPdfBlob(text, onProgress);
  if (onProgress) onProgress(100);
  return blob;
}

// --------------- RTF ---------------

/** Parse RTF content and extract plain text. */
function parseRtf(rtfString) {
  let text = '';
  let depth = 0;
  let skipGroup = 0; // depth at which we started skipping
  let i = 0;
  const len = rtfString.length;

  // Groups to skip entirely (metadata, headers, footers, etc.)
  const skipGroups = ['fonttbl', 'colortbl', 'stylesheet', 'info', 'header', 'footer',
                      'headerl', 'headerr', 'headerf', 'footerl', 'footerr', 'footerf',
                      'pict', 'object', 'fldinst', '*'];

  while (i < len) {
    const ch = rtfString[i];

    if (ch === '{') {
      depth++;
      i++;
      // Check if the group starts with a skip keyword
      if (rtfString[i] === '\\') {
        let word = '';
        let j = i + 1;
        while (j < len && /[a-zA-Z*]/.test(rtfString[j])) {
          word += rtfString[j];
          j++;
        }
        if (skipGroups.includes(word) && skipGroup === 0) {
          skipGroup = depth;
        }
      }
      continue;
    }

    if (ch === '}') {
      if (skipGroup > 0 && depth === skipGroup) {
        skipGroup = 0;
      }
      depth--;
      i++;
      continue;
    }

    if (skipGroup > 0) {
      i++;
      continue;
    }

    if (ch === '\\') {
      i++;
      if (i >= len) break;

      // Special characters
      if (rtfString[i] === '\\') { text += '\\'; i++; continue; }
      if (rtfString[i] === '{') { text += '{'; i++; continue; }
      if (rtfString[i] === '}') { text += '}'; i++; continue; }
      if (rtfString[i] === '~') { text += '\u00A0'; i++; continue; } // non-breaking space
      if (rtfString[i] === '-') { text += '\u00AD'; i++; continue; } // soft hyphen
      if (rtfString[i] === '_') { text += '\u2011'; i++; continue; } // non-breaking hyphen

      // Hex escape \'xx
      if (rtfString[i] === '\'') {
        const hex = rtfString.substring(i + 1, i + 3);
        const code = parseInt(hex, 16);
        if (!isNaN(code)) text += String.fromCharCode(code);
        i += 3;
        continue;
      }

      // Control word
      let word = '';
      while (i < len && /[a-zA-Z]/.test(rtfString[i])) {
        word += rtfString[i];
        i++;
      }

      // Optional numeric parameter
      let param = '';
      if (i < len && (rtfString[i] === '-' || /[0-9]/.test(rtfString[i]))) {
        if (rtfString[i] === '-') { param += '-'; i++; }
        while (i < len && /[0-9]/.test(rtfString[i])) {
          param += rtfString[i];
          i++;
        }
      }

      // Consume optional trailing space
      if (i < len && rtfString[i] === ' ') i++;

      // Handle known control words
      if (word === 'par' || word === 'line') {
        text += '\n';
      } else if (word === 'tab') {
        text += '\t';
      } else if (word === 'u') {
        // Unicode escape: \uN followed by a replacement char to skip
        const code = parseInt(param, 10);
        if (!isNaN(code)) {
          text += String.fromCharCode(code < 0 ? code + 65536 : code);
        }
        // Skip the replacement character (usually ?)
        if (i < len && rtfString[i] !== '\\' && rtfString[i] !== '{' && rtfString[i] !== '}') {
          i++;
        }
      } else if (word === 'lquote') {
        text += '\u2018';
      } else if (word === 'rquote') {
        text += '\u2019';
      } else if (word === 'ldblquote') {
        text += '\u201C';
      } else if (word === 'rdblquote') {
        text += '\u201D';
      } else if (word === 'bullet') {
        text += '\u2022';
      } else if (word === 'endash') {
        text += '\u2013';
      } else if (word === 'emdash') {
        text += '\u2014';
      }
      // All other control words are ignored
      continue;
    }

    // Plain text character
    if (ch === '\r' || ch === '\n') {
      // RTF uses \par for newlines; CR/LF in source are insignificant
      i++;
      continue;
    }

    text += ch;
    i++;
  }

  // Clean up: collapse multiple blank lines
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export async function rtfToText(file, onProgress) {
  if (onProgress) onProgress(10);
  const rtfString = await file.text();
  if (onProgress) onProgress(30);
  const text = parseRtf(rtfString);
  if (onProgress) onProgress(100);
  return new Blob([text], { type: 'text/plain' });
}

export async function rtfToPdf(file, onProgress) {
  if (onProgress) onProgress(10);
  const rtfString = await file.text();
  if (onProgress) onProgress(20);
  const text = parseRtf(rtfString);
  if (onProgress) onProgress(40);
  const blob = await textToPdfBlob(text, onProgress);
  if (onProgress) onProgress(100);
  return blob;
}

// --------------- DOCX ---------------

/** Parse DOCX (ZIP) and extract text from word/document.xml. */
async function extractDocxText(file, onProgress) {
  if (onProgress) onProgress(10);
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = fflate.unzipSync(buf);
  if (onProgress) onProgress(30);

  // Find word/document.xml
  const docKey = Object.keys(zip).find(k =>
    k.toLowerCase() === 'word/document.xml'
  );
  if (!docKey || !zip[docKey]) {
    throw new Error('Not a valid DOCX file (word/document.xml not found).');
  }

  const xml = new TextDecoder().decode(zip[docKey]);
  if (onProgress) onProgress(40);

  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  // Namespace-aware: w:p -> paragraphs, w:r -> runs, w:t -> text
  // DOMParser may or may not resolve namespaces; handle both cases
  const nsW = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  let paragraphs = doc.getElementsByTagNameNS(nsW, 'p');

  // Fallback for parsers that don't resolve the namespace
  if (paragraphs.length === 0) {
    paragraphs = doc.querySelectorAll('p');
  }

  const lines = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // Get all text nodes within w:t elements
    let texts = p.getElementsByTagNameNS(nsW, 't');
    if (texts.length === 0) {
      texts = p.querySelectorAll('t');
    }

    const parts = [];
    for (let j = 0; j < texts.length; j++) {
      const t = texts[j].textContent;
      if (t) parts.push(t);
    }

    // Check for w:tab elements (insert tab character)
    let lineText = '';
    const children = p.childNodes;
    for (let c = 0; c < children.length; c++) {
      const run = children[c];
      if (run.nodeType !== 1) continue; // element nodes only
      const localName = run.localName || run.nodeName.replace(/^.*:/, '');
      if (localName === 'r') {
        // Process run children
        for (let rc = 0; rc < run.childNodes.length; rc++) {
          const rChild = run.childNodes[rc];
          if (rChild.nodeType !== 1) continue;
          const rName = rChild.localName || rChild.nodeName.replace(/^.*:/, '');
          if (rName === 't') {
            lineText += rChild.textContent || '';
          } else if (rName === 'tab') {
            lineText += '\t';
          } else if (rName === 'br') {
            lineText += '\n';
          }
        }
      } else if (localName === 'hyperlink') {
        // Extract text from hyperlinks
        let hTexts = run.getElementsByTagNameNS(nsW, 't');
        if (hTexts.length === 0) hTexts = run.querySelectorAll('t');
        for (let h = 0; h < hTexts.length; h++) {
          lineText += hTexts[h].textContent || '';
        }
      }
    }

    // Fallback: if run-level extraction got nothing, use concatenated text
    if (!lineText && parts.length > 0) {
      lineText = parts.join('');
    }

    lines.push(lineText);

    if (onProgress) onProgress(40 + Math.round((i / paragraphs.length) * 30));
  }

  return lines.join('\n');
}

// --------------- MOBI ---------------

/**
 * PalmDOC LZ77 decompression.
 * Each record is compressed with a PalmDOC variant of LZ77.
 */
function palmDocDecompress(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const byte = data[i++];
    if (byte === 0) {
      // Literal null
      out.push(0);
    } else if (byte >= 1 && byte <= 8) {
      // Copy next 1-8 bytes literally
      for (let j = 0; j < byte && i < data.length; j++) {
        out.push(data[i++]);
      }
    } else if (byte >= 0x80) {
      // LZ77 back-reference: 2-byte token
      if (i >= data.length) break;
      const next = data[i++];
      const dist = ((byte << 8 | next) >> 3) & 0x7FF;
      const len = (next & 0x07) + 3;
      const pos = out.length;
      for (let j = 0; j < len; j++) {
        out.push(out[pos - dist + j] || 0);
      }
    } else if (byte >= 0x09 && byte <= 0x7F) {
      // Literal byte
      out.push(byte);
    } else {
      // byte === 0x01..0x08 handled above; space + char encoding
      // 0xC0..0xFF: space + (byte XOR 0x80)
      out.push(0x20);
      out.push(byte ^ 0x80);
    }
  }
  return new Uint8Array(out);
}

/**
 * Parse a MOBI/PRC file and extract text content.
 * Handles uncompressed (1) and PalmDOC-compressed (2) records.
 * DRM-protected files will throw an error.
 */
async function extractMobiText(file, onProgress) {
  if (onProgress) onProgress(5);
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer);

  // PDB header: 78 bytes
  // name: 0-31 (32 bytes, null-padded)
  // numRecords: offset 76, 2 bytes big-endian
  if (buf.length < 78) throw new Error('File too small to be a valid MOBI file.');

  const numRecords = view.getUint16(76, false);
  if (numRecords < 2) throw new Error('Invalid MOBI file: not enough records.');

  // Record info list starts at offset 78, each entry is 8 bytes (offset: 4, attributes: 1, uniqueID: 3)
  const recordOffsets = [];
  for (let r = 0; r < numRecords; r++) {
    const recInfoOffset = 78 + r * 8;
    if (recInfoOffset + 8 > buf.length) break;
    recordOffsets.push(view.getUint32(recInfoOffset, false));
  }

  if (recordOffsets.length === 0) throw new Error('Invalid MOBI file: no record entries found.');

  if (onProgress) onProgress(10);

  // Record 0 contains the MOBI header
  const rec0Start = recordOffsets[0];
  const rec0End = recordOffsets.length > 1 ? recordOffsets[1] : buf.length;
  if (rec0Start >= buf.length) throw new Error('Invalid MOBI file: record 0 out of bounds.');
  if (rec0End - rec0Start < 14) throw new Error('Invalid MOBI file: record 0 header too short.');

  // PalmDOC header (first 16 bytes of record 0)
  const compression = view.getUint16(rec0Start, false);
  const textLength = view.getUint32(rec0Start + 4, false);
  const recordCount = view.getUint16(rec0Start + 8, false);

  // Check for DRM: MOBI header starts at rec0Start + 16
  // encryption type at offset 12 in PalmDOC header
  const encryption = view.getUint16(rec0Start + 12, false);
  if (encryption !== 0) {
    throw new Error('This MOBI file is DRM-protected and cannot be converted. Only unprotected .mobi/.prc files are supported.');
  }

  if (compression !== 1 && compression !== 2) {
    throw new Error('Unsupported MOBI compression type. Only uncompressed and PalmDOC-compressed files are supported.');
  }

  if (onProgress) onProgress(20);

  // Extract text from records 1..recordCount
  const textParts = [];
  const startRec = 1;
  const endRec = Math.min(startRec + recordCount, recordOffsets.length);

  for (let r = startRec; r < endRec; r++) {
    const start = recordOffsets[r];
    if (start >= buf.length) continue;
    const end = r + 1 < recordOffsets.length ? recordOffsets[r + 1] : buf.length;
    const recordData = buf.slice(start, end);

    let decoded;
    if (compression === 1) {
      // Uncompressed
      decoded = recordData;
    } else {
      // PalmDOC compression
      decoded = palmDocDecompress(recordData);
    }
    textParts.push(decoded);

    if (onProgress) onProgress(20 + Math.round(((r - startRec) / (endRec - startRec)) * 40));
  }

  // Concatenate all decoded text
  const totalLen = textParts.reduce((s, p) => s + p.length, 0);
  const combined = new Uint8Array(Math.min(totalLen, textLength));
  let offset = 0;
  for (const part of textParts) {
    const copyLen = Math.min(part.length, combined.length - offset);
    if (copyLen <= 0) break;
    combined.set(part.subarray(0, copyLen), offset);
    offset += copyLen;
  }

  if (onProgress) onProgress(65);

  // Decode as UTF-8 (most MOBI files use UTF-8 or CP1252)
  let text;
  try {
    text = new TextDecoder('utf-8').decode(combined);
  } catch {
    text = new TextDecoder('windows-1252').decode(combined);
  }

  // If text contains HTML, strip tags
  if (text.includes('<html') || text.includes('<body') || text.includes('<p>') || text.includes('<p ')) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    text = (doc.body || doc.documentElement).textContent || '';
  }

  if (onProgress) onProgress(80);

  // Clean up whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

export async function mobiToText(file, onProgress) {
  const text = await extractMobiText(file, onProgress);
  if (onProgress) onProgress(100);
  return new Blob([text], { type: 'text/plain' });
}

export async function mobiToPdf(file, onProgress) {
  const text = await extractMobiText(file, onProgress);
  if (onProgress) onProgress(50);
  const blob = await textToPdfBlob(text, onProgress);
  if (onProgress) onProgress(100);
  return blob;
}

export async function docxToText(file, onProgress) {
  const text = await extractDocxText(file, onProgress);
  if (onProgress) onProgress(100);
  return new Blob([text], { type: 'text/plain' });
}

export async function docxToPdf(file, onProgress) {
  const text = await extractDocxText(file, onProgress);
  if (onProgress) onProgress(50);
  const blob = await textToPdfBlob(text, onProgress);
  if (onProgress) onProgress(100);
  return blob;
}
