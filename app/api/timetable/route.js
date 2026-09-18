import { NextResponse } from 'next/server';
import { getTimeTable, saveTimeTable, deleteTimeTable } from '@/lib/timetable';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const academicSession = searchParams.get('academicSession');

  if (!className || !academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const timeTable = await getTimeTable(className, sectionName, academicSession);
  return NextResponse.json(timeTable);
}

export async function PUT(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { className, sectionName = '', academicSession, schedule } = await request.json();
  if (!className || !academicSession || !schedule) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const timeTable = await saveTimeTable(className, sectionName, academicSession, schedule);
    return NextResponse.json(timeTable);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const academicSession = searchParams.get('academicSession');
  if (!className || !academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await deleteTimeTable(className, sectionName, academicSession);
  return NextResponse.json({ removed: true });
}
