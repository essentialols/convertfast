/**
 * ConvertFast - Smart Drop (landing page)
 * Detects file types via magic bytes, stores in IndexedDB, routes to the right converter.
 */

const SIGS = [
  { mime: 'image/heic', ext: 'heic', label: 'HEIC', offsets: [[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x63]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x78]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x63]],[4,[0x66,0x74,0x79,0x70,0x6d,0x69,0x66,0x31]],[4,[0x66,0x74,0x79,0x70,0x6d,0x73,0x66,0x31]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x69,0x66]],[4,[0x66,0x74,0x79,0x70,0x68,0x65,0x76,0x78]]] },
  { mime: 'image/png',  ext: 'png',  label: 'PNG',  offsets: [[0,[0x89,0x50,0x4E,0x47]]] },
  { mime: 'image/jpeg', ext: 'jpg',  label: 'JPG',  offsets: [[0,[0xFF,0xD8,0xFF]]] },
  { mime: 'image/webp', ext: 'webp', label: 'WebP', offsets: [[8,[0x57,0x45,0x42,0x50]]] },
  { mime: 'image/gif',  ext: 'gif',  label: 'GIF',  offsets: [[0,[0x47,0x49,0x46]]] },
  { mime: 'image/bmp',  ext: 'bmp',  label: 'BMP',  offsets: [[0,[0x42,0x4D]]] },
  { mime: 'application/pdf', ext: 'pdf', label: 'PDF', offsets: [[0,[0x25,0x50,0x44,0x46]]] },
];

// Format -> available conversion targets
const ROUTES = {
  'image/heic':  [{ label: 'Convert to JPG', href: '/heic-to-jpg' }, { label: 'Convert to PNG', href: '/heic-to-png' }],
  'image/png':   [{ label: 'Convert to JPG', href: '/png-to-jpg' }, { label: 'Compress', href: '/compress' }, { label: 'Convert to PDF', href: '/png-to-pdf' }],
  'image/jpeg':  [{ label: 'Convert to PNG', href: '/jpg-to-png' }, { label: 'Compress', href: '/compress' }, { label: 'Convert to PDF', href: '/jpg-to-pdf' }],
  'image/webp':  [{ label: 'Convert to JPG', href: '/webp-to-jpg' }],
  'image/gif':   [{ label: 'Compress', href: '/compress' }],
  'image/bmp':   [{ label: 'Compress', href: '/compress' }],
  'application/pdf': [{ label: 'Convert to JPG', href: '/pdf-to-jpg' }, { label: 'Convert to PNG', href: '/pdf-to-png' }, { label: 'Merge PDFs', href: '/merge-pdf' }],
};

async function detect(file) {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const fmt of SIGS) {
    for (const [offset, sig] of fmt.offsets) {
      if (buf.length >= offset + sig.length && sig.every((b, i) => buf[offset + i] === b)) {
        return fmt;
      }
    }
  }
  return null;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('convertfast', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeFiles(files) {
  const db = await openDB();
  const tx = db.transaction('pending', 'readwrite');
  const store = tx.objectStore('pending');
  store.clear();
  for (let i = 0; i < files.length; i++) {
    store.put(files[i], i);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// Exported for converter pages to pick up stored files
export async function loadPendingFiles() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const keys = await idbRequest(store.getAllKeys());
    if (keys.length === 0) return null;
    const files = [];
    for (const k of keys) {
      files.push(await idbRequest(store.get(k)));
    }
    // Clear after reading
    const tx2 = db.transaction('pending', 'readwrite');
    tx2.objectStore('pending').clear();
    return files;
  } catch {
    return null;
  }
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function initSmartDrop() {
  const dropZone = document.getElementById('smart-drop');
  const fileInput = document.getElementById('smart-file-input');
  const routePanel = document.getElementById('route-panel');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleDrop(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => { handleDrop(fileInput.files); fileInput.value = ''; });

  async function handleDrop(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    routePanel.innerHTML = '<p class="route-panel__detecting">Detecting file type...</p>';
    routePanel.style.display = '';

    // Detect all files
    const detected = await Promise.all(files.map(f => detect(f)));
    const known = detected.filter(Boolean);

    if (known.length === 0) {
      routePanel.innerHTML = '<p class="route-panel__error">Could not recognize file format. Try dropping your files on a specific converter below.</p>';
      return;
    }

    // Find dominant format
    const counts = {};
    for (const d of known) {
      counts[d.mime] = (counts[d.mime] || 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const dominantInfo = known.find(d => d.mime === dominant);
    const routes = ROUTES[dominant];

    if (!routes) {
      routePanel.innerHTML = '<p class="route-panel__error">Unsupported format. Try a specific converter below.</p>';
      return;
    }

    const fileCount = files.length;
    const label = dominantInfo.label;
    const plural = fileCount === 1 ? 'file' : 'files';

    let html = `<p class="route-panel__info">${fileCount} ${label} ${plural} detected. What would you like to do?</p><div class="route-panel__buttons">`;
    for (const route of routes) {
      html += `<button class="btn btn--primary route-btn" data-href="${route.href}">${route.label}</button>`;
    }
    html += '</div>';
    routePanel.innerHTML = html;

    routePanel.querySelectorAll('.route-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.textContent = 'Loading...';
        btn.disabled = true;
        await storeFiles(files);
        window.location.href = btn.dataset.href;
      });
    });
  }
}
