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
