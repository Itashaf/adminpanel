import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';

// Print Marksheet is deliberately NOT tied to any Exam — it's just a class
// roster with whatever subject columns the caller picks, printed blank for
// hand-writing. Admin can build one for any class+section in the school; a
// Teacher only for the section(s) they're the Class Teacher of (this is a
// homeroom-compilation tool, not a subject-teacher one — see
// PrintMarksheetClient.jsx).
export async function getPrintableClassSections(currentUser) {
  const schoolId = await resolveSchoolId();

  if (currentUser.role === 'Teacher') {
    if (!currentUser.teacherId) return [];
    const sections = await prisma.section.findMany({
      where: { schoolId, classTeacherId: currentUser.teacherId, status: 'Active', name: { not: '' } },
      include: { class: { select: { name: true, academicSession: true } } },
    });
    return sections.map((s) => ({ className: s.class.name, sectionName: s.name, academicSession: s.class.academicSession }));
  }

  const sections = await prisma.section.findMany({
    where: { schoolId, status: 'Active', name: { not: '' } },
    include: { class: { select: { name: true, academicSession: true } } },
  });
  return sections.map((s) => ({ className: s.class.name, sectionName: s.name, academicSession: s.class.academicSession }));
}

// Name only — no admission ID/roll number (deliberately left off the print
// list) and no marks/status of any kind, since this has nothing to do with
// an Exam or ExamMark at all.
export async function getPrintableRoster(className, sectionName, academicSession) {
  const schoolId = await resolveSchoolId();
  const students = await prisma.student.findMany({
    where: { schoolId, academicSession, class: className, section: sectionName, status: 'Active' },
    orderBy: { firstName: 'asc' },
    select: { id: true, firstName: true, lastName: true },
  });
  return students.map((s) => ({ studentId: s.id, name: `${s.firstName} ${s.lastName}`.trim() }));
}
