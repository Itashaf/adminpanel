// Shared between the client-side parser (components/students/BulkImportPage.jsx,
// reading the uploaded workbook in the browser) and the sample-template
// generator (app/api/students/bulk-import/template/route.js) — one column
// list so the template's headers and the parser's expected headers can never
// drift apart.
export const BULK_IMPORT_COLUMNS = [
  { key: 'admissionNumber', label: 'Admission Number' },
  { key: 'admissionDate', label: 'Admission Date (YYYY-MM-DD)' },
  { key: 'academicSession', label: 'Academic Session' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dob', label: 'DOB (YYYY-MM-DD)' },
  { key: 'gender', label: 'Gender' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'aadhaarNumber', label: 'Aadhaar Number' },
  { key: 'whatsappNumber', label: 'WhatsApp Number' },
  { key: 'class', label: 'Class' },
  { key: 'section', label: 'Section' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'fatherPhone', label: 'Father Phone' },
  { key: 'fatherOccupation', label: 'Father Occupation' },
  { key: 'motherName', label: 'Mother Name' },
  { key: 'motherPhone', label: 'Mother Phone' },
  { key: 'motherOccupation', label: 'Mother Occupation' },
  { key: 'addressLine1', label: 'Address Line 1' },
  { key: 'addressLine2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pinCode', label: 'PIN Code' },
  { key: 'emergencyContactName', label: 'Emergency Contact Name' },
  { key: 'emergencyContactPhone', label: 'Emergency Contact Phone' },
  { key: 'emergencyContactRelationship', label: 'Emergency Contact Relationship' },
];

const LABEL_TO_KEY = new Map(
  BULK_IMPORT_COLUMNS.map(({ key, label }) => [label.trim().toLowerCase(), key])
);

// Excel headers won't always come back byte-identical to our label strings
// (extra spaces, a user re-typing "DOB" without the "(YYYY-MM-DD)" hint) —
// matching on the part before " (" covers the common case without requiring
// exact round-tripping of our own template.
function resolveHeaderKey(header) {
  const normalized = String(header || '').trim().toLowerCase();
  if (LABEL_TO_KEY.has(normalized)) return LABEL_TO_KEY.get(normalized);
  const base = normalized.split(' (')[0];
  for (const [label, key] of LABEL_TO_KEY) {
    if (label.split(' (')[0] === base) return key;
  }
  return null;
}

// A sheet named "Class 8 - A" (or just "Class 8") is read as that class/
// section for every row in it whose own Class/Section columns are blank —
// this is what lets one workbook hold multiple classes as separate tabs
// without repeating the same two columns on every row.
export function parseSheetNameForClassSection(sheetName) {
  const name = String(sheetName || '').trim();
  const match = name.match(/^(.*?)\s*-\s*([A-Za-z0-9]+)$/);
  if (match) {
    return { classFromSheet: match[1].trim(), sectionFromSheet: match[2].trim().toUpperCase() };
  }
  return { classFromSheet: name, sectionFromSheet: '' };
}

// Turns one raw row object (as SheetJS's sheet_to_json gives it — keyed by
// whatever the header cells said, values already stringified/trimmed by the
// caller) into our internal shape, filling class/section from the sheet
// name only when the row itself didn't specify them.
// Every column key defaults to '' rather than being left `undefined` when
// its header doesn't appear in the sheet at all (a typo'd header, a column
// missing entirely) — the schema (lib/schemas.js's bulkImportRowSchemaBase)
// only produces its human-readable "X is required." messages for an empty
// string; a genuinely `undefined` field instead fails Zod's own built-in
// string-type check first, surfacing as the unhelpful, unactionable
// "Invalid input: expected string, received undefined" instead.
export function normalizeRow(rawRow, { classFromSheet, sectionFromSheet }) {
  const row = Object.fromEntries(BULK_IMPORT_COLUMNS.map(({ key }) => [key, '']));
  for (const [header, value] of Object.entries(rawRow)) {
    const key = resolveHeaderKey(header);
    if (!key) continue;
    row[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (!row.class) row.class = classFromSheet;
  if (!row.section) row.section = sectionFromSheet;
  return row;
}

export function isRowBlank(row) {
  return Object.values(row).every((value) => value === undefined || value === null || value === '');
}
