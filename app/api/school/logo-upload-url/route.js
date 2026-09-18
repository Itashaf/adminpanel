import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { STUDENT_PHOTO_ACCEPT_TYPES } from '@/lib/studentConstants';

// Presign for the school's own branding logo (Settings → Branding) — same
// presign-then-PUT-direct-to-R2 pattern as every other photo upload.
// Replaces the old base64-data-URI-straight-into-the-database approach
// (School.logoUrl used to store the raw file as text), which never
// compressed anything and bloated every getSchoolSettings() read across
// the whole app with a multi-megabyte string.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function POST(request) {
  const { actor, error } = await requireSchoolAdmin();
  if (error) return error;

  const { fileName, fileType, fileSize } = await request.json();

  if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Logo must be 2MB or smaller.' }, { status: 400 });
  }

  const safeName = (fileName || 'logo.png').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `school-logos/${actor.schoolId}/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
