/**
 * ConvertFast - Document/ebook conversion engine
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
