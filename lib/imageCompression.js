// Client-only — resizes + re-encodes an image File/Blob to WebP entirely in
// the browser (Canvas API), before it ever leaves the device. Every photo
// upload in this app goes straight from the browser to R2 via a presigned
// URL (see lib/storage.js's getPresignedUploadUrl) — the Next.js server
// never sees the file bytes at all, so compression has to happen here, not
// server-side.
//
// `maxDimension` caps the longer side (a profile photo never needs to be
// wider than this to look sharp on any real UI it's shown at); `quality` is
// WebP's own 0-1 quality knob. Falls back to the original file untouched if
// the browser can't produce a WebP blob at all (very old browsers, or a
// non-image file) — never blocks an upload over a compression failure.
export async function compressImageToWebp(file, { maxDimension = 800, quality = 0.82 } = {}) {
  if (!file.type?.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch {
    // Compression is a nice-to-have, not a hard requirement — an upload
    // must still succeed with the original file if anything here throws
    // (corrupt image, unsupported format, canvas unavailable, etc.).
    return file;
  }
}

// Support ticket attachments (screenshots, mostly) — unlike
// compressImageToWebp's single fixed quality pass above, this iterates:
// try a quality ladder at the starting dimension, and if even the lowest
// quality still isn't under `maxBytes`, shrink the dimension and try the
// ladder again. A few megapixels of screenshot reliably lands around
// 50-100KB this way regardless of how busy/detailed the image is — a fixed
// single quality can't guarantee that (a 3MB photo and a 3MB screenshot
// compress very differently at the same quality setting).
export async function compressImageToTargetSize(file, { maxBytes = 100 * 1024, maxDimension = 1280, minQuality = 0.35 } = {}) {
  if (!file.type?.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let dimension = maxDimension;
    let best = null;

    // At most 4 dimension passes (1280 -> 960 -> 720 -> 540), each trying
    // qualities 0.82 down to minQuality — stops the moment one result is
    // under maxBytes, so a screenshot that already compresses well never
    // pays for the extra passes.
    for (let pass = 0; pass < 4; pass++) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.82, 0.7, 0.55, minQuality]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= maxBytes) {
          bitmap.close?.();
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
        }
      }
      dimension = Math.round(dimension * 0.75);
    }

    bitmap.close?.();
    // Every pass stayed over maxBytes (an unusually dense/large image) —
    // the smallest one found across all passes still beats the original.
    return best ? new File([best], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }) : file;
  } catch {
    return file;
  }
}
