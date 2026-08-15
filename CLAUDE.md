# IrisFiles

Privacy-first client-side file converter. See [README.md](README.md) for project overview and [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## Commands
- `npm run dev` - Dev server (`npx serve . -p 3000`)
- `npm test` - Validation suite (134 pages)
- `npm run test:e2e` - Playwright e2e suite (test/e2e, own server on :3988)
- `bash build.sh` - Rebuild WASM + fflate (rarely needed)
- `git push origin main` - Deploy (Vercel auto-deploy). Pushing to main also triggers
  `patrol.sh` via `.git/hooks/pre-push`.

## Conventions
- One HTML page per tool, unique SEO meta, shared JS via ES module imports
- Format detection uses magic bytes, not file extensions
- Heavy libraries lazy-loaded from jsDelivr CDN (ExifReader, piexifjs, FFmpeg.wasm, pdf-lib, etc.)
- Engine/UI/Boot pattern: `*-engine.js` (pure functions), `*-ui.js` (DOM controller), `*-boot.js` (2-line bootstrapper)
- Safeguards: 100MB file limit, 100MP pixel limit, 50-file batch cap, 50MB PDF merge limit
- Adding a new tool: create HTML + engine + UI + boot, add to index.html Image Tools row, smart-drop.js routes, sitemap.xml, test/validate.mjs PAGES array + sitemap count

## Where files go
- **Root is the deploy directory** (`vercel.json` → `"outputDirectory": "."`). A root filename is a
  live URL. Never move a root `.html` into a subdirectory.
- **`patrol.sh` must stay at the repo root** — `.git/hooks/pre-push` invokes it by path, and that
  hook is outside the working tree where no in-repo search will find it.
- Documentation lives in exactly three root files: README.md (what and why), ARCHITECTURE.md (how),
  CLAUDE.md (working conventions). Do not start a `docs/` directory.
- Generated data goes in `data/`, with its generator in `scripts/` under a matching stem.
- One-off, non-site work (launch posts, experiments) gets its own directory named for the concept,
  not for its status — see `reddit/`. No `output/`, `misc/`, `archive/`, or `tmp/`.
- Versioning is git history. No `-v2`, `.old`, or `.bak` filename suffixes.
- Tool state (`.patrol/`, `.project-state/`, `.serena/`, `.claude/`, `.codegraph.db*`,
  `test-results/`) is regenerable and gitignored. Never file it as project content.
