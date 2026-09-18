import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { MAX_STUDENT_PHOTO_BYTES, STUDENT_PHOTO_ACCEPT_TYPES } from '@/lib/studentConstants';

// Same presign-then-PUT-direct-to-R2 pattern as
// app/api/students/photo-upload-url/route.js, just gated by requireTeacher
// (self only) instead of requireSchoolAdmin, and keyed under its own prefix.
export async function POST(request) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const { fileName, fileType, fileSize } = await request.json();

  if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_STUDENT_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Image must be 2MB or smaller.' }, { status: 400 });
  }

  const safeName = (fileName || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `teacher-profile-photos/${actor.teacherId}/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
