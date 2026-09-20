import { getCurrentUserInfo, mergeWithDashboardActor } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getAllLeaveRequests, getLeavesForTeacher, getLeaveBalance } from '@/lib/teacherLeaves';
import TeacherLeaveView from '@/components/leave/TeacherLeaveView';
import AdminLeaveView from '@/components/leave/AdminLeaveView';

export const metadata = {
  title: 'Leave | SchoolApp 360',
};

// Same real-session-first pattern as POST /api/leaves (see
// app/api/leaves/route.js) — this used to call lib/currentUser.js's
// getCurrentUser(), the SchoolAdmin dashboard's global "preview as Teacher"
// toggle, which has no idea which Teacher is actually signed in on this
// device. A real Teacher web login showed leaves for whichever teacher the
// toggle happened to point to instead of their own, and never matched what
// the same Teacher's mobile app (a real JWT session) showed via the
// identical GET /api/leaves — apply on one, and it wouldn't show on the
// other. Falls back to the toggle only when there's no real session at all
// (a SchoolAdmin previewing "as Teacher" without a real teacher login).
export default async function LeavePage() {
  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));
  const schoolId = await resolveSchoolId();

  if (currentUser.role === 'Teacher') {
    const [leaves, balance] = currentUser.teacherId
      ? await Promise.all([getLeavesForTeacher(currentUser.teacherId, schoolId), getLeaveBalance(currentUser.teacherId, schoolId)])
      : [[], []];
    return <TeacherLeaveView leaves={leaves} balance={balance} />;
  }

  const leaves = await getAllLeaveRequests(schoolId);

  // One balance lookup per distinct teacher (not per leave row) — a teacher
  // with several requests shares one entry, so an admin reviewing a busy
  // queue doesn't pay for the same query repeated.
  const teacherIds = [...new Set(leaves.map((l) => l.teacherId))];
  const balances = await Promise.all(teacherIds.map((id) => getLeaveBalance(id, schoolId)));
  const balanceByTeacher = Object.fromEntries(teacherIds.map((id, i) => [id, balances[i]]));

  return <AdminLeaveView leaves={leaves} balanceByTeacher={balanceByTeacher} />;
}
