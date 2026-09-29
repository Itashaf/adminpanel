import prisma from '../db';
import { resolveSchoolId } from '../auth/schoolContext';

// Same thresholds the plan promised (90+/75-89/60-74/<60) — every
// average % anywhere in the Performance Report module (Subject Test
// average here, Monthly Report's Academic section, Yearly grade calc)
// runs through this one function so the bands can never drift apart.
export function performanceStatusFor(percent) {
  if (percent >= 90) return 'Excellent';
  if (percent >= 75) return 'Good';
  if (percent >= 60) return 'Average';
  return 'Needs Support';
}

// A Teacher may create/upload marks for a class+section+subject either
// because they're actually assigned to teach that subject there
// (currentUser.assignedClasses), OR because they're the Class Teacher of
// that class+section (currentUser.classTeacherOf) — a Class Teacher can
// test any subject for their own homeroom, not just ones they personally
// teach. Same "don't trust the frontend" boundary as every other scope
// check in this app. Admin/Principal (role !== 'Teacher') are
// unrestricted, same convention as Attendance/Timetable.
async function assertTeacherCanTestSubject(currentUser, { className, sectionName, subjectName }) {
  if (currentUser.role !== 'Teacher') return;
  const assignedMatch = (currentUser.assignedClasses || []).some(
    (a) => a.class === className && a.section === sectionName && a.subject === subjectName
  );
  const isClassTeacher = (currentUser.classTeacherOf || []).some((c) => c.class === className && c.section === sectionName);
  if (!assignedMatch && !isClassTeacher) {
    throw new Error('You are not assigned to teach this subject for this class/section.');
  }
}

export async function createSubjectTest(currentUser, { subjectId, testName, academicSession, className, sectionName = '', testDate, maxMarks, teacherId }) {
  if (!subjectId || !testName || !academicSession || !className || !testDate || !maxMarks) {
    throw new Error('Missing required fields.');
  }
  if (maxMarks <= 0) throw new Error('Max marks must be greater than 0.');

  const schoolId = await resolveSchoolId();
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
  if (!subject) throw new Error('Subject not found.');

  await assertTeacherCanTestSubject(currentUser, { className, sectionName, subjectName: subject.name });

  // A real Teacher session always attributes the test to themselves — the
  // request body can never override that. Only Admin/Principal (no
  // teacherId of their own) may pass one explicitly, and it still must be
  // a real teacher in this school.
  const resolvedTeacherId = currentUser.role === 'Teacher' ? currentUser.teacherId : teacherId;
  if (!resolvedTeacherId) throw new Error('teacherId is required.');
  const teacher = await prisma.teacher.findFirst({ where: { id: resolvedTeacherId, schoolId } });
  if (!teacher) throw new Error('Teacher not found.');

  return prisma.subjectTest.create({
    data: {
      schoolId,
      teacherId: resolvedTeacherId,
      subjectId,
      testName,
      academicSession,
      className,
      sectionName,
      testDate: new Date(testDate),
      maxMarks,
    },
    include: { subject: { select: { name: true } } },
  });
}

export async function getSubjectTests({ academicSession = '', className = '', sectionName = '', subjectId = '', teacherId = '' } = {}) {
  const schoolId = await resolveSchoolId();
  const tests = await prisma.subjectTest.findMany({
    where: {
      schoolId,
      ...(academicSession ? { academicSession } : {}),
      ...(className ? { className } : {}),
      ...(sectionName ? { sectionName } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(teacherId ? { teacherId } : {}),
    },
    include: { subject: { select: { name: true } }, _count: { select: { marks: true } } },
    orderBy: { testDate: 'desc' },
  });

  // Roster size only depends on class+section, so fetch each distinct
  // combination once instead of re-querying students per test row.
  const classSectionPairs = [...new Set(tests.map((t) => `${t.className}\u0000${t.sectionName}`))].map((k) => {
    const [c, s] = k.split('\u0000');
    return { class: c, section: s };
  });
  const rosterCounts = new Map();
  await Promise.all(
    classSectionPairs.map(async ({ class: c, section: s }) => {
      const count = await prisma.student.count({ where: { schoolId, class: c, section: s, status: 'Active' } });
      rosterCounts.set(`${c}\u0000${s}`, count);
    })
  );

  return tests.map((t) => {
    const totalStudents = rosterCounts.get(`${t.className}\u0000${t.sectionName}`) ?? 0;
    const enteredCount = t._count.marks;
    const status = enteredCount === 0 ? 'DRAFT' : enteredCount >= totalStudents && totalStudents > 0 ? 'COMPLETED' : 'IN_PROGRESS';
    return {
      id: t.id,
      subjectId: t.subjectId,
      subjectName: t.subject.name,
      testName: t.testName,
      academicSession: t.academicSession,
      className: t.className,
      sectionName: t.sectionName,
      testDate: t.testDate.toISOString().slice(0, 10),
      maxMarks: t.maxMarks,
      marksEnteredCount: enteredCount,
      totalStudents,
      status,
    };
  });
}

export async function getSubjectTestById(id) {
  const schoolId = await resolveSchoolId();
  const test = await prisma.subjectTest.findFirst({
    where: { id, schoolId },
    include: { subject: { select: { name: true } }, marks: true },
  });
  if (!test) return null;

  // Full class roster, not just students who already have a mark row — a
  // fresh test has zero marks entered, and the manual entry grid needs
  // every student to type into, not just whoever a previous partial save
  // already covered.
  const roster = await prisma.student.findMany({
    where: { schoolId, class: test.className, section: test.sectionName, status: 'Active' },
    select: { id: true, admissionId: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  });
  const markByStudentId = new Map(test.marks.map((m) => [m.studentId, m.marksObtained]));
  const enteredCount = test.marks.length;
  // No separate lock/publish workflow exists for Subject Tests (unlike
  // Monthly/Yearly Reports) — this status is purely derived from how many
  // of the roster's marks are actually entered, not a stored field.
  const status = enteredCount === 0 ? 'DRAFT' : enteredCount === roster.length ? 'COMPLETED' : 'IN_PROGRESS';

  return {
    id: test.id,
    subjectId: test.subjectId,
    subjectName: test.subject.name,
    testName: test.testName,
    academicSession: test.academicSession,
    className: test.className,
    sectionName: test.sectionName,
    testDate: test.testDate.toISOString().slice(0, 10),
    maxMarks: test.maxMarks,
    status,
    totalStudents: roster.length,
    enteredCount,
    marks: roster.map((s) => {
      const marksObtained = markByStudentId.get(s.id) ?? null;
      return {
        studentId: s.id,
        admissionId: s.admissionId,
        studentName: `${s.firstName} ${s.lastName}`,
        marksObtained,
        percent: marksObtained != null ? Math.round((marksObtained / test.maxMarks) * 1000) / 10 : null,
      };
    }),
  };
}

// Bulk mark upload — `rows` is already-parsed JSON (client parses the
// Excel with the `xlsx` package and POSTs plain rows, same convention as
// the Students bulk-import: app/api/students/bulk-import). Upserts on
// [testId, studentId] so re-uploading the same test's corrected Excel
// fixes marks instead of duplicating rows. Never throws for a bad row —
// collects it as an error and keeps going, same "partial success" shape
// as bulkCreateStudents.
export async function uploadSubjectTestMarks(testId, rows) {
  const schoolId = await resolveSchoolId();
  const test = await prisma.subjectTest.findFirst({ where: { id: testId, schoolId } });
  if (!test) throw new Error('Test not found.');

  const students = await prisma.student.findMany({
    where: { schoolId, class: test.className, section: test.sectionName },
    select: { id: true, admissionId: true },
  });
  const studentIdByAdmissionId = new Map(students.map((s) => [s.admissionId, s.id]));

  const errors = [];
  const validRows = [];
  rows.forEach((row, i) => {
    const admissionNo = String(row.admissionNo ?? row['Admission No'] ?? '').trim();
    const marksObtained = Number(row.marks ?? row['Marks']);
    const rowNum = i + 1;

    if (!admissionNo) {
      errors.push({ row: rowNum, message: 'Missing admission number.' });
      return;
    }
    const studentId = studentIdByAdmissionId.get(admissionNo);
    if (!studentId) {
      errors.push({ row: rowNum, admissionNo, message: `No student with admission number "${admissionNo}" in ${test.className} - ${test.sectionName}.` });
      return;
    }
    if (!Number.isFinite(marksObtained) || marksObtained < 0) {
      errors.push({ row: rowNum, admissionNo, message: 'Marks must be a non-negative number.' });
      return;
    }
    if (marksObtained > test.maxMarks) {
      errors.push({ row: rowNum, admissionNo, message: `Marks (${marksObtained}) exceed max marks (${test.maxMarks}).` });
      return;
    }
    validRows.push({ studentId, admissionNo, marksObtained });
  });

  for (const row of validRows) {
    await prisma.subjectTestMark.upsert({
      where: { testId_studentId: { testId, studentId: row.studentId } },
      update: { marksObtained: row.marksObtained },
      create: { testId, studentId: row.studentId, marksObtained: row.marksObtained },
    });
  }

  return {
    totalRecords: rows.length,
    successCount: validRows.length,
    errorCount: errors.length,
    errors,
  };
}

// A student's per-subject test performance for the Monthly Report's
// Academic Performance section — one row per subject: latest test name,
// average % across every test this month for that subject, and the
// derived status. `month` is 'YYYY-MM'; omitted means the whole
// academic session (used by the Yearly rollup).
export async function getStudentSubjectPerformance(studentId, academicSession, month = '') {
  const schoolId = await resolveSchoolId();
  const monthStart = month ? new Date(`${month}-01T00:00:00`) : null;
  const monthEnd = month ? new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1) : null;

  const marks = await prisma.subjectTestMark.findMany({
    where: {
      studentId,
      test: {
        schoolId,
        academicSession,
        ...(month ? { testDate: { gte: monthStart, lt: monthEnd } } : {}),
      },
    },
    include: { test: { select: { subjectId: true, testName: true, testDate: true, maxMarks: true, subject: { select: { name: true } } } } },
    orderBy: { test: { testDate: 'desc' } },
  });

  const bySubject = new Map();
  for (const m of marks) {
    const key = m.test.subjectId;
    const entry = bySubject.get(key) || { subjectName: m.test.subject.name, latestTest: null, totalPercent: 0, count: 0 };
    const percent = (m.marksObtained / m.test.maxMarks) * 100;
    entry.totalPercent += percent;
    entry.count += 1;
    if (!entry.latestTest) entry.latestTest = m.test.testName; // marks already ordered latest-first
    bySubject.set(key, entry);
  }

  return [...bySubject.entries()].map(([subjectId, entry]) => {
    const average = Math.round((entry.totalPercent / entry.count) * 10) / 10;
    return {
      subjectId,
      subjectName: entry.subjectName,
      latestTest: entry.latestTest,
      averagePercent: average,
      status: performanceStatusFor(average),
    };
  });
}
