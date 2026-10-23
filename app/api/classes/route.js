import { NextResponse } from 'next/server';
import { addClass, getClassesForSession } from '@/lib/classes';
import { getActiveSession } from '@/lib/academicSessions';
import { ACADEMIC_SESSIONS } from '@/lib/students';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function POST(request) {
  const { error: authError } = await requirePermission('classes.manage');
  if (authError) return authError;

  const data = await readJson(request);

  if (!data.level || !data.academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const cls = await addClass(data);
    return NextResponse.json(cls);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// GET /api/classes — the active session's classes with their sections, exactly
// what the web /dashboard/classes page renders (same session fallback), for
// the mobile Classes & Sections screen. classes.view, like the sidebar.
export async function GET() {
  const { error: authError } = await requirePermission('classes.view');
  if (authError) return authError;
  const activeSession = await getActiveSession();
  const academicSession = activeSession?.name || ACADEMIC_SESSIONS[0];
  const classes = await getClassesForSession(academicSession);
  return NextResponse.json({ academicSession, classes });
}
