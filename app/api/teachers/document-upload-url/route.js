import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPresignedUploadUrl, buildPublicUrl } from '@/lib/storage';
import { MAX_DOCUMENT_BYTES, DOCUMENT_ACCEPT_TYPES } from '@/lib/documentConstants';

// Presign for a Teacher's 10th/12th/Graduation/Work Experience Certificate
// or Aadhaar — same pattern as app/api/students/document-upload-url/route.js.
export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { fileName, fileType, fileSize } = await request.json();

  if (!DOCUMENT_ACCEPT_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only PDF, JPG, PNG, or WEBP files are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'File must be 5MB or smaller.' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  const safeName = (fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `teachers/${schoolId}/documents/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
