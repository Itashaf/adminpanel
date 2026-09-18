import * as XLSX from 'xlsx';
import { BULK_IMPORT_COLUMNS } from '@/lib/bulkImportColumns';

// Same column set/instructions as the filled "Sample Excel" template
// (../template/route.js), but the data sheet has only the header row — for
// someone who just wants the exact expected format to fill in directly,
// without first deleting the demo rows.
const HEADERS = BULK_IMPORT_COLUMNS.map((c) => c.label);

function buildBlankDataSheet() {
  return XLSX.utils.aoa_to_sheet([HEADERS]);
}

function buildInstructionsSheet() {
  const lines = [
    ['Bulk Import Students — Instructions'],
    [''],
    ['1. One row = one student. You can list multiple classes in the same file — either:'],
    ['   a) put every student on one sheet and fill the Class/Section columns per row, or'],
    ['   b) use one sheet ("tab") per class, e.g. "Class 8 - A" — then Class/Section'],
    ['      can be left blank and will be taken from the tab name.'],
    [''],
    ['2. Required columns: Admission Number, First Name, Last Name, DOB, Gender, Class,'],
    ['   Section, Address Line 1, City, State, PIN Code, and at least one of'],
    ['   Father Name / Mother Name (with the matching phone number).'],
    [''],
    ['3. Everything else is optional and can be filled in later from the student’s own'],
    ['   profile after import.'],
    [''],
    ['4. Admission Number must be unique — a row with a number already in use will be'],
    ['   skipped and reported after import, not the whole file.'],
    [''],
    ['The "Students" tab in this workbook has only the header row — add your own rows'],
    ['below it, or rename/duplicate the tab per class (e.g. "Class 8 - A") the same way'],
    ['the filled Sample Excel demonstrates.'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(lines);
  sheet['!cols'] = [{ wch: 90 }];
  return sheet;
}

export async function GET() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildInstructionsSheet(), 'Instructions');
  XLSX.utils.book_append_sheet(workbook, buildBlankDataSheet(), 'Students');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="student-bulk-import-blank.xlsx"',
    },
  });
}
