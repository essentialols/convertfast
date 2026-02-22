# ConvertFast

Privacy-first client-side image converter. See ARCHITECTURE.md for full details.

## Quick Reference
- **Build**: `bash build.sh` (copies WASM + bundles fflate from node_modules)
- **Dev server**: `npx serve . -p 3000`
- **No tests yet**: Manual testing with real image files
- **Deploy**: Push to GitHub main, auto-deploy on Vercel

## Key Files
- `js/converter.js` - Core conversion logic (format detection, Canvas encode, HEIC worker, ZIP)
- `js/ui.js` - All DOM interaction (drag-drop, file queue, progress, FAQ)
- `js/heic-worker.js` - Web Worker for HEIC WASM conversion
- `wasm/heic/heic-to.iife.js` - Pre-built HEIC decoder (~2.5MB, committed)
- `js/fflate.min.js` - Pre-built ZIP library (~32KB, committed)

## Conventions
- Each converter page: separate HTML with unique SEO meta, shared JS via ES module imports
- Format detection uses magic bytes, not file extensions
- HEIC is the only format needing WASM; everything else uses native Canvas API
