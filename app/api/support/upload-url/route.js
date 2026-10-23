import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import crypto from 'crypto';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { readJson } from '@/lib/http';

// image/webp included — the client compresses every image attachment to
// WebP before it ever reaches here (see lib/api.js's uploadSupportAttachment
// / lib/imageCompression.js's compressImageToTargetSize), so a real upload
// never actually arrives as png/jpeg; those two stay accepted for anything
// that skips compression for some reason (very old browser, say).
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the popup's own "Max 5MB each" copy

// Step 1 of a Support ticket/reply attachment upload — same presigned-PUT
// pattern as app/api/notices/upload-url/route.js, just for a support
// ticket's screenshot/document instead of a notice's PDF. Parent is
// excluded same as every other Support route.
export async function POST(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { fileName, fileType, fileSize } = await readJson(request);
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only PNG, JPG, or PDF files are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be 5MB or smaller.' }, { status: 400 });
  }

  const schoolId = actor.role === 'SuperAdmin' ? 'super-admin' : await resolveSchoolId();
  const safeName = (fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `support/${schoolId}/${crypto.randomUUID()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);
  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key) });
}
