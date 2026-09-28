import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { applyForLeave, getAllLeaveRequests, getLeavesForTeacher } from '@/lib/teacherLeaves';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { requirePermission } from '@/lib/rbac';

// GET /api/leaves — a Teacher (real session, mobile JWT or web Teacher
// login) sees only their own requests. A SchoolAdmin/SuperAdmin sees every
// request in the school, optionally narrowed with ?status=Pending. Both
// hold leave.view — the permission gate only confirms "can see leave data
// at all"; which subset (own vs whole-school) stays a role branch, since
// that's a data-shape difference the permission key doesn't carry.
export async function GET(request) {
  const { error: permError } = await requirePermission('leave.view');
  if (permError) return permError;

  const actor = await getCurrentUserInfo();

  if (actor?.role === 'Teacher') {
    const leaves = await getLeavesForTeacher(actor.teacherId, actor.schoolId);
    return NextResponse.json(leaves);
  }

  const { searchParams } = new URL(request.url);
  const leaves = await getAllLeaveRequests(await resolveSchoolId(), searchParams.get('status') || '');
  return NextResponse.json(leaves);
}

// POST /api/leaves — real session required, full stop. The old
// `sessionUser || mergeWithDashboardActor(sessionUser)` pattern only ever
// reached the toggle when unauthenticated (defaulting to SchoolAdmin, which
// this route's own role check would reject) or — if some other browser
// activity on the server had left the toggle set to a specific Teacher —
// let an unauthenticated request apply for leave AS that teacher.
export async function POST(request) {
  // leave.apply is also held by Principal/SuperAdmin (full-access roles),
  // but this endpoint only ever operates on a Teacher row — the
  // `!currentUser.teacherId` check right after is what actually keeps this
  // "only teachers" in practice, since only a real Teacher-shaped
  // getCurrentUserInfo() result ever carries that field.
  const { error: permError } = await requirePermission('leave.apply');
  if (permError) return permError;

  const data = await request.json();

  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (currentUser.role !== 'Teacher' || !currentUser.teacherId) {
    return NextResponse.json({ error: 'Only teachers can apply for leave.' }, { status: 403 });
  }

  try {
    const leave = await applyForLeave(currentUser, data);
    return NextResponse.json(leave);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
