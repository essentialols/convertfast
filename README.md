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

131 tool pages, grouped on the landing page into the 7 categories below (134 HTML pages in total,
counting `index.html`, `about.html` and `privacy.html`):

| Category | Tools |
|----------|-------|
| **Images** | HEIC, WebP, PNG, JPG, SVG, BMP, GIF, AVIF, TIFF, ICO (all cross-convert to JPG/PNG/WebP/PDF) |
| **Image Tools** | Compress (quality slider), Resize, Strip EXIF (batch), Metadata Viewer/Editor (lossless JPEG), Images-to-GIF |
| **Video** | MOV/AVI/MKV/WebM/MP4 cross-convert, Video-to-GIF, Compress, Speed, Metadata |
| **Audio** | MP3, WAV, OGG, FLAC, M4A, AAC cross-convert, Compress |
| **Documents** | PDF-to-Image, Merge PDF, Split PDF, PDF OCR, EPUB/RTF/DOCX/MOBI to TXT and PDF |
| **Fonts** | TTF, OTF, WOFF cross-convert |
| **Archives** | ZIP extract and create |

Every tool includes batch processing (up to 50 files), ZIP download, drag-and-drop, and a smart landing page that auto-detects file type and routes to the right converter.

## Usage

```bash
# Install dev dependencies (serve, for local preview)
npm install

# Start local dev server
npx serve . -p 3000

# Run validation suite (134 pages, SEO meta, JSON-LD, internal links, sitemap)
npm test

# Run the Playwright end-to-end suite (spins up a server on :3988)
npm run test:e2e

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

### Principles
- No ads. No tracking. No data collection. The privacy-first positioning is the product's primary differentiator and should never be compromised for revenue.
- Any monetization should be obvious and non-intrusive. No dark patterns, no artificial limits on free features.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical architecture: module structure, conversion pipeline, JS patterns, CDN loading strategy, and per-tool documentation.

## Project structure

Everything at the repo root is published: `vercel.json` sets `"outputDirectory": "."`, so a page's
filename *is* its URL. Root HTML files cannot be moved into subdirectories without changing live
URLs and breaking `sitemap.xml`.

```
irisfiles/
  index.html              # Landing page with smart drop + tool matrix
  about.html, privacy.html
  *.html                  # 131 tool pages (one per tool), 118 of them <from>-to-<to>
  css/style.css           # All styles (CSS variables, responsive)
  js/                     # 63 modules, flat, grouped by filename stem
    converter.js          # Core: format detection, Canvas encode, download, ZIP
    ui.js                 # Image converter UI (drag-drop, queue, progress)
    heic-worker.js        # Lazy HEIC WASM loader
    smart-drop.js         # Landing page: magic byte detection, IndexedDB routing
    ffmpeg-shared.js      # Shared FFmpeg.wasm loader for the video/audio tools
    device-tier.js, meta-panel.js, notice-ui.js, ux-page.js, cities-geo.js
    <tool>-engine.js      # 16 engines: pure conversion logic, no DOM
    <tool>-ui.js          # 17 DOM controllers
    <tool>-boot.js        # 18 per-page bootstrappers (2-3 lines each)
    fflate.min.js         # ZIP library (committed, third-party)
    gifenc.min.js         # GIF encoder (committed, third-party)
  wasm/heic/              # HEIC WASM binary (committed, ~2.5MB)
  data/file-signatures.json   # Magic-byte table, generated by scripts/build-file-sigs.js
  scripts/build-file-sigs.js  # Regenerates data/file-signatures.json
  img/                    # og-default.png (social card, linked from every page),
                          # favicon-source.png (source for favicon.png/.svg)
  test/validate.mjs       # Validation suite (134 pages, 25000+ checks)
  test/e2e/               # Playwright specs, driven by playwright.config.mjs
  reddit/                 # One-off 2026-03 launch promotion, not part of the site
  patrol.sh, PATROL.md    # Automated Claude Code bug patrol; patrol.sh is invoked by
                          # .git/hooks/pre-push, so it must stay at the repo root
  build.sh                # One-shot: copy WASM + bundle fflate from node_modules
  vercel.json             # Clean URLs, CSP headers, WASM cache
  serve.json              # Clean URLs for the local `npx serve` dev server
  sitemap.xml             # 134 URLs
  robots.txt
```

Generated, gitignored, and safe to delete at any time: `test-results/` (Playwright), `.patrol/`
(patrol run state), `.project-state/`, `.serena/`, `.claude/`, `.vercel/`, `.codegraph.db*`.

## License

MIT
