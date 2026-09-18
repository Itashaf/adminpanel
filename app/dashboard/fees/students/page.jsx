import StudentFeesExplorer from '@/components/fees/StudentFeesExplorer';
import { getFeesStats, getStudentFeeSummaries } from '@/lib/fees';
import { getStudentStats } from '@/lib/students';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Student Fees | SchoolApp 360',
};

const PAGE_SIZE = 10;

export default async function FeesStudentsPage({ searchParams }) {
  const params = await searchParams;
  const schoolId = await resolveSchoolId();

  // Filters live in the URL (not just client state) specifically so a
  // refresh — or sharing/bookmarking the link — comes back to the same
  // class/section/status/search/sort/page instead of resetting to blank;
  // see StudentFeesExplorer's router.replace on every filter change.
  const initialFilters = {
    className: params?.class || '',
    section: params?.section || '',
    status: params?.status || '',
    search: params?.search || '',
    sortBy: params?.sortBy || '',
    sortDir: params?.sortDir || 'desc',
    page: Number(params?.page) || 1,
  };

  const [feesStats, studentStats, school, initialResult] = await Promise.all([
    getFeesStats(),
    getStudentStats(schoolId),
    getSchoolSettings(),
    getStudentFeeSummaries({
      className: initialFilters.className,
      section: initialFilters.section,
      status: initialFilters.status,
      search: initialFilters.search,
      sortBy: initialFilters.sortBy,
      sortDir: initialFilters.sortDir,
      page: initialFilters.page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <StudentFeesExplorer
      feesStats={feesStats}
      totalStudents={studentStats.active}
      initialResult={initialResult}
      initialFilters={initialFilters}
      pageSize={PAGE_SIZE}
      school={school}
    />
  );
}
