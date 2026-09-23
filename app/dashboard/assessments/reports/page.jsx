import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { getTeacherClassScope } from '@/lib/roleGuard';
import { getClassSectionsMap } from '@/lib/classes';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getClassAssessmentSummary } from '@/lib/studentAssessments';
import AssessmentReportsView from '@/components/assessments/AssessmentReportsView';

export const metadata = {
  title: 'Assessment Reports | SchoolApp 360',
};

export default async function AssessmentReportsPage({ searchParams }) {
  const query = await searchParams;
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const isTeacher = currentUser.role === 'Teacher';

  const [classSections, sessions, activeSession] = await Promise.all([
    getClassSectionsMap(),
    getAllSessions(),
    getActiveSession(),
  ]);
  const academicSession = activeSession?.name || sessions[0]?.name || '';

  const teacherScope = isTeacher ? getTeacherClassScope(currentUser) : [];
  const classOptions = isTeacher
    ? [...new Set(teacherScope.map((a) => a.class))].map((c) => ({ value: c, label: c }))
    : Object.keys(classSections).map((c) => ({ value: c, label: c }));

  const className = query.class || (isTeacher ? teacherScope[0]?.class : classOptions[0]?.value) || '';
  const sectionName =
    query.section ||
    (isTeacher ? teacherScope.find((a) => a.class === className)?.section : (classSections[className] || [])[0]) ||
    '';

  const now = new Date();
  const month = Number(query.month) || now.getMonth() + 1;
  const year = Number(query.year) || now.getFullYear();

  let summary = {
    totals: { total: 0, completed: 0, pending: 0, excellent: 0, good: 0, average: 0, needsAttention: 0 },
    overallCounts: {},
    behaviourCounts: {},
    academicCounts: {},
    activityCounts: {},
    perStudent: [],
  };
  if (className && sectionName) {
    try {
      summary = await getClassAssessmentSummary(currentUser, { className, sectionName, academicSession, month, year });
    } catch {
      // Teacher has no class scope yet — report just renders the empty state.
    }
  }

  return (
    <AssessmentReportsView
      summary={summary}
      classOptions={classOptions}
      classSections={classSections}
      isTeacher={isTeacher}
      teacherScope={teacherScope}
      academicSession={academicSession}
      defaultClass={className}
      defaultSection={sectionName}
      defaultMonth={month}
      defaultYear={year}
    />
  );
}
