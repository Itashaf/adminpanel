import prisma from './db';

// Read-only checks that two copies of the same fact still agree. Nothing is changed here: a
// mismatch is reported (and logged) so a person can look at it. Run by the reconcile cron.
//
// 1. A fee's `paidAmount` is stored on the fee and is also the sum of its SUCCESS payments.
// 2. A student's class/section/session are stored on the student and also in the enrollment row
//    of that session (see lib/students.js).
const SAMPLE_SIZE = 20;

export async function checkFeeAndPlacementConsistency() {
  const [feeMismatches, placementMismatches] = await Promise.all([
    prisma.$queryRaw`
      SELECT f."id", f."schoolId"
      FROM "StudentFee" f
      WHERE f."paidAmount" <> COALESCE(
        (SELECT SUM(p."amount") FROM "Payment" p WHERE p."studentFeeId" = f."id" AND p."status" = 'SUCCESS'), 0)`,
    prisma.$queryRaw`
      SELECT s."id", s."schoolId"
      FROM "Students" s
      LEFT JOIN "AcademicSessions" a ON a."schoolId" = s."schoolId" AND a."name" = s."academicSession"
      LEFT JOIN "StudentEnrollments" e ON e."studentId" = s."id" AND e."academicSessionId" = a."id"
      LEFT JOIN "Classes" c ON c."id" = e."classId"
      LEFT JOIN "Sections" sec ON sec."id" = e."sectionId"
      WHERE s."status" = 'Active'
        AND (e."id" IS NULL OR c."name" <> s."class" OR COALESCE(sec."name", '') <> COALESCE(s."section", ''))`,
  ]);

  const result = {
    feePaidAmountMismatches: { count: feeMismatches.length, sampleFeeIds: feeMismatches.slice(0, SAMPLE_SIZE).map((r) => r.id) },
    studentPlacementMismatches: { count: placementMismatches.length, sampleStudentIds: placementMismatches.slice(0, SAMPLE_SIZE).map((r) => r.id) },
  };
  if (feeMismatches.length || placementMismatches.length) {
    console.error('consistency check found mismatches', JSON.stringify(result));
  }
  return result;
}
