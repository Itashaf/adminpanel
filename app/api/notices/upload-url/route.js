import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPresignedUploadUrl, buildPublicUrl, MAX_ATTACHMENT_BYTES } from '@/lib/storage';

// Step 1 of the Notices PDF attachment upload: the browser asks for a
// presigned R2 PUT url here, then uploads the file bytes directly to R2 (see
// components/notices/NoticeFormModal.jsx) — the file itself never passes
// through this Next.js server. Notices are admin-only to write, so this is
// gated the same way createNotice/updateNotice are.
export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { fileName, fileType, fileSize } = await request.json();

  if (fileType !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: 'File must be 2MB or smaller.' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  const safeName = (fileName || 'attachment.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `notices/${schoolId}/${Date.now()}-${safeName}`;

  const uploadUrl = await getPresignedUploadUrl(key, fileType);

  return NextResponse.json({ uploadUrl, publicUrl: buildPublicUrl(key), key });
}
