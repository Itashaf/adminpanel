import { NextResponse } from 'next/server';
import { addSchoolFromWizard, searchSchoolDirectory } from '@/lib/schools';
import { setActiveSchoolContext } from '@/lib/school';
import { addSession, setActiveSession } from '@/lib/academicSessions';
import { requireSuperAdmin } from '@/lib/iam';

export async function GET(request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const result = await searchSchoolDirectory({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 20,
  });
  return NextResponse.json(result);
}

export async function POST(request) {
  const data = await request.json();

  if (!data.name || !data.code || !data.email || !data.phone || !data.sessionName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const school = await addSchoolFromWizard(data);

    // Every other per-school data module (students, teachers, classes,
    // attendance, notices, homework — see lib/schoolScope.js) starts
    // this new school completely empty, but a school with zero academic
    // sessions is a broken starting point (nothing else has a session to
    // attach to). Bootstrap the one the wizard's own Step 4 already collected
    // — switching the active school context first so it's created *for*
    // this school, not whichever one was active before.
    if (data.startDate && data.endDate) {
      try {
        await setActiveSchoolContext(school);
        const session = await addSession({ name: data.sessionName, startDate: data.startDate, endDate: data.endDate });
        await setActiveSession(session.id);
      } catch {
        // Non-fatal — the school itself was created successfully; worst case
        // its admin creates the first academic session by hand.
      }
    }

    return NextResponse.json(school);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
