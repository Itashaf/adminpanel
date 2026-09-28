import * as XLSX from 'xlsx';
import prisma from '../db';
import { resolveSchoolId } from '../auth/schoolContext';
import { addActivity, setHolistic, setRemarkText } from './monthlyReports';

const ACTIVITIES_SHEET = 'Activities';
const HOLISTIC_SHEET = 'Holistic Assessment';
const REMARKS_SHEET = 'Remarks';

const ACHIEVEMENT_LABEL_TO_VALUE = {
  participant: 'PARTICIPANT',
  '1st': 'FIRST',
  first: 'FIRST',
  '2nd': 'SECOND',
  second: 'SECOND',
  '3rd': 'THIRD',
  third: 'THIRD',
  'special mention': 'SPECIAL_MENTION',
};

const HOLISTIC_LABEL_TO_VALUE = {
  excellent: 'EXCELLENT',
  good: 'GOOD',
  support: 'SUPPORT',
};

function normalizeAchievement(raw) {
  return ACHIEVEMENT_LABEL_TO_VALUE[String(raw || '').trim().toLowerCase()] || null;
}

function normalizeHolistic(raw) {
  return HOLISTIC_LABEL_TO_VALUE[String(raw || '').trim().toLowerCase()] || null;
}

// One workbook, 3 sheets — pre-filled with this class/section's REAL
// admission numbers (not fake dummy rows) so a teacher fills in a name
// they recognize, not a generic sample.
export async function generateMonthlyImportTemplate({ className, sectionName, academicSession }) {
  const schoolId = await resolveSchoolId();
  const students = await prisma.student.findMany({
    where: { schoolId, class: className, section: sectionName, academicSession, status: 'Active' },
    select: { admissionId: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  });

  const workbook = XLSX.utils.book_new();

  const activitiesAoa = [
    ['Admission No', 'Student Name', 'Activity Name', 'Achievement'],
    ...students.map((s) => [s.admissionId, `${s.firstName} ${s.lastName}`, '', '']),
  ];
  const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesAoa);
  activitiesSheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, activitiesSheet, ACTIVITIES_SHEET);

  const holisticAoa = [
    ['Admission No', 'Student Name', 'Discipline', 'Homework Completion', 'English Communication', 'Punctuality', 'Hygiene'],
    ...students.map((s) => [s.admissionId, `${s.firstName} ${s.lastName}`, '', '', '', '', '']),
  ];
  const holisticSheet = XLSX.utils.aoa_to_sheet(holisticAoa);
  holisticSheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, holisticSheet, HOLISTIC_SHEET);

  const remarksAoa = [
    ['Admission No', 'Student Name', 'Teacher Remark'],
    ...students.map((s) => [s.admissionId, `${s.firstName} ${s.lastName}`, '']),
  ];
  const remarksSheet = XLSX.utils.aoa_to_sheet(remarksAoa);
  remarksSheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, remarksSheet, REMARKS_SHEET);

  const instructionsAoa = [
    ['Monthly Report — Bulk Import Instructions'],
    [''],
    ['Achievement values: Participant, 1st, 2nd, 3rd, Special Mention'],
    ['Holistic values: Excellent, Good, Support'],
    [''],
    ['Only fill in rows for students you have something to record — a blank row is skipped, not an error.'],
    ['A row with an unrecognized Admission No is reported as an error and skipped; every other valid row still imports.'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsAoa);
  instructionsSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Validates without writing anything — the "Preview Data / Validate"
// screen. `rows` is `{ activities: [...], holistic: [...], remarks: [...] }`,
// already parsed client-side from the uploaded Excel (same convention as
// every other bulk import in this app).
export async function previewMonthlyImport({ className, sectionName, academicSession }, rows) {
  const schoolId = await resolveSchoolId();
  const students = await prisma.student.findMany({
    where: { schoolId, class: className, section: sectionName, academicSession, status: 'Active' },
    select: { id: true, admissionId: true },
  });
  const studentIdByAdmissionId = new Map(students.map((s) => [s.admissionId, s.id]));

  const errors = [];
  const warnings = [];
  const valid = { activities: [], holistic: [], remarks: [] };

  (rows.activities || []).forEach((row, i) => {
    const admissionNo = String(row.admissionNo ?? row['Admission No'] ?? '').trim();
    const activityName = String(row.activityName ?? row['Activity Name'] ?? '').trim();
    const achievementRaw = row.achievement ?? row['Achievement'];
    if (!admissionNo && !activityName && !achievementRaw) return; // blank row, skip silently

    const rowLabel = `Activities row ${i + 2}`;
    const studentId = studentIdByAdmissionId.get(admissionNo);
    if (!studentId) return errors.push({ sheet: 'Activities', row: i + 2, message: `${rowLabel}: no student with admission number "${admissionNo}" in this class/section.` });
    if (!activityName) return errors.push({ sheet: 'Activities', row: i + 2, message: `${rowLabel}: activity name is required.` });
    const achievement = normalizeAchievement(achievementRaw);
    if (!achievement) return errors.push({ sheet: 'Activities', row: i + 2, message: `${rowLabel}: "${achievementRaw}" is not a valid achievement (Participant/1st/2nd/3rd/Special Mention).` });
    valid.activities.push({ studentId, activityName, achievement });
  });

  (rows.holistic || []).forEach((row, i) => {
    const admissionNo = String(row.admissionNo ?? row['Admission No'] ?? '').trim();
    const rowLabel = `Holistic Assessment row ${i + 2}`;
    const categories = {
      discipline: row.discipline ?? row['Discipline'],
      homeworkCompletion: row.homeworkCompletion ?? row['Homework Completion'],
      englishCommunication: row.englishCommunication ?? row['English Communication'],
      punctuality: row.punctuality ?? row['Punctuality'],
      hygiene: row.hygiene ?? row['Hygiene'],
    };
    const anyFilled = admissionNo || Object.values(categories).some(Boolean);
    if (!anyFilled) return;

    const studentId = studentIdByAdmissionId.get(admissionNo);
    if (!studentId) return errors.push({ sheet: 'Holistic Assessment', row: i + 2, message: `${rowLabel}: no student with admission number "${admissionNo}" in this class/section.` });

    const normalized = {};
    let hasError = false;
    for (const [key, raw] of Object.entries(categories)) {
      const value = normalizeHolistic(raw);
      if (!value) {
        errors.push({ sheet: 'Holistic Assessment', row: i + 2, message: `${rowLabel}: "${raw}" is not a valid value for ${key} (Excellent/Good/Support).` });
        hasError = true;
      } else {
        normalized[key] = value;
      }
    }
    if (!hasError) valid.holistic.push({ studentId, ...normalized });
  });

  (rows.remarks || []).forEach((row, i) => {
    const admissionNo = String(row.admissionNo ?? row['Admission No'] ?? '').trim();
    const remarkText = String(row.teacherRemark ?? row['Teacher Remark'] ?? '').trim();
    if (!admissionNo && !remarkText) return;

    const rowLabel = `Remarks row ${i + 2}`;
    const studentId = studentIdByAdmissionId.get(admissionNo);
    if (!studentId) return errors.push({ sheet: 'Remarks', row: i + 2, message: `${rowLabel}: no student with admission number "${admissionNo}" in this class/section.` });
    if (remarkText.length > 500) {
      errors.push({ sheet: 'Remarks', row: i + 2, message: `${rowLabel}: remark exceeds 500 characters.` });
      return;
    }
    if (!remarkText) {
      warnings.push({ sheet: 'Remarks', row: i + 2, message: `${rowLabel}: admission number given but remark is blank — skipped.` });
      return;
    }
    valid.remarks.push({ studentId, remarkText });
  });

  const totalRecords = (rows.activities?.length || 0) + (rows.holistic?.length || 0) + (rows.remarks?.length || 0);
  const successCount = valid.activities.length + valid.holistic.length + valid.remarks.length;

  return { totalRecords, successCount, errorCount: errors.length, errors, warnings, valid };
}

// Re-validates (never trusts a client-held "this was already valid" flag)
// then writes every valid row — reuses the same per-student functions the
// single-student UI uses (addActivity/setHolistic/setRemarkText), so scope
// checks (Class Teacher of this section) and the locked-report guard apply
// identically here, per student, not bypassed for being a bulk path.
export async function commitMonthlyImport(currentUser, { className, sectionName, academicSession, month }, rows) {
  const { valid, ...preview } = await previewMonthlyImport({ className, sectionName, academicSession }, rows);

  const commitErrors = [...preview.errors];
  let committedCount = 0;

  for (const row of valid.activities) {
    try {
      await addActivity(currentUser, row.studentId, academicSession, month, { activityName: row.activityName, achievement: row.achievement });
      committedCount += 1;
    } catch (err) {
      commitErrors.push({ sheet: 'Activities', message: err.message });
    }
  }
  for (const row of valid.holistic) {
    try {
      await setHolistic(currentUser, row.studentId, academicSession, month, {
        discipline: row.discipline,
        homeworkCompletion: row.homeworkCompletion,
        englishCommunication: row.englishCommunication,
        punctuality: row.punctuality,
        hygiene: row.hygiene,
      });
      committedCount += 1;
    } catch (err) {
      commitErrors.push({ sheet: 'Holistic Assessment', message: err.message });
    }
  }
  for (const row of valid.remarks) {
    try {
      await setRemarkText(currentUser, row.studentId, academicSession, month, row.remarkText);
      committedCount += 1;
    } catch (err) {
      commitErrors.push({ sheet: 'Remarks', message: err.message });
    }
  }

  return { totalRecords: preview.totalRecords, successCount: committedCount, errorCount: commitErrors.length, errors: commitErrors, warnings: preview.warnings };
}
