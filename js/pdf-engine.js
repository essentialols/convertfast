/**
 * PDF conversion engine.
 * Lazy-loads libraries from jsDelivr CDN with local fallback.
 * - pdf-lib: merge, split
 * - jsPDF: image-to-PDF
 * - PDF.js: PDF-to-image (render pages to Canvas)
 */

// CDN URLs (zero Vercel bandwidth)
const LIBS = {
  pdfLib: {
    cdn: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    global: 'PDFLib',
  },
  jspdf: {
    cdn: 'https://cdn.jsdelivr.net/npm/jspdf@4.2.0/dist/jspdf.umd.min.js',
    global: 'jspdf',
  },
};

const loaded = {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}

async function requireLib(name) {
  if (loaded[name]) return loaded[name];
  const lib = LIBS[name];
  await loadScript(lib.cdn);
  loaded[name] = window[lib.global];
  if (!loaded[name]) throw new Error(name + ' not found after loading');
  return loaded[name];
}

// --- Image to PDF (jsPDF) ---

export async function imagesToPdf(files, onProgress, quality = 0.92) {
  const { jsPDF } = await requireLib('jspdf');
  const doc = new jsPDF({ unit: 'px', hotfixes: ['px_scaling'] });
  let first = true;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = URL.createObjectURL(file.blob);
    const img = await loadImage(url);
    URL.revokeObjectURL(url);

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (!first) doc.addPage([w, h]);
    else doc.internal.pageSize.width = w;
    if (first) doc.internal.pageSize.height = h;
    first = false;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const isPng = file.mime === 'image/png';
    const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality);
    doc.addImage(dataUrl, isPng ? 'PNG' : 'JPEG', 0, 0, w, h);
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
  }

  return doc.output('blob');
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// --- PDF to Image (PDF.js via ES module import from CDN) ---

let pdfjsLib = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.min.mjs');
  } catch {
    throw new Error('Could not load PDF library. Check your internet connection.');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
  return pdfjsLib;
}

export async function pdfToImages(file, targetMime, quality, onProgress) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const results = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x for quality
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
        targetMime,
        quality
      );
    });

    results.push({
      blob,
      name: file.name.replace(/\.pdf$/i, '') + `-page${i}.${targetMime === 'image/png' ? 'png' : 'jpg'}`,
    });

    canvas.width = 1;
    canvas.height = 1; // free memory
    if (onProgress) onProgress(Math.round((i / pdf.numPages) * 100));
  }

  return results;
}

// --- PDF Merge (pdf-lib) ---

const MAX_MERGE_SIZE = 50 * 1024 * 1024; // 50MB total input

export async function mergePdfs(files, onProgress) {
  const PDFLib = await requireLib('pdfLib');

  // Validate total size
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  if (totalSize > MAX_MERGE_SIZE) {
    throw new Error(`Total size ${formatMB(totalSize)} exceeds ${formatMB(MAX_MERGE_SIZE)} limit. Merge fewer or smaller files.`);
  }

  const merged = await PDFLib.PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const data = new Uint8Array(await files[i].arrayBuffer());
    const src = await PDFLib.PDFDocument.load(data);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
    if (onProgress) onProgress(Math.round(((i + 1) / files.length) * 100));
  }

  const bytes = await merged.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// --- PDF Split (pdf-lib) ---

export async function splitPdf(file, onProgress) {
  const PDFLib = await requireLib('pdfLib');
  const data = new Uint8Array(await file.arrayBuffer());
  const src = await PDFLib.PDFDocument.load(data);
  const results = [];
  const baseName = file.name.replace(/\.pdf$/i, '');

  for (let i = 0; i < src.getPageCount(); i++) {
    const doc = await PDFLib.PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    const bytes = await doc.save();
    results.push({
      blob: new Blob([bytes], { type: 'application/pdf' }),
      name: `${baseName}-page${i + 1}.pdf`,
    });
    if (onProgress) onProgress(Math.round(((i + 1) / src.getPageCount()) * 100));
  }

  return results;
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(0) + 'MB';
}
