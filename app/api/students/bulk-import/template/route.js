import * as XLSX from 'xlsx';
import { BULK_IMPORT_COLUMNS } from '@/lib/bulkImportColumns';

// Three classwise tabs with full-detail dummy rows, demonstrating the exact
// format bulk import expects — deliberately fills Class/Section on every
// row too (rather than relying on the sheet-name fallback) so the sample
// reads as a normal filled-in spreadsheet; the fallback behavior is
// explained on the Instructions tab instead.
const SAMPLE_SHEETS = [
  {
    name: 'Class 6 - A',
    rows: [
      {
        admissionNumber: 'ADM-2027-0001',
        admissionDate: '2027-04-01',
        academicSession: '2026-27',
        firstName: 'Ishaan',
        middleName: '',
        lastName: 'Verma',
        dob: '2015-03-12',
        gender: 'Male',
        bloodGroup: 'B+',
        nationality: 'Indian',
        aadhaarNumber: '1234 5678 9012',
        whatsappNumber: '9876543210',
        class: 'Class 6',
        section: 'A',
        fatherName: 'Rakesh Verma',
        fatherPhone: '9876543210',
        fatherOccupation: 'Engineer',
        motherName: 'Sunita Verma',
        motherPhone: '9876500000',
        motherOccupation: 'Teacher',
        addressLine1: '12, MG Road',
        addressLine2: 'Near City Mall',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pinCode: '226001',
        emergencyContactName: 'Rakesh Verma',
        emergencyContactPhone: '9876543210',
        emergencyContactRelationship: 'Father',
      },
      {
        admissionNumber: 'ADM-2027-0002',
        admissionDate: '2027-04-01',
        academicSession: '2026-27',
        firstName: 'Ananya',
        middleName: '',
        lastName: 'Rao',
        dob: '2015-07-22',
        gender: 'Female',
        bloodGroup: 'O+',
        nationality: 'Indian',
        aadhaarNumber: '2345 6789 0123',
        whatsappNumber: '9123456780',
        class: 'Class 6',
        section: 'A',
        fatherName: 'Suresh Rao',
        fatherPhone: '9123456780',
        fatherOccupation: 'Business',
        motherName: '',
        motherPhone: '',
        motherOccupation: '',
        addressLine1: '45, Park Street',
        addressLine2: '',
        city: 'Kanpur',
        state: 'Uttar Pradesh',
        pinCode: '208001',
        emergencyContactName: 'Suresh Rao',
        emergencyContactPhone: '9123456780',
        emergencyContactRelationship: 'Father',
      },
    ],
  },
  {
    name: 'Class 8 - B',
    rows: [
      {
        admissionNumber: 'ADM-2027-0003',
        admissionDate: '2027-04-01',
        academicSession: '2026-27',
        firstName: 'Karan',
        middleName: 'S',
        lastName: 'Mehta',
        dob: '2013-11-05',
        gender: 'Male',
        bloodGroup: 'A+',
        nationality: 'Indian',
        aadhaarNumber: '3456 7890 1234',
        whatsappNumber: '9988776655',
        class: 'Class 8',
        section: 'B',
        fatherName: 'Anil Mehta',
        fatherPhone: '9988776655',
        fatherOccupation: 'Doctor',
        motherName: 'Kavita Mehta',
        motherPhone: '9988700000',
        motherOccupation: 'Homemaker',
        addressLine1: '78, Civil Lines',
        addressLine2: '',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pinCode: '226002',
        emergencyContactName: 'Kavita Mehta',
        emergencyContactPhone: '9988700000',
        emergencyContactRelationship: 'Mother',
      },
    ],
  },
  {
    name: 'Class 10 - A',
    rows: [
      {
        admissionNumber: 'ADM-2027-0004',
        admissionDate: '2027-04-01',
        academicSession: '2026-27',
        firstName: 'Priya',
        middleName: '',
        lastName: 'Nair',
        dob: '2011-01-18',
        gender: 'Female',
        bloodGroup: 'AB+',
        nationality: 'Indian',
        aadhaarNumber: '4567 8901 2345',
        whatsappNumber: '9012345678',
        class: 'Class 10',
        section: 'A',
        fatherName: 'Vinod Nair',
        fatherPhone: '9012345678',
        fatherOccupation: 'Government Service',
        motherName: 'Lakshmi Nair',
        motherPhone: '9012300000',
        motherOccupation: 'Nurse',
        addressLine1: '9, Gomti Nagar',
        addressLine2: 'Sector 4',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        pinCode: '226010',
        emergencyContactName: 'Vinod Nair',
        emergencyContactPhone: '9012345678',
        emergencyContactRelationship: 'Father',
      },
    ],
  },
];

const HEADERS = BULK_IMPORT_COLUMNS.map((c) => c.label);

function buildDataSheet(rows) {
  const aoa = [HEADERS, ...rows.map((row) => BULK_IMPORT_COLUMNS.map(({ key }) => row[key] ?? ''))];
  return XLSX.utils.aoa_to_sheet(aoa);
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
    ['The other tabs in this workbook ("Class 6 - A", "Class 8 - B", "Class 10 - A")'],
    ['are filled-in examples in the exact format expected — replace the sample rows'],
    ['with your own data, or delete them and add your own tabs.'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(lines);
  sheet['!cols'] = [{ wch: 90 }];
  return sheet;
}

export async function GET() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildInstructionsSheet(), 'Instructions');
  for (const { name, rows } of SAMPLE_SHEETS) {
    XLSX.utils.book_append_sheet(workbook, buildDataSheet(rows), name);
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="student-bulk-import-sample.xlsx"',
    },
  });
}
