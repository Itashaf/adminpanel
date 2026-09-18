import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { updateAdminSelfProfile } from '@/lib/admins';

// PATCH /api/admin/profile — the admin's own self-service name/photo edit,
// same shape as PATCH /api/teacher/profile.
export async function PATCH(request) {
  const { actor, error } = await requireSchoolAdmin();
  if (error) return error;

  const { name, photoUrl } = await request.json();
  try {
    const admin = await updateAdminSelfProfile(actor.id, { name, photoUrl });
    return NextResponse.json({ name: admin.name, photoUrl: admin.photoUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not update profile.' }, { status: 400 });
  }
}
