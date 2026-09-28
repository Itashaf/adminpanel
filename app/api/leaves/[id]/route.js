import { NextResponse } from 'next/server';
import { reviewLeaveRequest } from '@/lib/teacherLeaves';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { requirePermission } from '@/lib/rbac';

// PATCH /api/leaves/[id] — Approve or Reject. Admin-only; a Teacher can
// never review their own (or anyone's) leave request — neither
// leave.approve nor leave.reject is in Teacher's default permission set.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const { status, reviewNote } = await request.json();

  const permissionKey = status === 'Rejected' ? 'leave.reject' : 'leave.approve';
  const { user: actor, error } = await requirePermission(permissionKey);
  if (error) return error;

  try {
    const leave = await reviewLeaveRequest(id, await resolveSchoolId(), {
      status,
      reviewNote,
      reviewerName: actor.name,
    });
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    }
    return NextResponse.json(leave);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
