import { NextResponse } from 'next/server';
import { getSubjects, addSubject } from '@/lib/subjects';
import { requirePermission, requireAuth } from '@/lib/rbac';
import { readJson } from '@/lib/http';

// GET is readable by any logged-in role (Admin, Teacher, ...) — every
// picker that used to read the hardcoded SUBJECT_OPTIONS constant now
// fetches this instead (see lib/hooks/useSubjects.js), and several of those
// pickers appear in Teacher-facing forms (AssignClassModal, HomeworkFormModal).
// Left as an open read (no permission gate) — untouched by task 26, matches
// its pre-existing "any signed-in role" behavior.
export async function GET() {
  // Still readable by any signed-in role, but no longer by an anonymous caller.
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const subjects = await getSubjects();
  return NextResponse.json(subjects);
}

export async function POST(request) {
  const { error: authError } = await requirePermission('subjects.manage');
  if (authError) return authError;

  const { name, code, type } = await readJson(request);
  try {
    const subject = await addSubject({ name, code, type });
    return NextResponse.json(subject);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
