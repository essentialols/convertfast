# IrisFiles

Privacy-first client-side file converter. See [README.md](README.md) for project overview and [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## Commands
- `npx serve . -p 3000` - Dev server
- `node test/validate.mjs` - Validation suite (78 pages, 9200+ checks)
- `bash build.sh` - Rebuild WASM + fflate (rarely needed)
- `git push origin main` - Deploy (Vercel auto-deploy)

## Conventions
- One HTML page per tool, unique SEO meta, shared JS via ES module imports
- Format detection uses magic bytes, not file extensions
- Heavy libraries lazy-loaded from jsDelivr CDN (ExifReader, piexifjs, FFmpeg.wasm, pdf-lib, etc.)
- Engine/UI/Boot pattern: `*-engine.js` (pure functions), `*-ui.js` (DOM controller), `*-boot.js` (2-line bootstrapper)
- Safeguards: 100MB file limit, 100MP pixel limit, 50-file batch cap, 50MB PDF merge limit
- Adding a new tool: create HTML + engine + UI + boot, add to index.html Image Tools row, smart-drop.js routes, sitemap.xml, test/validate.mjs PAGES array + sitemap count
