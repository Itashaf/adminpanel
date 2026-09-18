import TeachersHeader from '@/components/teachers/TeachersHeader';
import TeachersStats from '@/components/teachers/TeachersStats';
import TeachersExplorer from '@/components/teachers/TeachersExplorer';
import { getAllTeachers, getTeacherStats } from '@/lib/teachers';
import { getClassOptions } from '@/lib/students';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Teachers | SchoolApp 360',
};

export default async function TeachersPage() {
  const schoolId = await resolveSchoolId();
  const [teachers, stats, classOptions] = await Promise.all([
    getAllTeachers(schoolId),
    getTeacherStats(schoolId),
    getClassOptions(),
  ]);

  return (
    <div className="space-y-6">
      <TeachersHeader />
      <TeachersStats stats={stats} />
      <TeachersExplorer teachers={teachers} classOptions={classOptions} />
    </div>
  );
}
