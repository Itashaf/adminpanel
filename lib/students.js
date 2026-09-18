import prisma from './db';
import { CLASS_LEVELS, classNameForLevel } from './classConstants';

// The full set of valid class names — sections are no longer a static
// per-class list here; they're admin-configurable real Section rows (see
// lib/classes.js's getClassSectionsMap()).
const VALID_CLASS_NAMES = new Set(CLASS_LEVELS.map(classNameForLevel));
const LEVEL_BY_CLASS_NAME = new Map(CLASS_LEVELS.map((level) => [classNameForLevel(level), level]));

// A student can be created (one at a time, or via bulk import) for a class
// name that's valid (see VALID_CLASS_NAMES) but has no Class row yet for
// this school/session — the Classes & Sections module only lists classes an
// admin has explicitly created there, so without this the student would
// exist but never show up under their class/section anywhere in that module.
// Auto-creates the missing Class (and, if a section was given, the Section)
// row so the student's own class/section always has somewhere real to live —
// same convention as lib/classes.js's addClass/addSection, just upserted
// instead of erroring on an existing row. Can't import lib/classes.js here
// (it pulls in resolveSchoolId's next/headers dependency, unsafe for this
// file's Client Component-reachable pure constants) so this talks to Prisma
// directly, same as the rest of this file already does.
async function ensureClassAndSection(schoolId, className, sectionName, academicSession) {
  const level = LEVEL_BY_CLASS_NAME.get(className) || className;
  const cls = await prisma.class.upsert({
    where: { schoolId_academicSession_name: { schoolId, academicSession, name: className } },
    update: {},
    create: { schoolId, name: className, level, academicSession, status: 'Active', subjects: [] },
  });

  if (sectionName) {
    await prisma.section.upsert({
      where: { classId_academicSession_name: { classId: cls.id, academicSession, name: sectionName } },
      update: {},
      create: { schoolId, classId: cls.id, name: sectionName, academicSession, room: '', capacity: 0, status: 'Active' },
    });
  }
}

export const ACADEMIC_SESSIONS = ['2026-27', '2025-26'];
export const STATUSES = ['Active', 'Inactive', 'TransferredOut', 'Graduated'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GUARDIAN_RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Sibling', 'Other'];
export const EMERGENCY_CONTACT_RELATIONSHIPS = ['Grandparent', 'Uncle/Aunt', 'Family Friend', 'Neighbor', 'Sibling', 'Other'];
export const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'];
export const FEE_STRUCTURE_TYPES = ['Monthly', 'Annual'];
export const FEE_PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial', 'Overdue'];

// Reshapes a Prisma Student row back into the flat shape the rest of the app
// (StudentForm, ProfileHeader, attendance module, etc.) has always expected
// — Json columns already come back as parsed objects, so this is really just
// dropping schoolId/createdAt, which nothing downstream reads.
export function decorateStudent(row) {
  return {
    id: row.id,
    admissionId: row.admissionId,
    photoUrl: row.photoUrl,
    firstName: row.firstName,
    lastName: row.lastName,
    initials: row.initials,
    class: row.class,
    section: row.section,
    academicSession: row.academicSession,
    admissionDate: row.admissionDate,
    dob: row.dob,
    gender: row.gender,
    bloodGroup: row.bloodGroup,
    nationality: row.nationality,
    aadhaarNumber: row.aadhaarNumber,
    aadhaarDocumentName: row.aadhaarDocumentName,
    aadhaarDocumentUrl: row.aadhaarDocumentUrl || null,
    whatsappNumber: row.whatsappNumber,
    status: row.status,
    previousSchool: row.previousSchool || undefined,
    guardian: row.guardian || undefined,
    secondaryGuardian: row.secondaryGuardian || undefined,
    emergencyContacts: row.emergencyContacts || undefined,
    address: row.address || undefined,
    feeDetails: row.feeDetails || undefined,
    documents: row.documents || undefined,
    discountType: row.discountType,
    discountValue: row.discountValue,
    discountReason: row.discountReason,
  };
}

// Was lib/schoolScope.js's in-memory `globalThis.__STUDENTS_BY_SCHOOL__` Map
// — now a real `schoolId` column (see prisma/schema.prisma's Student model).
// `schoolId` is REQUIRED (no default) — every caller must resolve its own
// real session's school explicitly (see lib/auth/schoolContext.js's
// resolveSchoolId(), used by lib/attendance.js and lib/iam.js). This file
// can't resolve that itself since it also exports pure constants that
// Client Components import directly, and next/headers-dependent code can
// never live anywhere in a module those components pull in — but that's a
// reason this file can't default it, not a reason a caller should be
// allowed to omit it. A missing schoolId here used to silently fall back to
// lib/school.js's shared `ACTIVE_SCHOOL` singleton — whichever school a
// Super Admin last "stepped into" platform-wide — which on a single shared
// deployment serving every school is a real cross-tenant data leak, not a
// theoretical one. Every call site already passes its own resolved
// schoolId; if a new caller can't, that's a bug to fix at the call site,
// not here.
async function getSchoolStudents(schoolId) {
  const rows = await prisma.student.findMany({ where: { schoolId } });
  return rows.map(decorateStudent);
}

export async function getStudentStats(schoolId, scopePairs = null) {
  const allStudents = await getSchoolStudents(schoolId);
  // A Teacher's stats cards reflect only their own class scope, same as the
  // Students table itself (see getStudentsPage's scopePairs) — never the
  // whole school's numbers.
  const students = scopePairs
    ? allStudents.filter((s) => scopePairs.some((p) => p.academicSession === s.academicSession && p.class === s.class && p.section === s.section))
    : allStudents;
  const active = students.filter((s) => s.status === 'Active').length;
  const inactive = students.filter((s) => s.status !== 'Active').length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newAdmissions = students.filter((s) => s.admissionDate?.startsWith(thisMonth)).length;

  return {
    total: students.length,
    active,
    newAdmissions,
    inactive,
  };
}

export async function getClassOptions() {
  return CLASS_LEVELS.map(classNameForLevel).map((name) => ({ value: name, label: name }));
}

export async function getAllStudents(schoolId) {
  return getSchoolStudents(schoolId);
}

// Real query-level pagination for the Students table (GET /api/students) —
// `getSchoolStudents`/`getAllStudents` above load the WHOLE roster into one
// response and always will (dashboard stats, exports, attendance rosters
// all genuinely need every row); this is the one used for the paginated
// table view instead, where only `pageSize` rows and a `total` count are
// ever needed. `scopePairs` (optional [{academicSession, class, section}])
// is how a Teacher's class scope (see lib/roleGuard.js's
// getTeacherClassScope) gets enforced AT THE QUERY, not by fetching
// everything and filtering in JS — same security reasoning as every other
// schoolId scoping in this file, just extended to a Teacher's narrower
// slice of one school.
export async function getStudentsPage({
  schoolId,
  page = 1,
  pageSize = 10,
  search = '',
  classFilter = '',
  sectionFilter = '',
  statusFilter = '',
  scopePairs = null,
}) {
  const conditions = [{ schoolId }];

  if (classFilter) conditions.push({ class: classFilter });
  if (sectionFilter) conditions.push({ section: sectionFilter });
  if (statusFilter) conditions.push({ status: statusFilter });

  if (scopePairs) {
    conditions.push({
      OR: scopePairs.length
        ? scopePairs.map((p) => ({ academicSession: p.academicSession, class: p.class, section: p.section }))
        : [{ id: 'never-matches' }], // no assignments at all → an empty roster, not "unscoped"
    });
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    conditions.push({
      OR: [
        { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
        { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
        { admissionId: { contains: trimmedSearch, mode: 'insensitive' } },
        // Guardian phone lives inside the `guardian` Json blob (see
        // buildGuardianRecord below) — Postgres Json path filtering, not a
        // full-text index, but this column is never large enough per row
        // for that to matter.
        { guardian: { path: ['phone'], string_contains: trimmedSearch } },
      ],
    });
  }

  const where = { AND: conditions };

  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);

  return { students: rows.map(decorateStudent), total };
}

export async function getStudentById(id, schoolId) {
  const row = await prisma.student.findFirst({ where: { id, schoolId } });
  return row ? decorateStudent(row) : null;
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function buildGuardianRecord(guardian) {
  if (!guardian) return undefined;
  return {
    relationship: guardian.relationship,
    fullName: guardian.fullName,
    phone: guardian.phone,
    email: guardian.email,
    occupation: guardian.occupation,
    aadhaarNumber: guardian.aadhaarNumber,
    aadhaarDocumentName: guardian.aadhaarDocument,
    // The actual uploaded file (see StudentForm.jsx, which uploads it and
    // hands back a real R2 URL before this ever runs) — aadhaarDocument
    // above stays just the filename for display.
    aadhaarDocumentUrl: guardian.aadhaarDocumentUrl || null,
  };
}

function buildStudentFields(data) {
  return {
    admissionId: data.admissionNumber,
    photoUrl: data.photoUrl || null,
    firstName: data.firstName,
    lastName: data.lastName,
    initials: getInitials(data.firstName, data.lastName),
    class: data.class,
    section: data.section,
    academicSession: data.academicSession,
    admissionDate: data.admissionDate,
    dob: data.dob,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    nationality: data.nationality,
    aadhaarNumber: data.aadhaarNumber,
    aadhaarDocumentName: data.aadhaarDocument,
    aadhaarDocumentUrl: data.aadhaarDocumentUrl || null,
    whatsappNumber: data.whatsappNumber,
    status: data.status || 'Active',
    previousSchool: {
      name: data.previousSchoolName,
      board: data.previousSchoolBoard,
      lastClassPercentage: data.lastClassPercentage,
    },
    guardian: buildGuardianRecord(data.guardian),
    secondaryGuardian:
      data.secondaryGuardian?.fullName || data.secondaryGuardian?.aadhaarDocument
        ? buildGuardianRecord(data.secondaryGuardian)
        : undefined,
    emergencyContacts: {
      primary: {
        name: data.primaryEmergencyName,
        relationship: data.primaryEmergencyRelationship,
        phone: data.primaryEmergencyPhone,
      },
      secondary: {
        name: data.secondaryEmergencyName,
        relationship: data.secondaryEmergencyRelationship,
        phone: data.secondaryEmergencyPhone,
      },
      trustedRelativePhone: data.trustedRelativePhone,
    },
    address: {
      line1: data.addressLine1,
      line2: data.addressLine2,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
    },
    feeDetails: {
      admissionFeePaidDate: data.admissionFeePaidDate,
      admissionFeeAmount: data.admissionFeeAmount,
      structureType: data.feeStructureType,
      structureAmount: data.feeStructureAmount,
      paymentStatus: data.feePaymentStatus,
      outstandingDues: data.outstandingDues,
    },
    // Father/Mother Photo, Birth Certificate, SLC, Other Document — each
    // already uploaded (see StudentForm.jsx) by the time this runs, so
    // these are always real R2 URLs or undefined, never a File.
    documents: {
      fatherPhotoUrl: data.fatherPhotoUrl || null,
      motherPhotoUrl: data.motherPhotoUrl || null,
      birthCertificateUrl: data.birthCertificateUrl || null,
      slcUrl: data.slcUrl || null,
      otherDocumentUrl: data.otherDocumentUrl || null,
    },
  };
}

export async function addStudent(data, schoolId) {
  if (VALID_CLASS_NAMES.has(data.class)) {
    await ensureClassAndSection(schoolId, data.class, data.section, data.academicSession);
  }
  try {
    const row = await prisma.student.create({
      data: { schoolId, ...buildStudentFields(data) },
    });
    return decorateStudent(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`Admission number "${data.admissionNumber}" is already in use.`);
    }
    throw err;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Reshapes one normalized bulk-import row (see lib/bulkImportColumns.js —
// flat fatherName/motherName columns, since a spreadsheet has no notion of
// "primary vs secondary guardian") into the `data` shape buildStudentFields
// already expects from the single-student Add Student form. Whichever
// parent is present becomes the primary guardian (father preferred, since
// that's what the rest of the app defaults to when only one is on file);
// the other becomes the secondary guardian if given.
function mapBulkRowToStudentData(row) {
  const father = row.fatherName
    ? { relationship: 'Father', fullName: row.fatherName, phone: row.fatherPhone || '', occupation: row.fatherOccupation || '' }
    : null;
  const mother = row.motherName
    ? { relationship: 'Mother', fullName: row.motherName, phone: row.motherPhone || '', occupation: row.motherOccupation || '' }
    : null;
  const [guardian, secondaryGuardian] = father ? [father, mother] : [mother, father];

  return {
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    dob: row.dob,
    gender: row.gender,
    bloodGroup: row.bloodGroup,
    nationality: row.nationality,
    whatsappNumber: row.whatsappNumber,
    admissionNumber: row.admissionNumber,
    admissionDate: row.admissionDate || today(),
    academicSession: row.academicSession || ACADEMIC_SESSIONS[0],
    class: row.class,
    section: row.section,
    status: 'Active',
    guardian,
    secondaryGuardian: secondaryGuardian || undefined,
    primaryEmergencyName: row.emergencyContactName,
    primaryEmergencyRelationship: row.emergencyContactRelationship,
    primaryEmergencyPhone: row.emergencyContactPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    pinCode: row.pinCode,
  };
}

// Inserts one row at a time (not a single $transaction) so one bad row —
// a typo'd class name, a duplicate admission number — doesn't roll back
// everyone else in the same file; the caller (the bulk-import API route)
// reports `skipped` back to the UI so those rows can be fixed and
// re-uploaded on their own.
export async function bulkCreateStudents(rows, schoolId) {
  const existing = await getSchoolStudents(schoolId);
  const existingIds = new Set(existing.map((s) => s.admissionId));
  const seenInBatch = new Set();
  const imported = [];
  const skipped = [];

  for (const row of rows) {
    if (existingIds.has(row.admissionNumber) || seenInBatch.has(row.admissionNumber)) {
      skipped.push({ row, reason: `Admission number "${row.admissionNumber}" already exists.` });
      continue;
    }
    if (!VALID_CLASS_NAMES.has(row.class)) {
      skipped.push({ row, reason: `"${row.class}" is not a recognized class.` });
      continue;
    }
    try {
      const created = await addStudent(mapBulkRowToStudentData(row), schoolId);
      seenInBatch.add(row.admissionNumber);
      imported.push(created);
    } catch (err) {
      skipped.push({ row, reason: err.message });
    }
  }

  return { imported, skipped };
}

export async function updateStudent(id, data, schoolId) {
  const existing = await getStudentById(id, schoolId);
  if (!existing) return null;

  try {
    const row = await prisma.student.update({ where: { id }, data: buildStudentFields(data) });
    if (existing.photoUrl && existing.photoUrl !== row.photoUrl) {
      const { deleteObject, keyFromPublicUrl } = await import('./storage');
      deleteObject(keyFromPublicUrl(existing.photoUrl));
    }
    return decorateStudent(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`Admission number "${data.admissionNumber}" is already in use.`);
    }
    throw err;
  }
}

export async function deleteStudent(id, schoolId) {
  const existing = await getStudentById(id, schoolId);
  if (!existing) return null;
  try {
    await prisma.student.delete({ where: { id } });
  } catch (err) {
    // P2003 = foreign key constraint failed — this student has a StudentFee
    // or Payment row (StudentFee/Payment → Student is `onDelete: Restrict`,
    // deliberately not Cascade, since silently wiping billing history a
    // school is required to retain would be worse than refusing the
    // delete). Point the admin at the real fix — mark the student
    // TransferredOut/Graduated (see StudentStatus in prisma/schema.prisma)
    // instead of deleting — rather than surfacing a raw 500.
    if (err.code === 'P2003') {
      throw new Error(
        'This student has fee or payment records and can’t be deleted. Set their status to "Transferred Out" or "Graduated" instead to remove them from the active roster.'
      );
    }
    throw err;
  }
  if (existing.photoUrl) {
    const { deleteObject, keyFromPublicUrl } = await import('./storage');
    deleteObject(keyFromPublicUrl(existing.photoUrl));
  }
  return existing;
}

// Parent portal login (issuing access, resetting passwords, credential
// validation) lives in lib/parentAccounts.js now — see ParentAccount in
// prisma/schema.prisma for why this moved off Student.
