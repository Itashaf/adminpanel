import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { MAX_STUDENT_PHOTO_BYTES, STUDENT_PHOTO_ACCEPT_TYPES } from '@/lib/studentConstants';

// Step 1 of the admin-driven Teacher photo upload (Add/Edit Teacher form) —
// same presign-then-PUT-direct-to-R2 pattern as
// app/api/students/photo-upload-url/route.js. Distinct from
// app/api/teacher/profile-photo-upload-url/route.js, which is the Teacher's
// own self-service upload (requireTeacher, keyed under their own id) — this
// one is the admin setting/replacing a teacher's photo, before the teacher
// may even have an id yet (Add Teacher), so the key is keyed by timestamp.
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
  const key = `teachers/${schoolId}/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
