import { NextResponse } from 'next/server';
import { getSchoolDirectoryEntry } from '@/lib/schools';
import { createSession, getSession } from '@/lib/auth/session';
import { requireSuperAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const { id } = await params;

  const entry = await getSchoolDirectoryEntry(id);
  if (!entry) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // "Managing" a school is remembered in THIS Super Admin's own session (its
  // schoolId claim, which resolveSchoolId() already prefers), not in a setting
  // shared by everyone on the server: two Super Admins on different schools, or a
  // Super Admin and a school's own staff, no longer affect each other.
  const session = await getSession();
  const { iat, exp, ...claims } = session;
  await createSession({ ...claims, schoolId: entry.id });
  return NextResponse.json(entry);
}
