import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getActiveSession } from '@/lib/academicSessions';

// GET /api/sessions/active — the school's Active academic session (the one
// the web Topbar's SessionSwitcher shows), for mobile screens that need a
// `session` filter (attendance roster/report). `session` is null when none
// is active yet.
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({ session: await getActiveSession() });
}
