# Reddit Comment Drafts - IrisFiles

Drafted 2026-03-04. Copy-paste ready.

---

## 1. r/privacy - "PSA: Most online file converters upload your files to their servers"

**Thread:** https://www.reddit.com/r/privacy/comments/1r73kbd/
**Context:** OP explains how to check if converters upload files. Comments include a cybersecurity worker saying users keep bypassing IT tools, and someone asking for local PDF conversion alternatives.

**Reply to the main thread:**

> Great PSA. For anyone looking for a concrete alternative: I built irisfiles.com specifically because of this problem. It runs FFmpeg.wasm and other codecs entirely in the browser via WebAssembly. Your files never touch a server, period. You can verify in the Network tab: no file data ever leaves your device.
>
> Full disclosure: the site does use Cloudflare Web Analytics for basic page view counts (no cookies, no PII). But that's just "someone visited the page" level data. Your actual files, their contents, metadata, everything stays 100% local in browser memory. No file size limit either. Free, no ads, no account.
>
> Handles images (HEIC, WebP, PNG, etc.), video (MP4, MOV, WebM, AVI, MKV), audio, PDFs, and more.

**Reply to u/qunow** (struggling with local PDF conversion):

> For PDF tasks without installing anything, irisfiles.com does PDF to JPG/PNG, merge, split, and OCR entirely in-browser. Your files never leave your device. No upload, no Adobe account. Uses pdf-lib and Tesseract.js under the hood.

---

## 2. r/VideoEditing - "Speeding up a timelapse video"

**Thread:** https://www.reddit.com/r/VideoEditing/comments/1puvlcm/
**Context:** OP has timelapse footage from an NVR at 1fps, wants to speed it up for sharing. Only reply so far suggests ffmpeg.

**Reply:**

> If you don't want to mess with ffmpeg commands, irisfiles.com/video-speed does this in the browser. Drop your video, pick a speed preset (2x up to 16x), and it re-encodes with ffmpeg.wasm under the hood. No install, your video never leaves your machine (all processing happens locally). No file size limit, though very large files may be slow in-browser. For huge files or batch work, desktop ffmpeg is still king.

---

## 3. r/VideoEditing - "Workflow Help! MOV -> MP4 and everything in between"

**Thread:** https://www.reddit.com/r/VideoEditing/comments/1qyfc8h/
**Context:** Volunteer at a non-profit needs to convert MOV to MP4, remove audio, do basic edits for social media. Struggling with the learning curve.

**Reply:**

> For the MOV to MP4 conversion part specifically, irisfiles.com/mov-to-mp4 is probably the fastest path if you just need quick conversions without learning a full editor. Drop the file, get an MP4 back. Your video never gets uploaded anywhere, it's all processed locally in your browser. Won't help with stabilization or color grading, but it handles the container conversion and can strip audio too.

---

## 4. r/videography - "How to convert large MTS to MP4 online for free?"

**Thread:** https://www.reddit.com/r/videography/comments/1k9l7kr/
**Context:** OP has 2GB+ MTS files from work, needs MP4. Ended up using VLC. Suggestions included ffmpeg and Handbrake.

**Reply:**

> Late to this, but for anyone finding this thread later: irisfiles.com converts video formats in-browser using ffmpeg.wasm. Your files never get uploaded to any server, everything is processed locally in browser memory. No file size limit (it'll warn you above 200MB since it's all in RAM). For 2GB+ files like OP's, desktop ffmpeg or VLC is probably faster, but it works if you're willing to wait. The site does use Cloudflare analytics for page views, but your actual video files never leave your device.

---

## 5. r/privacy - "I did a stupid mistake"

**Thread:** https://www.reddit.com/r/privacy/comments/1nxsi2c/
**Context:** OP uploaded their bank statement (PDF) to an online converter to get XLSX. Realized immediately it was a privacy mistake.

**Reply:**

> For future reference, there are browser-based converters that process files locally without uploading anything. irisfiles.com handles PDF conversions entirely client-side using WebAssembly. Your files never leave your device. You can verify in DevTools Network tab: the only third-party request is Cloudflare Web Analytics (basic page view counts, no cookies, no PII), but zero file data ever goes anywhere.
>
> Doesn't do PDF to XLSX specifically, but covers PDF to image, merge, split, and OCR. For PDF to spreadsheet, LibreOffice is your best bet offline.

---

## 6. r/degoogle - "Built a local TTS alternative to Google Cloud"

**Thread:** https://www.reddit.com/r/degoogle/comments/1qkx3go/
**Context:** Developer built an offline TTS tool to avoid sending data to Google. Community is appreciative of local-first tools.

**Reply:**

> Love the local-first approach. I built something similar for file conversion: irisfiles.com runs entirely in-browser using WebAssembly (ffmpeg.wasm, Tesseract.js, etc.). Your files never touch a server. Covers image/video/audio conversion, compression, PDF tools, OCR. The only third-party request is Cloudflare analytics for page views (no cookies, no PII), but your actual file data stays 100% in browser memory. No account, no ads. Same philosophy as your project: if it can run locally, it should.
