import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const teacher = await prisma.teacher.findFirst({ where: { loginEmail: 'tashafmahmood00@gmail.com' } });
const assignedClasses = (teacher.assignments || []).filter(a => a.status === 'Active').map(a => ({ academicSession: a.academicSession, class: a.class, section: a.section }));
console.log('assignedClasses', assignedClasses);

const all = await prisma.exam.findMany({ where: { schoolId: teacher.schoolId }, orderBy: { startDate: 'desc' } });

function activeSessionFor() {
  const sessions = new Set(assignedClasses.map(a => a.academicSession));
  return sessions.size === 1 ? [...sessions][0] : undefined;
}
const myClasses = new Set(assignedClasses.map(a => a.class));
const session = activeSessionFor();
console.log('resolved session filter:', session);

const visible = all.filter(exam => exam.classes.some(c => myClasses.has(c)) && exam.academicSession === session);
console.log('VISIBLE EXAMS:');
for (const e of visible) console.log(' -', e.name, e.status);

console.log('ALL EXAMS (for comparison):');
for (const e of all) console.log(' -', e.name, e.status, e.academicSession, JSON.stringify(e.classes));

await prisma.$disconnect();
