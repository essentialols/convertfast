import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import http from 'node:http';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = 'http://localhost:3987';

const PAGES = [
  '/', '/heic-to-jpg', '/heic-to-png', '/heic-to-webp', '/heic-to-pdf',
  '/webp-to-jpg', '/webp-to-png', '/webp-to-pdf',
  '/png-to-jpg', '/jpg-to-png', '/jpg-to-webp', '/png-to-webp',
  '/compress', '/jpg-to-pdf', '/png-to-pdf',
  '/pdf-to-jpg', '/pdf-to-png', '/merge-pdf', '/video-to-gif',
  '/svg-to-jpg', '/svg-to-png', '/svg-to-webp', '/svg-to-pdf',
  '/bmp-to-jpg', '/bmp-to-png', '/bmp-to-webp', '/bmp-to-pdf',
  '/gif-to-jpg', '/gif-to-png', '/gif-to-webp', '/gif-to-pdf',
  '/avif-to-jpg', '/avif-to-png', '/avif-to-webp', '/avif-to-pdf',
  '/ico-to-jpg', '/ico-to-png', '/ico-to-webp', '/ico-to-pdf',
  '/tiff-to-jpg', '/tiff-to-png', '/tiff-to-webp', '/tiff-to-pdf',
  '/mp3-to-wav', '/wav-to-mp3', '/ogg-to-wav', '/ogg-to-mp3',
  '/flac-to-wav', '/flac-to-mp3', '/m4a-to-wav', '/m4a-to-mp3',
  '/aac-to-wav', '/aac-to-mp3',
  '/epub-to-txt', '/epub-to-pdf', '/rtf-to-txt', '/rtf-to-pdf',
  '/docx-to-txt', '/docx-to-pdf',
  '/otf-to-ttf', '/woff-to-ttf', '/ttf-to-otf', '/woff-to-otf',
  '/ttf-to-woff', '/otf-to-woff',
  '/extract-zip', '/create-zip',
  '/split-pdf', '/resize-image', '/strip-exif',
  '/mov-to-mp4', '/avi-to-mp4', '/mkv-to-mp4', '/webm-to-mp4', '/mp4-to-webm',
  '/compress-video',
  '/image-metadata',
  '/about'
];

let passed = 0;
let failed = 0;

function ok(test, msg) {
  if (test) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function fetch(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let body = '';
      r.on('data', c => body += c);
      r.on('end', () => res({ status: r.statusCode, body, headers: r.headers }));
    }).on('error', rej);
  });
}

function meta(html, property) {
  // property= or name= attribute
  const re = new RegExp(`<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  if (m) return m[1];
  // try reversed attribute order (content before property/name)
  const re2 = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function startServer() {
  return new Promise((res, rej) => {
    const proc = spawn('npx', ['serve', '.', '-p', '3987', '-s'], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
    });
    let ready = false;
    const check = () => {
      fetch(`${BASE}/`).then(() => {
        if (!ready) { ready = true; res(proc); }
      }).catch(() => setTimeout(check, 200));
    };
    setTimeout(check, 500);
    setTimeout(() => { if (!ready) rej(new Error('Server failed to start')); }, 15000);
  });
}

async function validatePage(path) {
  const label = path === '/' ? 'index' : path.slice(1);
  console.log(`\n--- ${label} ---`);

  const { status, body: html } = await fetch(`${BASE}${path}`);
  ok(status === 200, `${label}: HTTP ${status} (expected 200)`);
  ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'), `${label}: missing DOCTYPE`);
  ok(html.includes('<html'), `${label}: missing <html>`);
  ok(html.includes('</html>'), `${label}: missing </html>`);

  // title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  ok(titleMatch && titleMatch[1].trim().length > 0, `${label}: missing or empty <title>`);

  // meta description
  const desc = meta(html, 'description');
  ok(desc && desc.length > 0, `${label}: missing meta description`);

  // OG tags
  ok(meta(html, 'og:title'), `${label}: missing og:title`);
  ok(meta(html, 'og:description'), `${label}: missing og:description`);
  ok(meta(html, 'og:type'), `${label}: missing og:type`);
  ok(meta(html, 'og:url'), `${label}: missing og:url`);
  ok(meta(html, 'og:image'), `${label}: missing og:image`);

  // Twitter tags
  ok(meta(html, 'twitter:card'), `${label}: missing twitter:card`);
  ok(meta(html, 'twitter:title'), `${label}: missing twitter:title`);
  ok(meta(html, 'twitter:description'), `${label}: missing twitter:description`);
  ok(meta(html, 'twitter:image'), `${label}: missing twitter:image`);

  // Canonical
  const canonMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/);
  ok(canonMatch, `${label}: missing canonical link`);
  if (canonMatch) {
    ok(canonMatch[1].startsWith('https://irisfiles.com'), `${label}: canonical doesn't start with https://irisfiles.com`);
  }

  // Favicon
  ok(html.includes('href="/favicon.svg"'), `${label}: missing favicon link`);

  // JSON-LD (all pages except /about should have array of 2: WebApplication + FAQPage)
  const ldMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/);
  if (path === '/about') {
    // about page: no JSON-LD required (but ok if present)
  } else {
    ok(ldMatch, `${label}: missing JSON-LD`);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        ok(Array.isArray(ld) && ld.length === 2, `${label}: JSON-LD should be array of 2`);
        const types = ld.map(e => e['@type']);
        ok(types.includes('WebApplication'), `${label}: JSON-LD missing WebApplication`);
        ok(types.includes('FAQPage'), `${label}: JSON-LD missing FAQPage`);
      } catch (e) {
        ok(false, `${label}: JSON-LD parse error: ${e.message}`);
      }
    }
  }

  // Internal links resolve to real files
  const hrefRe = /href="(\/[^"#]*)"/g;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const linkPath = m[1];
    // /favicon.svg is a file, others are clean URLs (html files)
    if (linkPath.includes('.')) {
      ok(existsSync(join(ROOT, linkPath)), `${label}: broken asset link ${linkPath}`);
    } else {
      const filePath = linkPath === '/' ? 'index.html' : `${linkPath.slice(1)}.html`;
      ok(existsSync(join(ROOT, filePath)), `${label}: broken page link ${linkPath} (looked for ${filePath})`);
    }
  }

  // Local script src paths exist on disk
  const scriptRe = /<script[^>]+src="([^"]+)"/g;
  while ((m = scriptRe.exec(html)) !== null) {
    const src = m[1];
    if (src.startsWith('http://') || src.startsWith('https://')) continue;
    ok(existsSync(join(ROOT, src)), `${label}: missing script ${src}`);
  }
}

async function globalChecks() {
  console.log('\n=== GLOBAL CHECKS ===');

  // sitemap.xml
  const { status: smStatus, body: sitemap } = await fetch(`${BASE}/sitemap.xml`);
  ok(smStatus === 200, 'sitemap.xml: not found');
  const locRe = /<loc>([^<]+)<\/loc>/g;
  const urls = [];
  let m;
  while ((m = locRe.exec(sitemap)) !== null) urls.push(m[1]);
  ok(urls.length === 78, `sitemap.xml: has ${urls.length} URLs (expected 78)`);

  // each sitemap URL corresponds to a real page
  for (const url of urls) {
    const path = url.replace('https://irisfiles.com', '');
    const filePath = (path === '' || path === '/') ? 'index.html' : `${path.replace(/^\//, '')}.html`;
    ok(existsSync(join(ROOT, filePath)), `sitemap.xml: ${url} has no corresponding file (${filePath})`);
  }

  // robots.txt
  const { status: rbStatus, body: robots } = await fetch(`${BASE}/robots.txt`);
  ok(rbStatus === 200, 'robots.txt: not found');
  ok(robots.includes('Allow: /'), 'robots.txt: missing Allow: /');
  ok(robots.toLowerCase().includes('sitemap:'), 'robots.txt: missing Sitemap directive');

  // vercel.json CSP checks
  const vercelJson = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const cspHeader = vercelJson.headers
    .find(h => h.source === '/(.*)')
    ?.headers.find(h => h.key === 'Content-Security-Policy');
  ok(cspHeader, 'vercel.json: missing CSP header');
  if (cspHeader) {
    const csp = cspHeader.value;
    ok(csp.includes('worker-src') && csp.includes('blob:'), 'vercel.json CSP: missing worker-src blob:');
    ok(csp.includes('connect-src') && csp.includes('cdn.jsdelivr.net'), 'vercel.json CSP: missing connect-src cdn.jsdelivr.net');
    ok(csp.includes('img-src') && csp.includes('blob:') && csp.includes('data:'), 'vercel.json CSP: missing img-src blob: data:');
    ok(csp.includes("'unsafe-inline'"), 'vercel.json CSP: missing unsafe-inline in style-src');
  }

  // favicon.svg
  const { status: fvStatus } = await fetch(`${BASE}/favicon.svg`);
  ok(fvStatus === 200, 'favicon.svg: not served (status ' + fvStatus + ')');

  // og-default.png
  const { status: ogStatus } = await fetch(`${BASE}/img/og-default.png`);
  ok(ogStatus === 200, 'img/og-default.png: not served (status ' + ogStatus + ')');
}

async function main() {
  console.log('Starting local server...');
  const server = await startServer();
  console.log('Server ready on port 3987');

  try {
    for (const page of PAGES) {
      await validatePage(page);
    }
    await globalChecks();
  } finally {
    server.kill('SIGTERM');
  }

  console.log(`\n========================================`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
