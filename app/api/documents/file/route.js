import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { isAdminTier } from '@/lib/roleGuard';
import { getPresignedDownloadUrl, isPrivateStorageConfigured } from '@/lib/storage';

// Opens an identity document (Aadhaar, certificate) from the private bucket.
// Only admin-tier staff (Admin, Principal, Super Admin) of the SAME school may
// open it; the redirect target is a link that expires after five minutes, so a
// copied link stops working.
const KEY_PATTERN = /^(students|teachers)\/([A-Za-z0-9_-]+)\/documents\/[A-Za-z0-9._-]+$/;

export async function GET(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!isAdminTier(actor)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isPrivateStorageConfigured()) {
    return NextResponse.json({ error: 'Private document storage is not configured.' }, { status: 404 });
  }

  const key = new URL(request.url).searchParams.get('key') || '';
  const match = KEY_PATTERN.exec(key);
  if (!match) return NextResponse.json({ error: 'Invalid document.' }, { status: 400 });

  // The school id is part of the key. A school's own staff cannot open another
  // school's document, whatever key they send; the Super Admin can open any.
  if (actor.role !== 'SuperAdmin' && match[2] !== actor.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = await getPresignedDownloadUrl(key);
  return NextResponse.redirect(url, 302);
}
