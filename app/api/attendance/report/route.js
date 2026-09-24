import { NextResponse } from 'next/server';
import { getStudentAttendanceReport, getAttendanceTrend } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope } from '@/lib/roleGuard';

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// GET /attendance/report?session=&class=&section=&from=&to= — a Teacher's
// class attendance history/trend over a date range, for the mobile app's
// Attendance Report screen. Reuses the same aggregation lib/attendance.js's
// getStudentAttendanceReport/getAttendanceTrend already do for the admin
// dashboard's report page (app/dashboard/attendance/reports/page.jsx) — this
// route just exposes them over HTTP, scoped to one class+section, since
// nothing called them from outside a server component before.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('session');
  const className = searchParams.get('class');
  const sectionName = searchParams.get('section');
  const to = searchParams.get('to') || toLocalDateStr(new Date());
  const from = searchParams.get('from') || (() => {
    const d = new Date(`${to}T00:00:00`);
    d.setDate(d.getDate() - 29);
    return toLocalDateStr(d);
  })();

  if (!academicSession || !className || sectionName === null) {
    return NextResponse.json({ error: 'Missing required filters' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  // Class Teacher scope only — see app/api/attendance/route.js.
  if (currentUser.role === 'Teacher' && !isClassInTeacherScope(currentUser.classTeacherOf || [], academicSession, className, sectionName)) {
    return NextResponse.json({ error: 'You can only view your own assigned class and section.' }, { status: 403 });
  }

  const filters = { academicSession, classFilter: className, sectionFilter: sectionName, from, to };
  const [students, trend] = await Promise.all([
    getStudentAttendanceReport(filters),
    getAttendanceTrend(filters),
  ]);

  return NextResponse.json({ from, to, students, trend });
}
