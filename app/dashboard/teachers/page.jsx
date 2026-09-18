import TeachersHeader from '@/components/teachers/TeachersHeader';
import TeachersStats from '@/components/teachers/TeachersStats';
import TeachersExplorer from '@/components/teachers/TeachersExplorer';
import { getTeachersPage, getTeacherStats } from '@/lib/teachers';
import { getClassOptions } from '@/lib/students';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Teachers | SchoolApp 360',
};

const PAGE_SIZE = 10;

export default async function TeachersPage() {
  const schoolId = await resolveSchoolId();
  const [page1, stats, classOptions] = await Promise.all([
    getTeachersPage({ schoolId, page: 1, pageSize: PAGE_SIZE }),
    getTeacherStats(schoolId),
    getClassOptions(),
  ]);

  return (
    <div className="space-y-6">
      <TeachersHeader />
      <TeachersStats stats={stats} />
      <TeachersExplorer
        initialTeachers={page1.teachers}
        initialTotal={page1.total}
        classOptions={classOptions}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
