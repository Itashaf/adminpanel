import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import crypto from 'crypto';
import { getPresignedUploadUrl, buildPublicUrl, isPrivateStorageConfigured, privateDocumentPath } from '@/lib/storage';
import { MAX_DOCUMENT_BYTES, DOCUMENT_ACCEPT_TYPES } from '@/lib/documentConstants';
import { readJson } from '@/lib/http';

// Presign for a Teacher's 10th/12th/Graduation/Work Experience Certificate
// or Aadhaar — same pattern as app/api/students/document-upload-url/route.js.
export async function POST(request) {
  const { error } = await requireAnyPermission(['teachers.create', 'teachers.update']);
  if (error) return error;

  const { fileName, fileType, fileSize } = await readJson(request);

  if (!DOCUMENT_ACCEPT_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Only PDF, JPG, PNG, or WEBP files are allowed.' }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'File must be 5MB or smaller.' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  const safeName = (fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  // A random id in the key: a document address can no longer be guessed from the
  // upload time and file name.
  const key = `teachers/${schoolId}/documents/${crypto.randomUUID()}-${safeName}`;

  // With a private bucket configured the file goes there and what is stored is a
  // link into /api/documents/file (login required), not a public address.
  const privateBucket = isPrivateStorageConfigured();
  const uploadUrl = await getPresignedUploadUrl(key, fileType, { privateBucket });

  return NextResponse.json({ uploadUrl, publicUrl: privateBucket ? privateDocumentPath(key) : buildPublicUrl(key), key });
}
