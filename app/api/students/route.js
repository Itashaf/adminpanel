import { NextResponse } from 'next/server';
import { addStudent, getStudentsPage } from '@/lib/students';
import { generateFeesForNewStudent } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';
import { getTeacherClassScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { readJson } from '@/lib/http';

// Teacher's roster-relevant fields only: guardian / fee / address / Aadhaar / documents /
// previousSchool stay admin-only.
const TEACHER_STUDENT_FIELDS = ['id', 'admissionId', 'firstName', 'lastName', 'initials', 'class', 'section', 'academicSession', 'status'];

// Pages of at most 100 students, never the whole school in one response (that grew past
// what a single response can carry, and past what the server can build quickly, for a
// large school). ?page=1 and ?pageSize=50 by default, 100 at most. The body is still a
// plain array of students; the paging facts are in the response headers:
//   X-Total-Count (all matching students), X-Page, X-Page-Size, X-Has-More (true/false)
// Keep calling with page=2, 3, ... until X-Has-More is false to read everything.
// Nothing in the web app or the mobile app uses this route (both call /students/paged).
export async function GET(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (actor.role !== 'SchoolAdmin' && actor.role !== 'SuperAdmin' && actor.role !== 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50));

  // A Teacher sees students of the classes they teach or are Class Teacher of
  // (assignments + homeroom), applied inside the query itself.
  const { students, total } = await getStudentsPage({
    schoolId: await resolveSchoolId(),
    page,
    pageSize,
    scopePairs: actor.role === 'Teacher' ? getTeacherClassScope(actor) : null,
  });

  // A Teacher gets only the roster fields: guardian, fee, address and Aadhaar stay admin-only.
  const rows =
    actor.role === 'Teacher'
      ? students.map((st) => Object.fromEntries(TEACHER_STUDENT_FIELDS.map((k) => [k, st[k]])))
      : students;

  return NextResponse.json(rows, {
    headers: {
      'X-Total-Count': String(total),
      'X-Page': String(page),
      'X-Page-Size': String(pageSize),
      'X-Has-More': String(page * pageSize < total),
    },
  });
}

export async function POST(request) {
  const { error: authError } = await requirePermission('students.create');
  if (authError) return authError;

  const data = await readJson(request);

  if (!data.firstName || !data.lastName || !data.admissionNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const schoolId = await resolveSchoolId();
    const student = await addStudent(data, schoolId);
    // Best-effort — see generateFeesForNewStudent's own doc comment; never
    // allowed to turn a successful student creation into a failed response.
    await generateFeesForNewStudent(schoolId, student);
    return NextResponse.json({ id: student.id, admissionId: student.admissionId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
