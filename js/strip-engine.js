/**
 * IrisFiles - EXIF/metadata strip engine
 * Re-encodes images through Canvas, which naturally drops all EXIF/metadata.
 */

/**
 * Strip all metadata from an image by re-encoding through Canvas.
 * @param {File|Blob} file - Source image
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>}
 */
export async function stripMetadata(file, onProgress) {
  if (onProgress) onProgress(10);

  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Could not decode image. The file may be corrupted or in an unsupported format.');
  }

  if (onProgress) onProgress(30);

  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');

  // Determine output format: keep PNG as PNG, everything else as JPEG
  const isPng = file.type === 'image/png' ||
    (file.name && file.name.toLowerCase().endsWith('.png'));
  const mime = isPng ? 'image/png' : 'image/jpeg';

  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(bmp, 0, 0);
  bmp.close();

  if (onProgress) onProgress(70);

  // Use max quality to preserve visual fidelity
  const quality = isPng ? undefined : 1.0;
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
