/**
 * IrisFiles - Images to animated GIF engine
 * Takes multiple image files and assembles them into an animated GIF using gifenc.
 * Global palette built from all frames for consistent colors.
 */

const DEFAULT_DELAY = 100; // ms per frame
const DEFAULT_MAX_WIDTH = 640;

/**
 * Convert multiple image files into an animated GIF.
 * @param {File[]} files - Image files in frame order
 * @param {object} opts - { delay, maxWidth, loop, onProgress }
 * @returns {Promise<Blob>} GIF blob
 */
export async function imagesToGif(files, opts = {}) {
  const delay = opts.delay || DEFAULT_DELAY;
  const maxWidth = opts.maxWidth || DEFAULT_MAX_WIDTH;
  const loop = opts.loop !== undefined ? opts.loop : 0; // 0 = infinite
  const onProgress = opts.onProgress || (() => {});

  if (files.length < 2) throw new Error('Need at least 2 images to create an animated GIF.');

  // Step 1: Load all images and determine uniform canvas size
  onProgress(0, 'Loading images...');
  const images = [];
  for (let i = 0; i < files.length; i++) {
    const bmp = await createImageBitmap(files[i], { imageOrientation: 'from-image' });
    images.push(bmp);
  }

  // Use first image's aspect ratio, scale to maxWidth
  const firstW = images[0].width;
  const firstH = images[0].height;
  const scale = Math.min(1, maxWidth / firstW);
  const w = Math.round(firstW * scale);
  const h = Math.round(firstH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Step 2: Sample pixels from all frames for global palette
  onProgress(5, 'Building color palette...');
  const samplePixels = [];
  for (const img of images) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(1, Math.floor(data.length / 4 / 512));
    for (let j = 0; j < data.length; j += step * 4) {
      samplePixels.push(data[j], data[j + 1], data[j + 2]);
    }
  }

  if (typeof gifenc === 'undefined') throw new Error('GIF library not loaded');
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const palette = quantize(new Uint8Array(samplePixels), 256);

  // Step 3: Encode each frame
  const gif = GIFEncoder();
  for (let i = 0; i < images.length; i++) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(images[i], 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const index = applyPalette(imageData.data, palette);
    gif.writeFrame(index, w, h, { palette, delay, dispose: 0, repeat: loop });

    const pct = 10 + Math.round((i / images.length) * 90);
    onProgress(pct, `Encoding frame ${i + 1} of ${images.length}...`);

    // Yield to keep UI responsive
    if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
  }

  // Clean up ImageBitmaps
  for (const img of images) img.close();

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  onProgress(100, `Done: ${images.length} frames`);
  return blob;
}

export { DEFAULT_DELAY, DEFAULT_MAX_WIDTH };
