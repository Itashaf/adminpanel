import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const teacher = await prisma.teacher.findFirst({ where: { loginEmail: 'tashafmahmood00@gmail.com' } });
console.log('teacher assignedClasses:', JSON.stringify(teacher.assignments));

const exams = await prisma.exam.findMany({ where: { schoolId: teacher.schoolId }, orderBy: { createdAt: 'desc' }, take: 5 });
for (const e of exams) {
  console.log('---');
  console.log('name:', e.name, '| status:', e.status, '| session:', e.academicSession, '| classes:', JSON.stringify(e.classes));
}
await prisma.$disconnect();
