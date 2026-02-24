/**
 * IrisFiles - Image resize engine
 * Resizes images via Canvas API. Supports target dimensions or percentage scaling.
 */

/**
 * Resize an image file.
 * @param {File|Blob} file - Source image
 * @param {object} opts - { width, height, percent, quality, outputMime }
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function resizeImage(file, opts, onProgress) {
  if (onProgress) onProgress(10);

  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const origW = bmp.width;
  const origH = bmp.height;

  let targetW, targetH;

  if (opts.percent) {
    const scale = opts.percent / 100;
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  } else {
    targetW = opts.width || origW;
    targetH = opts.height || origH;
  }

  // Clamp to reasonable limits
  targetW = Math.max(1, Math.min(targetW, 16384));
  targetH = Math.max(1, Math.min(targetH, 16384));

  if (onProgress) onProgress(30);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  const mime = opts.outputMime || 'image/jpeg';
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.drawImage(bmp, 0, 0, targetW, targetH);
  bmp.close();

  if (onProgress) onProgress(70);

  const quality = opts.quality != null ? opts.quality : 0.92;
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      mime,
      quality
    );
  });

  canvas.width = 1;
  canvas.height = 1;

  if (onProgress) onProgress(100);
  return blob;
}

/**
 * Get image dimensions without full decode.
 * @param {File|Blob} file
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(file) {
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Failed to decode image');
  }
  const { width, height } = bmp;
  bmp.close();
  return { width, height };
}
