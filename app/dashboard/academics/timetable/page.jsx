import { redirect } from 'next/navigation';
import TimeTableClient from '@/components/academics/TimeTableClient';
import { getClassSectionsMap } from '@/lib/classes';
import { getActiveSession } from '@/lib/academicSessions';
import { ACADEMIC_SESSIONS } from '@/lib/students';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'Time Table | SchoolApp 360',
};

export default async function TimeTablePage() {
  // Real session only, never lib/currentUser.js's dashboard role-preview
  // toggle — that toggle doesn't know which real Teacher is actually
  // signed in, so a real Class Teacher's own timetable page could load
  // scoped to whichever teacher the toggle happened to point to instead of
  // their own (same class of bug already found and fixed on this app's
  // Leave/Assessments pages). The API route underneath already only
  // accepts a real session either way.
  const [classSections, activeSession, currentUser] = await Promise.all([
    getClassSectionsMap(),
    getActiveSession(),
    getCurrentUserInfo(),
  ]);
  if (!currentUser) redirect('/login');

  // Every signed-in user can VIEW any class's timetable (see
  // app/api/timetable/route.js's assertCanViewTimetable) — the Dropdown
  // always offers the school's full class list, never scoped down for
  // Teachers the way it used to be. Editing stays scoped: Admin-tier edits
  // any class, a Teacher only their own Class Teacher assignment
  // (currentUser.classTeacherOf) — same convention as Daily Attendance.
  const isTeacher = currentUser.role === 'Teacher';
  const ownedClassSections = isTeacher ? (currentUser.classTeacherOf || []).map((c) => ({ class: c.class, section: c.section })) : [];

  return (
    <TimeTableClient
      classSections={classSections}
      academicSession={activeSession?.name || ACADEMIC_SESSIONS[0]}
      canManageAllClasses={!isTeacher}
      ownedClassSections={ownedClassSections}
    />
  );
}
