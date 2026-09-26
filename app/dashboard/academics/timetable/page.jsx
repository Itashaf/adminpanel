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

  // Class Teacher scope only (currentUser.classTeacherOf) — a Teacher only
  // builds a timetable for a class+section they're actually the Class
  // Teacher of, same convention as Daily Attendance. Restricting the map
  // itself (not just the API) means the Dropdown never even offers another
  // class to pick.
  const isTeacher = currentUser.role === 'Teacher';
  const scopedClassSections = isTeacher
    ? Object.fromEntries(
        (currentUser.classTeacherOf || []).map((c) => [c.class, c.allSections?.length ? c.allSections : [c.section]])
      )
    : classSections;

  return (
    <TimeTableClient
      classSections={scopedClassSections}
      academicSession={activeSession?.name || ACADEMIC_SESSIONS[0]}
      canManageAllClasses={!isTeacher}
    />
  );
}
