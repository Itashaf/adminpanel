// Cloudflare R2 (S3-compatible) file storage — used for Notices PDF
// attachments. Server-only: never import this from a Client Component.
import { S3Client, DeleteObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MAX_NOTICE_ATTACHMENT_BYTES } from './noticeConstants';

export const MAX_ATTACHMENT_BYTES = MAX_NOTICE_ATTACHMENT_BYTES;

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// Public URL a viewer/downloader hits directly — never routed back through
// this app, so R2_PUBLIC_URL must point at a bucket already set to allow
// public reads (an r2.dev subdomain, or a custom domain bound to the bucket).
export function buildPublicUrl(key) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export function keyFromPublicUrl(url) {
  const prefix = `${process.env.R2_PUBLIC_URL}/`;
  return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
}

// A presigned PUT lets the browser upload the file bytes straight to R2 —
// the file never passes through this Next.js server, so a 2MB cap here costs
// nothing on our end regardless of how many notices get an attachment.
export async function getPresignedUploadUrl(key, contentType) {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

// Best-effort cleanup when a notice (or its attachment) is deleted/replaced —
// never allowed to block the caller on an R2 hiccup.
export async function deleteObject(key) {
  if (!key) return;
  try {
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  } catch {
    // Orphaned object in R2 is a non-issue — never worth failing the caller's
    // request over.
  }
}

// Used by one-off cleanup scripts (not the request path) — e.g. clearing out
// every object under a prefix like `teacher-profile-photos/`.
export async function listObjectKeysWithPrefix(prefix) {
  const client = getClient();
  const keys = [];
  let continuationToken;
  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    (result.Contents || []).forEach((obj) => keys.push(obj.Key));
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}
