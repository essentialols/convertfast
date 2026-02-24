# IrisFiles Architecture

Privacy-first client-side image converter. All conversion happens in the browser. Files never leave the user's device.

## Project Structure

```
irisfiles/
├── index.html                # Landing page / hub linking to all converters
├── heic-to-jpg.html          # HEIC→JPG (hero page, WASM-powered)
├── heic-to-png.html          # HEIC→PNG (WASM-powered)
├── webp-to-jpg.html          # WebP→JPG (native Canvas API)
├── png-to-jpg.html           # PNG→JPG (native Canvas API)
├── jpg-to-png.html           # JPG→PNG (native Canvas API)
├── compress.html             # Quality slider, re-encode at lower quality
├── about.html                # Privacy story, how it works
├── css/style.css             # All styles, system font stack
├── js/
│   ├── converter.js          # Format detection (magic bytes), Canvas encode, download, ZIP
│   ├── ui.js                 # Drag-drop, file queue, progress, quality slider, FAQ accordion
│   ├── heic-worker.js        # Lazy loader for heic-to WASM (main thread, needs Canvas)
│   └── fflate.min.js         # Built: fflate IIFE bundle for client-side ZIP
├── wasm/heic/
│   └── heic-to.iife.js       # Built: heic-to IIFE with embedded WASM (~2.5MB)
├── vercel.json               # Clean URLs, WASM cache headers
├── build.sh                  # One-shot: copy WASM + bundle fflate from node_modules
├── package.json              # Dev deps only
├── robots.txt, sitemap.xml
└── ARCHITECTURE.md
```

## Conversion Pipeline

```
File → detectFormat(magic bytes) → route:
  HEIC/HEIF → lazy-load heic-to (WASM, libheif 1.21.2) → Canvas → Blob → download
  Everything else → new Image() → Canvas → toBlob(targetMime, quality) → download
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
