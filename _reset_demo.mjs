import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const account = await prisma.parentAccount.findFirst({
  where: { email: 'demo.parent@schoolapp360.local' },
  include: { students: true },
});
console.log('account', account?.id, account?.students?.map(s => ({id:s.id,name:`${s.firstName} ${s.lastName}`})));

if (account) {
  const studentIds = account.students.map(s => s.id);
  const fees = await prisma.studentFee.findMany({ where: { studentId: { in: studentIds } } });
  console.log('fees', fees.map(f => ({id: f.id, studentId: f.studentId, term: f.term, total: f.totalAmount, paid: f.paidAmount, status: f.status})));
}
await prisma.$disconnect();
