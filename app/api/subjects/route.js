import { NextResponse } from 'next/server';
import { getSubjects, addSubject } from '@/lib/subjects';
import { requireSchoolAdmin } from '@/lib/iam';

// GET is readable by any logged-in role (Admin, Teacher, ...) — every
// picker that used to read the hardcoded SUBJECT_OPTIONS constant now
// fetches this instead (see lib/hooks/useSubjects.js), and several of those
// pickers appear in Teacher-facing forms (AssignClassModal, HomeworkFormModal).
export async function GET() {
  const subjects = await getSubjects();
  return NextResponse.json(subjects);
}

export async function POST(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { name, code, type } = await request.json();
  try {
    const subject = await addSubject({ name, code, type });
    return NextResponse.json(subject);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
