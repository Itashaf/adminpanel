import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { getClassSectionsMap } from '@/lib/classes';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getAssessmentsForClass } from '@/lib/studentAssessments';
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

  // subjectNames isn't needed to resolve defaultClass/defaultSection below,
  // so it's fetched alongside getAssessmentsForClass further down instead
  // of blocking this first stage — one less thing on the critical path
  // before the roster query can start.
  const [classSections, sessions, activeSession] = await Promise.all([
    getClassSectionsMap(),
    getAllSessions(),
    getActiveSession(),
  ]);
  const academicSession = activeSession?.name || sessions[0]?.name || '';

  // Class Teacher scope only (currentUser.classTeacherOf), not the merged
  // assignments+classTeacherOf getTeacherClassScope uses elsewhere — a
  // Teacher only assigned a subject in a class must not see that class in
  // Assessments at all (see lib/studentAssessments.js's assertClassInScope).
  const teacherScope = isTeacher ? currentUser.classTeacherOf || [] : [];
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
    stats: { total: 0, completed: 0, pending: 0, needsAttention: 0, completionPercent: 0, avgAttendance: null },
  };
  const [rosterResult, subjectNames] = await Promise.all([
    defaultClass && defaultSection
      ? getAssessmentsForClass(currentUser, {
          className: defaultClass,
          sectionName: defaultSection,
          academicSession,
          month: defaultMonth,
          year: defaultYear,
        }).catch(() => null)
      : Promise.resolve(null),
    getSubjectNames(),
  ]);
  // Teacher has no class scope yet, or the class has no active students this
  // session — dashboard just renders the empty state.
  if (rosterResult) initialData = rosterResult;
  const subjects = subjectNames.length > 0 ? subjectNames : FALLBACK_SUBJECTS;

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
    />
  );
}
