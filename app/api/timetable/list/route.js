import { NextResponse } from 'next/server';
import { listTimeTables } from '@/lib/timetable';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  if (!academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const rows = await listTimeTables(academicSession);
  return NextResponse.json(rows);
}
