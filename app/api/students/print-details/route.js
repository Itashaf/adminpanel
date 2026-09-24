import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentsPage } from '@/lib/students';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// A student only ever has one `guardian` + optional `secondaryGuardian` (see
// lib/students.js's buildStudentFields) — either one could be recorded as
// Father or Mother, so both are checked. Mirrors
// components/students/StudentListReport.jsx's own findParentName.
function findParentName(student, relationship) {
  if (student.guardian?.relationship === relationship) return student.guardian.fullName || '';
  if (student.secondaryGuardian?.relationship === relationship) return student.secondaryGuardian.fullName || '';
  return '';
}

function formatAddress(address) {
  if (!address) return '';
  return [address.line1, address.line2, address.city, address.state, address.pinCode].filter(Boolean).join(', ');
}

// GET /students/print-details?class=&section= — the same full detail sheet
// a Teacher can already print from the web dashboard's Student List page
// (see components/students/StudentListReport.jsx), now for the mobile app's
// Printables module. GET /students/paged deliberately strips guardian/
// address/DOB for a Teacher (Teacher-safe fields only, used by the regular
// roster screen) — this route is the one place those fields are allowed
// through, and only for a class this teacher is the Class Teacher of
// (currentUser.classTeacherOf), matching the web page it mirrors.
export async function GET(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role !== 'Teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classFilter = searchParams.get('class') || '';
  const sectionFilter = searchParams.get('section') || '';
  if (!classFilter || !sectionFilter) {
    return NextResponse.json({ error: 'class and section are required.' }, { status: 400 });
  }

  const { students } = await getStudentsPage({
    schoolId: await resolveSchoolId(),
    page: 1,
    pageSize: 500,
    classFilter,
    sectionFilter,
    statusFilter: 'Active',
    scopePairs: actor.classTeacherOf || [],
  });

  const rows = students
    .map((s) => ({
      id: s.id,
      admissionId: s.admissionId,
      name: `${s.firstName} ${s.lastName}`,
      dob: s.dob,
      gender: s.gender || '',
      fatherName: findParentName(s, 'Father'),
      motherName: findParentName(s, 'Mother'),
      guardianPhone: s.guardian?.phone || '',
      address: formatAddress(s.address),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ students: rows });
}
