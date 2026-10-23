import { NextResponse } from 'next/server';
import { addSession, getAllSessions } from '@/lib/academicSessions';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function POST(request) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const data = await readJson(request);

  if (!data.startDate || !data.endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await addSession(data);
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// GET /api/sessions — every academic session with its student/class counts,
// the same getAllSessions() list the web /dashboard/sessions page renders
// (for the mobile Academic Sessions screen). settings.view, like the sidebar.
export async function GET() {
  const { error: authError } = await requirePermission('settings.view');
  if (authError) return authError;
  return NextResponse.json(await getAllSessions());
}
