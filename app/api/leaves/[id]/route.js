import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { reviewLeaveRequest } from '@/lib/teacherLeaves';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// PATCH /api/leaves/[id] — Approve or Reject. Admin-only; a Teacher can
// never review their own (or anyone's) leave request.
export async function PATCH(request, { params }) {
  const { actor, error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const { status, reviewNote } = await request.json();

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
