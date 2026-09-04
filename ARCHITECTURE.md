# IrisFiles Architecture

Privacy-first client-side file converter — images, video, audio, documents, fonts and archives.
All conversion happens in the browser. Files never leave the user's device.

## Project Structure

See the "Project structure" section of [README.md](README.md). It is the single tree; this file
does not repeat it.

The load-bearing constraint: `vercel.json` sets `"outputDirectory": "."`, so the repo root *is* the
web root and every root HTML filename is a live URL enumerated in `sitemap.xml` and asserted by
`test/validate.mjs`. Root pages cannot be foldered by category without breaking URLs.

## Engines

Each tool follows the engine/UI/boot triad named by a shared filename stem. Engines are pure
conversion logic with no DOM access; heavy libraries are lazy-loaded from jsDelivr on first use.

| Engine | Does | Library |
|---|---|---|
| `converter.js` | Magic-byte format detection, Canvas encode, download, ZIP | — (fflate for ZIP) |
| `heic-worker.js` | Lazy HEIC decode | heic-to (WASM, libheif 1.21.2), committed to `wasm/heic/` |
| `resize-engine.js` | Resize via Canvas, target dimensions or percentage | — |
| `strip-engine.js` | Drop metadata by re-encoding through Canvas | — |
| `exif-engine.js` | Metadata read/write | ExifReader (read all), piexifjs (lossless JPEG write) |
| `pdf-engine.js` | Image↔PDF, merge, split | pdf-lib, jsPDF, PDF.js |
| `ocr-engine.js` | PDF OCR | PDF.js + Tesseract.js |
| `doc-engine.js` | EPUB/RTF/DOCX/MOBI → TXT and PDF | jsPDF |
| `font-engine.js` | TTF/OTF/WOFF cross-convert | opentype.js |
| `archive-engine.js` | ZIP extract and create | fflate (committed) |
| `gif-engine.js` | Video → GIF, streaming one frame at a time | gifenc (committed) |
| `images-gif-engine.js` | Images → animated GIF, global palette | gifenc (committed) |
| `remux-engine.js` | MOV → MP4 by rewriting the ISOBMFF `ftyp` brand | — (no transcode) |
| `vidconv-engine.js` | Video cross-convert | FFmpeg.wasm via `ffmpeg-shared.js` |
| `vidspeed-engine.js` | Playback-speed change | FFmpeg.wasm via `ffmpeg-shared.js` |
| `vidmeta-engine.js` | Video metadata read | MediaInfo.js |
| `audio-engine.js` | Audio cross-convert | Web Audio decode + lamejs MP3 encode |
| `compress-audio-engine.js` | Re-encode audio to MP3 at a chosen bitrate | FFmpeg.wasm via `ffmpeg-shared.js` |

`ffmpeg-shared.js` holds a single FFmpeg.wasm instance (~25MB, ~10MB Brotli) reused by every video
and audio engine, loaded on first use.

## Conversion Pipeline

```
File → detectFormat(magic bytes) → route:
  HEIC/HEIF        → lazy-load heic-to (WASM, libheif 1.21.2) → Canvas → Blob → download
  Other images     → new Image() → Canvas → toBlob(targetMime, quality) → download
  Video/audio      → ensureFFmpeg() → FFmpeg.wasm → Blob → download
  MOV→MP4          → remux-engine ftyp rewrite (no transcode)
  Documents / PDF  → lazy-load pdf-lib / jsPDF / PDF.js → Blob → download
```

## Key Decisions

- **Separate HTML per conversion**: SEO (Google indexes individual pages), unique meta/FAQ, fastest FCP
- **WASM committed to repo**: Eliminates build step on deploy, changes rarely
- **No Web Workers**: heic-to needs DOM (Canvas) for encoding; Canvas conversions are <50ms so Worker overhead not worth it. HEIC WASM loaded lazily via script tag on first HEIC drop.
- **No framework**: Pure HTML + CSS + vanilla JS modules
- **Format detection via magic bytes**: More reliable than file extensions

## JS Module Architecture

- `converter.js` (ES module): Pure functions for format detection, Canvas conversion, HEIC worker management, download, ZIP. No DOM access.
- `ui.js` (ES module): All DOM interaction. Imported by each page's inline `<script type="module">`. Each page calls `configure()` with its source/target formats, then `init()`.
- `heic-worker.js` (ES module): Lazy-loads the HEIC IIFE build via `<script>` tag on first use. Runs on main thread because heic-to needs Canvas/DOM for encoding. The ~2.5MB WASM is only fetched when a HEIC file is actually dropped.

## Image Metadata Viewer/Editor

A privacy-first tool for viewing, editing, and stripping EXIF metadata from photos.

**Files:** `image-metadata.html`, `js/exif-engine.js`, `js/exif-ui.js`, `js/exif-boot.js`

**Libraries (lazy-loaded from jsDelivr CDN):**
- **ExifReader** (~8KB gzipped): Reads metadata from all image formats (JPEG, PNG, WebP, TIFF, HEIC, AVIF, GIF)
- **piexifjs** (85KB): Reads and writes EXIF for JPEG only. Lossless: modifies metadata bytes, never re-encodes pixels

**Capabilities by format:**
- **JPEG**: Full read/write. Edit individual fields, strip GPS only, or strip all metadata. All operations lossless (piexifjs manipulates metadata bytes directly).
- **Non-JPEG**: Read-only metadata display. Strip All delegates to `strip-engine.js` (Canvas re-encode).

**Engine exports (`exif-engine.js`):**
- `readMetadata(file)` - Returns structured object grouped by category (basic, camera, settings, dates, gps, description)
- `isJpeg(file)` - Magic byte check (0xFF 0xD8 0xFF)
- `editExifFields(file, changes)` - JPEG only. Applies `{field: value}` map losslessly
- `stripAllMetadata(file)` - JPEG: `piexif.remove()` (lossless). Non-JPEG: Canvas re-encode
- `stripGpsOnly(file)` - JPEG only. Clears GPS IFD, preserves everything else

**UI (`exif-ui.js`):** Single-file tool (not batch). Renders grouped metadata table with editable inputs for JPEG, read-only spans for others. GPS shown as decimal degrees with inline "Remove GPS" button.

## Deployment

Static files on Vercel free tier. `vercel.json` handles clean URLs and WASM caching headers.
