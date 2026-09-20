import { NextResponse } from 'next/server';
import { getCurrentUserInfo, mergeWithDashboardActor, requireSchoolAdmin } from '@/lib/iam';
import { getLeaveBalance } from '@/lib/teacherLeaves';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/leaves/balance — a Teacher (real session) gets their own
// Casual/Sick/Earned/Other balance for the current year (or ?year=). A
// SchoolAdmin/SuperAdmin can look up any teacher's via ?teacherId=, e.g. to
// show context next to a request in the review queue.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;

  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));

  if (currentUser.role === 'Teacher') {
    // resolveSchoolId(), not currentUser.schoolId — the dashboard-toggle
    // fallback (lib/currentUser.js) never carries schoolId at all.
    const balance = await getLeaveBalance(currentUser.teacherId, await resolveSchoolId(), year);
    return NextResponse.json(balance);
  }

  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const teacherId = searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required.' }, { status: 400 });
  }
  const balance = await getLeaveBalance(teacherId, await resolveSchoolId(), year);
  return NextResponse.json(balance);
}
