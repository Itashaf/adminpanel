import { NextResponse } from 'next/server';
import { addSchoolFromWizard, searchSchoolDirectory } from '@/lib/schools';
import { runWithSchool } from '@/lib/auth/schoolContext';
import { addSession, setActiveSession } from '@/lib/academicSessions';
import { requireSuperAdmin } from '@/lib/iam';
import { readJson } from '@/lib/http';

export async function GET(request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const result = await searchSchoolDirectory({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20)),
  });
  return NextResponse.json(result);
}

export async function POST(request) {
  // Creating a school is a Super Admin action (the /setup wizard is only linked
  // from the Super Admin schools list) — it used to run for anyone.
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const data = await readJson(request);

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
    // — created *for* this school (see runWithSchool below).
    if (data.startDate && data.endDate) {
      try {
        // Created for the new school only, without touching any shared setting.
        await runWithSchool(school.id, async () => {
          const session = await addSession({ name: data.sessionName, startDate: data.startDate, endDate: data.endDate });
          await setActiveSession(session.id);
        });
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
