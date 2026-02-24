# IrisFiles

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Privacy-first file converter that runs entirely in the browser. No uploads, no servers, no tracking. Files never leave the user's device.

**Live:** [irisfiles.com](https://irisfiles.com)

## The idea

In March 2025, the FBI warned about malicious online file converters distributing malware. The core problem: most converters upload your files to a remote server. You have no way to know what happens to them after they leave your device.

IrisFiles solves this by doing everything client-side. The entire app is static HTML, CSS, and vanilla JavaScript. There is no backend. Conversions run in the browser using the Canvas API and WebAssembly. The result downloads directly to the user's device.

This makes it:
- **Private by architecture**, not just by policy. There is no server that could be compromised, subpoenaed, or breached.
- **Free to operate.** Near-zero hosting costs (static files on Vercel free tier). No compute, no storage, no bandwidth costs from file processing.
- **Fast.** No upload/download round-trip. Most conversions complete in milliseconds.

## Features

78 tools across 7 categories:

| Category | Tools |
|----------|-------|
| **Image conversion** | HEIC, WebP, PNG, JPG, SVG, BMP, GIF, AVIF, TIFF, ICO (all cross-convert to JPG/PNG/WebP/PDF) |
| **Image tools** | Compress (quality slider), Resize, Strip EXIF (batch), Metadata Viewer/Editor (lossless JPEG) |
| **PDF** | Image-to-PDF, PDF-to-Image, Merge, Split |
| **Video** | MOV/AVI/MKV/WebM/MP4 cross-convert, Video-to-GIF, Compress |
| **Audio** | MP3, WAV, OGG, FLAC, M4A, AAC cross-convert |
| **Documents** | EPUB/RTF/DOCX to TXT and PDF |
| **Fonts** | TTF, OTF, WOFF cross-convert |
| **Archives** | ZIP extract and create |

Every tool includes batch processing (up to 50 files), ZIP download, drag-and-drop, and a smart landing page that auto-detects file type and routes to the right converter.

## Usage

```bash
# Install dev dependencies (serve, for local preview)
npm install

# Start local dev server
npx serve . -p 3000

# Run validation suite (78 pages, SEO meta, JSON-LD, internal links, sitemap)
node test/validate.mjs

# Build (only needed if updating WASM or fflate)
bash build.sh

# Deploy (auto-deploys on push to main via Vercel)
git push origin main
```

No build step required for day-to-day development. Edit HTML/JS/CSS and refresh.

## Technology

- **Image encoding:** Browser Canvas API (`toBlob`)
- **HEIC decoding:** [heic-to](https://github.com/nicolo-ribaudo/heic-to) (WebAssembly, libheif 1.21.2, lazy-loaded ~2.5MB)
- **Video:** FFmpeg.wasm (lazy-loaded from jsDelivr CDN)
- **Audio:** lamejs for MP3 encoding, Web Audio API for decoding
- **PDF:** pdf-lib, jsPDF, PDF.js (all lazy-loaded from CDN)
- **Metadata:** ExifReader (read all formats) + piexifjs (lossless JPEG write)
- **ZIP:** fflate (~8KB gzipped)
- **Format detection:** Magic bytes, not file extensions
- **Framework:** None. Pure HTML + CSS + vanilla JS modules
- **Hosting:** Vercel free tier, static files only

## Support

IrisFiles is free with no limits, no accounts, and no ads. If you find it useful, you can support development via:

- [Ko-fi](https://ko-fi.com/irisfiles)
- [GitHub Sponsors](https://github.com/sponsors/ingmarsturm)

### Principles
- No ads. No tracking. No data collection. The privacy-first positioning is the product's primary differentiator and should never be compromised for revenue.
- Any monetization should be obvious and non-intrusive. No dark patterns, no artificial limits on free features.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical architecture: module structure, conversion pipeline, JS patterns, CDN loading strategy, and per-tool documentation.

## Project structure

```
irisfiles/
  index.html              # Landing page with smart drop + tool matrix
  *.html                  # 77 converter pages (one per tool)
  css/style.css           # All styles (CSS variables, responsive)
  js/
    converter.js          # Core: format detection, Canvas encode, download, ZIP
    ui.js                 # Image converter UI (drag-drop, queue, progress)
    heic-worker.js        # Lazy HEIC WASM loader
    pdf-engine.js         # PDF operations via pdf-lib/jsPDF/PDF.js
    pdf-ui.js             # PDF page controller
    strip-engine.js       # Canvas-based metadata strip
    strip-ui.js           # Strip EXIF batch UI
    exif-engine.js        # Metadata read/write (ExifReader + piexifjs)
    exif-ui.js            # Metadata viewer/editor UI
    vidconv-engine.js     # FFmpeg.wasm video conversion
    vidcomp-ui.js         # Video compressor UI
    audio-engine.js       # Audio conversion (Web Audio + lamejs)
    smart-drop.js         # Landing page: magic byte detection, IndexedDB routing
    *-boot.js             # Per-page bootstrappers (2-3 lines each)
    fflate.min.js         # ZIP library (committed)
  wasm/heic/              # HEIC WASM binary (committed, ~2.5MB)
  test/validate.mjs       # Validation suite (9200+ checks)
  vercel.json             # Clean URLs, CSP headers, WASM cache
  sitemap.xml             # 78 URLs
  robots.txt
```

## License

MIT
