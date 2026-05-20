# Patrol Guidelines

Automated code patrol for IrisFiles. Claude Code reads this file to understand what to scan and what to fix.

## Scope

### Fix autonomously

- Bug fixes (broken logic, wrong conditions, off-by-one errors)
- Error handling gaps (missing try/catch, unhandled promise rejections, unchecked null/undefined)
- Edge cases (empty files, zero-byte input, unsupported formats not gracefully handled)
- Broken internal links or script references
- Missing format detection cases in magic byte checks

### Flag only (do not fix)

- Dependency updates
- Performance optimizations (unless clearly broken, e.g. infinite loop)
- Security issues (flag with HIGH severity, do not attempt fix)

### Never touch

- UI layout, colors, fonts, spacing, design
- UX flows, button placement, copy/text content
- HTML template structure (meta tags, SEO, JSON-LD)
- Third-party bundled files: fflate.min.js, gifenc.min.js, heic-to.iife.js
- package.json, package-lock.json, vercel.json, build.sh

## Priority files (scan these)

Engine files (conversion logic, most likely to have bugs):

- js/converter.js
- js/exif-engine.js
- js/strip-engine.js
- js/resize-engine.js
- js/pdf-engine.js
- js/audio-engine.js
- js/vidconv-engine.js
- js/remux-engine.js
- js/doc-engine.js
- js/font-engine.js
- js/archive-engine.js
- js/gif-engine.js
- js/images-gif-engine.js
- js/ffmpeg-shared.js
- js/smart-drop.js

UI files (DOM controllers, check for event handling bugs):

- js/ui.js
- js/exif-ui.js
- js/audio-ui.js
- js/vidconv-ui.js
- js/vidcomp-ui.js
- js/pdf-ui.js
- js/resize-ui.js
- js/strip-ui.js
- js/doc-ui.js
- js/font-ui.js
- js/archive-ui.js
- js/images-gif-ui.js
- js/compress-audio-ui.js

## Known fragile areas

- HEIC conversion: WASM lazy-loading can fail silently if script tag injection races
- PDF operations: pdf-lib has memory issues with large files, 50MB limit exists but check enforcement
- Video/audio: FFmpeg.wasm loading from CDN can timeout, check error paths
- Image metadata: piexifjs only works on JPEG, non-JPEG paths need Canvas fallback
- ZIP creation: fflate streaming for large batch, check memory handling
- Format detection: magic byte checks must cover all advertised formats

## Validation

After any fix, run: `node test/validate.mjs`
Only commit if ALL tests pass (currently ~1800+ checks across 125 pages).

## E2E test suite

After fixes, patrol runs `npx playwright test` (600+ Playwright tests in test/e2e/).
Failures get filed as GitHub issues with the `patrol` and `bug` labels.

## Test development

Patrol also develops new E2E tests for uncovered features. It reads recent git changes,
compares against existing test coverage, and writes new tests in the existing spec files.

- Follow patterns in test/e2e/ exactly (imports, selectors, fixtures)
- Available fixtures: test/fixtures/ (png, jpg, webp, bmp, gif, pdf, wav, mp3, ogg, mp4, mov, avi, rtf, txt, zip)
- New tests must pass before committing
- PR with label `patrol,tests`

## Conventions

- Minimal fixes only. Do not refactor surrounding code.
- Do not add comments, docstrings, or type annotations.
- Follow existing code style (no semicolons in some files, semicolons in others, match the file).
- Commit message format: "patrol: <short description of fix>"
