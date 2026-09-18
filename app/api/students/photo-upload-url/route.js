import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { MAX_STUDENT_PHOTO_BYTES, STUDENT_PHOTO_ACCEPT_TYPES } from '@/lib/studentConstants';

// Step 1 of the Student photo upload, same presign-then-PUT-direct-to-R2
// pattern as app/api/notices/upload-url/route.js — the file bytes never pass
// through this Next.js server. Called before create/update (the student may
// not have an id yet), so the key is keyed by timestamp, not studentId.
export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { fileName, fileType, fileSize } = await request.json();

  if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_STUDENT_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Image must be 2MB or smaller.' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  const safeName = (fileName || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `students/${schoolId}/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
