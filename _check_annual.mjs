import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const teacher = await prisma.teacher.findFirst({ where: { loginEmail: 'tashafmahmood00@gmail.com' } });
console.log('teacher', teacher.id, teacher.schoolId, JSON.stringify(teacher.assignments));

const exam = await prisma.exam.findFirst({ where: { schoolId: teacher.schoolId, name: { contains: 'Annual', mode: 'insensitive' } } });
console.log('exam', exam?.id, exam?.name, exam?.status);

const schedules = await prisma.examSchedule.findMany({ where: { examId: exam.id } });
for (const s of schedules) {
  console.log('schedule', s.id, s.subject, s.className, s.sectionName, s.maxMarks);
}

for (const s of schedules) {
  const marks = await prisma.examMark.findMany({ where: { examScheduleId: s.id }, include: { student: { select: { firstName: true } } } });
  console.log('--- marks for', s.subject, '---');
  for (const m of marks) console.log(m.student.firstName, m.status, m.marksObtained, m.isAbsent);
  if (marks.length === 0) console.log('(no marks rows yet)');
}

await prisma.$disconnect();
