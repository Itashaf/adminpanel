// Pure, dependency-free — split out of lib/academicSessions.js so
// StepAcademicSession.jsx/SessionFormModal.jsx ('use client') can keep
// importing this without pulling in that file's Prisma + resolveSchoolId's
// next/headers dependency (same split as lib/dateUtils.js/lib/noticeConstants.js).
export function suggestSessionName(startDate) {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const startYear = start.getFullYear();
  const endYearShort = `${(startYear + 1) % 100}`.padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}
