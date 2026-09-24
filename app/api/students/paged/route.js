import { NextResponse } from 'next/server';
import { getStudentsPage } from '@/lib/students';
import { getCurrentUserInfo } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// Real query-level pagination for the Students dashboard table — separate
// from GET /api/students (which stays untouched: the mobile app relies on
// that route returning the whole roster as a plain array, and changing its
// response shape would break it). A Teacher's class scope is resolved here
// from their own session, never trusted from the client, and enforced in
// the query itself (see lib/students.js's getStudentsPage `scopePairs`) —
// same security boundary the old full-fetch-then-filter-in-JS version had,
// just applied before the DB round trip instead of after it.
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
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 10));

  const { students, total } = await getStudentsPage({
    schoolId: await resolveSchoolId(),
    page,
    pageSize,
    search: searchParams.get('search') || '',
    classFilter: searchParams.get('class') || '',
    sectionFilter: searchParams.get('section') || '',
    statusFilter: searchParams.get('status') || '',
    // Class Teacher scope only — see app/dashboard/students/page.jsx.
    scopePairs: actor.role === 'Teacher' ? actor.classTeacherOf || [] : null,
  });

  // Same field-stripping GET /api/students already applies for a Teacher —
  // guardian/fee/address/aadhaar stay admin-only.
  const rows =
    actor.role === 'Teacher'
      ? students.map((s) => ({
          id: s.id,
          admissionId: s.admissionId,
          firstName: s.firstName,
          lastName: s.lastName,
          initials: s.initials,
          class: s.class,
          section: s.section,
          academicSession: s.academicSession,
          status: s.status,
        }))
      : students;

  return NextResponse.json({ students: rows, total, page, pageSize });
}
