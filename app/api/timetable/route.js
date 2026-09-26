import { NextResponse } from 'next/server';
import { getTimeTable, saveTimeTable, deleteTimeTable } from '@/lib/timetable';
import { getCurrentUserInfo } from '@/lib/iam';

// SchoolAdmin/SuperAdmin manage any class. A Teacher may only manage a
// class+section they're actually the Class Teacher of (currentUser.
// classTeacherOf) — same scoping convention as Attendance/Assessments, not
// the broader "any subject teacher" set.
async function assertCanManageTimetable(className, sectionName) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return { error: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) };
  }
  if (currentUser.role === 'SchoolAdmin' || currentUser.role === 'SuperAdmin') return {};
  if (currentUser.role === 'Teacher') {
    const owns = (currentUser.classTeacherOf || []).some((c) => c.class === className && c.section === sectionName);
    if (owns) return {};
  }
  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const academicSession = searchParams.get('academicSession');

  if (!className || !academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error: authError } = await assertCanManageTimetable(className, sectionName);
  if (authError) return authError;

  const timeTable = await getTimeTable(className, sectionName, academicSession);
  return NextResponse.json(timeTable);
}

export async function PUT(request) {
  const { className, sectionName = '', academicSession, schedule } = await request.json();
  if (!className || !academicSession || !schedule) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error: authError } = await assertCanManageTimetable(className, sectionName);
  if (authError) return authError;

  try {
    const timeTable = await saveTimeTable(className, sectionName, academicSession, schedule);
    return NextResponse.json(timeTable);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const academicSession = searchParams.get('academicSession');
  if (!className || !academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error: authError } = await assertCanManageTimetable(className, sectionName);
  if (authError) return authError;

  await deleteTimeTable(className, sectionName, academicSession);
  return NextResponse.json({ removed: true });
}
