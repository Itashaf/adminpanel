import { getCurrentUser } from '@/lib/currentUser';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getAllLeaveRequests, getLeavesForTeacher } from '@/lib/teacherLeaves';
import TeacherLeaveView from '@/components/leave/TeacherLeaveView';
import AdminLeaveView from '@/components/leave/AdminLeaveView';

export const metadata = {
  title: 'Leave | SchoolApp 360',
};

export default async function LeavePage() {
  const currentUser = await getCurrentUser();
  const schoolId = await resolveSchoolId();

  if (currentUser.role === 'Teacher') {
    const leaves = currentUser.teacherId ? await getLeavesForTeacher(currentUser.teacherId, schoolId) : [];
    return <TeacherLeaveView leaves={leaves} />;
  }

  const leaves = await getAllLeaveRequests(schoolId);
  return <AdminLeaveView leaves={leaves} />;
}
