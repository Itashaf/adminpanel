import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { getTeacherClassScope } from '@/lib/roleGuard';
import { getClassSectionsMap } from '@/lib/classes';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getAssessmentsForClass, getRecentlyAssessed } from '@/lib/studentAssessments';
import { getSubjectNames } from '@/lib/subjects';
import { FALLBACK_SUBJECTS } from '@/lib/assessmentConstants';
import AssessmentDashboard from '@/components/assessments/AssessmentDashboard';

export const metadata = {
  title: 'Monthly Assessments | SchoolApp 360',
};

export default async function AssessmentsPage() {
  // Real session first — carries classTeacherOf, which a Class Teacher
  // needs even with zero subject assignments (same fix as every other
  // class-scoped module this session touched).
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const isTeacher = currentUser.role === 'Teacher';

  const [classSections, sessions, activeSession, subjectNames] = await Promise.all([
    getClassSectionsMap(),
    getAllSessions(),
    getActiveSession(),
    getSubjectNames(),
  ]);
  const academicSession = activeSession?.name || sessions[0]?.name || '';
  const subjects = subjectNames.length > 0 ? subjectNames : FALLBACK_SUBJECTS;

  const teacherScope = isTeacher ? getTeacherClassScope(currentUser) : [];
  const classOptions = isTeacher
    ? [...new Set(teacherScope.map((a) => a.class))].map((c) => ({ value: c, label: c }))
    : Object.keys(classSections).map((c) => ({ value: c, label: c }));

  const defaultClass = isTeacher ? teacherScope[0]?.class || '' : classOptions[0]?.value || '';
  const defaultSection = isTeacher
    ? teacherScope.find((a) => a.class === defaultClass)?.section || ''
    : (classSections[defaultClass] || [])[0] || '';

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  let initialData = {
    roster: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    stats: { total: 0, completed: 0, pending: 0, needsAttention: 0, completionPercent: 0 },
  };
  if (defaultClass && defaultSection) {
    try {
      initialData = await getAssessmentsForClass(currentUser, {
        className: defaultClass,
        sectionName: defaultSection,
        academicSession,
        month: defaultMonth,
        year: defaultYear,
      });
    } catch {
      // Teacher has no class scope yet, or the class has no active students
      // this session — dashboard just renders the empty state.
    }
  }

  const recentlyAssessed = await getRecentlyAssessed(currentUser, 5).catch(() => []);

  return (
    <AssessmentDashboard
      initialData={initialData}
      classOptions={classOptions}
      classSections={classSections}
      isTeacher={isTeacher}
      teacherScope={teacherScope}
      academicSession={academicSession}
      defaultClass={defaultClass}
      defaultSection={defaultSection}
      defaultMonth={defaultMonth}
      defaultYear={defaultYear}
      subjects={subjects}
      recentlyAssessed={recentlyAssessed}
    />
  );
}
