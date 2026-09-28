import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getLeaveBalance } from '@/lib/teacherLeaves';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { requirePermission } from '@/lib/rbac';

// GET /api/leaves/balance — a Teacher (real session) gets their own
// Casual/Sick/Earned/Other balance for the current year (or ?year=). A
// SchoolAdmin/SuperAdmin can look up any teacher's via ?teacherId=, e.g. to
// show context next to a request in the review queue.
export async function GET(request) {
  const { error: permError } = await requirePermission('leave.view');
  if (permError) return permError;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;

  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (currentUser.role === 'Teacher') {
    // resolveSchoolId(), not currentUser.schoolId — the dashboard-toggle
    // fallback (lib/currentUser.js) never carries schoolId at all.
    const balance = await getLeaveBalance(currentUser.teacherId, await resolveSchoolId(), year);
    return NextResponse.json(balance);
  }

  const teacherId = searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required.' }, { status: 400 });
  }
  const balance = await getLeaveBalance(teacherId, await resolveSchoolId(), year);
  return NextResponse.json(balance);
}
