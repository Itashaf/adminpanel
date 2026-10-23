import prisma from './db';
import { encryptField, decryptField, decryptPerson } from './fieldCrypto';
import { CLASS_LEVELS, classNameForLevel } from './classConstants';
import { todayInSchoolTz } from './schoolToday';

// The full set of valid class names — sections are no longer a static
// per-class list here; they're admin-configurable real Section rows (see
// lib/classes.js's getClassSectionsMap()).
const VALID_CLASS_NAMES = new Set(CLASS_LEVELS.map(classNameForLevel));
const LEVEL_BY_CLASS_NAME = new Map(CLASS_LEVELS.map((level) => [classNameForLevel(level), level]));
const CLASS_ORDER = new Map(CLASS_LEVELS.map((level, i) => [classNameForLevel(level), i]));

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
// `client` defaults to the module's own `prisma` but accepts a `tx` handle
// instead — promoteStudents/retainStudentsInSession call this from inside a
// $transaction so the Class/Section upsert and the enrollment/log rows that
// follow either all commit or all roll back together. Returns the real ids
// (not just upserting) so callers can point a StudentEnrollment row at the
// exact Class/Section row for that session.
async function ensureClassAndSection(schoolId, className, sectionName, academicSession, client = prisma) {
  const level = LEVEL_BY_CLASS_NAME.get(className) || className;
  const cls = await client.class.upsert({
    where: { schoolId_academicSession_name: { schoolId, academicSession, name: className } },
    update: {},
    create: { schoolId, name: className, level, academicSession, status: 'Active', subjects: [] },
  });

  let sectionId = null;
  if (sectionName) {
    const section = await client.section.upsert({
      where: { classId_academicSession_name: { classId: cls.id, academicSession, name: sectionName } },
      update: {},
      create: { schoolId, classId: cls.id, name: sectionName, academicSession, room: '', capacity: 0, status: 'Active' },
    });
    sectionId = section.id;
  }

  return { classId: cls.id, sectionId };
}

// Throws if `sessionName` isn't a real AcademicSession row for this school —
// promote/retain must never write a Student/StudentEnrollment into a session
// that doesn't exist.
async function resolveSessionId(schoolId, sessionName, client = prisma) {
  const session = await client.academicSession.findUnique({
    where: { schoolId_name: { schoolId, name: sessionName } },
  });
  if (!session) throw new Error(`Academic session "${sessionName}" does not exist.`);
  return session.id;
}

// The strict counterpart to ensureClassAndSection() above — LOOKS UP a
// Class/Section, never creates one. Promotion/retain/manual-edit moves must
// reject an unknown target (a typo'd section name, a class nobody's set up
// for the new session yet) instead of silently materializing it — only
// ensureClassAndSection's upsert (still used by addStudent, the single-
// student admission flow — a legitimate, separate "administrative creation"
// path per the audit) is allowed to create rows on the fly.
async function resolveClassAndSection(schoolId, className, sectionName, academicSession, client = prisma) {
  const cls = await client.class.findUnique({
    where: { schoolId_academicSession_name: { schoolId, academicSession, name: className } },
  });
  if (!cls) {
    throw new Error(
      `Class "${className}" hasn't been created for session "${academicSession}" yet. Create it under Classes & Sections first.`
    );
  }

  let sectionId = null;
  if (sectionName) {
    const section = await client.section.findUnique({
      where: { classId_academicSession_name: { classId: cls.id, academicSession, name: sectionName } },
    });
    if (!section) {
      throw new Error(
        `Section "${sectionName}" hasn't been created under "${className}" for session "${academicSession}" yet. Create it under Classes & Sections first.`
      );
    }
    sectionId = section.id;
  }

  return { classId: cls.id, sectionId };
}

// Creates the StudentEnrollment for (studentId, academicSessionId) — or, if
// one already exists with the EXACT same class/section/status (a re-run of
// the same action, e.g. a double-submit), leaves it alone as a harmless no-
// op. Any other existing row is a genuine conflict (the student is already
// recorded differently for that session) and is rejected rather than
// silently overwritten — the unique DB constraint on
// (studentId, academicSessionId) is the last-resort backstop if two
// requests still race past this check.
async function applyEnrollment(client, schoolId, studentId, { academicSessionId, classId, sectionId, status }) {
  const existing = await client.studentEnrollment.findUnique({
    where: { studentId_academicSessionId: { studentId, academicSessionId } },
  });
  if (existing) {
    const unchanged = existing.classId === classId && (existing.sectionId || null) === (sectionId || null) && existing.status === status;
    if (unchanged) return existing;
    throw new Error('This student already has a different enrollment recorded for that academic session.');
  }
  try {
    return await client.studentEnrollment.create({
      data: { studentId, schoolId, academicSessionId, classId, sectionId, status },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('This student already has a different enrollment recorded for that academic session.');
    }
    throw err;
  }
}

// applyEnrollment for many students at once (promotion / retain): one read and one insert
// instead of a read and an insert per student. `entries` = [{ studentId, classId, sectionId }].
// Same rule: an identical existing row is a no-op, a different one rejects the whole batch.
async function applyEnrollments(client, schoolId, entries, { academicSessionId, status }) {
  const existing = await client.studentEnrollment.findMany({
    where: { academicSessionId, studentId: { in: entries.map((e) => e.studentId) } },
  });
  const existingByStudent = new Map(existing.map((row) => [row.studentId, row]));
  const toCreate = [];
  for (const e of entries) {
    const row = existingByStudent.get(e.studentId);
    if (!row) {
      toCreate.push({ studentId: e.studentId, schoolId, academicSessionId, classId: e.classId, sectionId: e.sectionId, status });
      continue;
    }
    const unchanged = row.classId === e.classId && (row.sectionId || null) === (e.sectionId || null) && row.status === status;
    if (!unchanged) throw new Error('This student already has a different enrollment recorded for that academic session.');
  }
  if (toCreate.length) {
    try {
      await client.studentEnrollment.createMany({ data: toCreate });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new Error('This student already has a different enrollment recorded for that academic session.');
      }
      throw err;
    }
  }
}

// Writes the actor fields (requirePermission's `user` — both a real User.id,
// possibly null for a legacy session, and a `legacyId` fallback, see
// lib/rbac.js) onto a StudentPromotionLog row.
function actorFields(actor) {
  return {
    actorId: actor?.id || actor?.legacyId || null,
    actorRole: actor?.roleKey || '',
    actorName: actor?.name || actor?.email || '',
  };
}

export const ACADEMIC_SESSIONS = ['2026-27', '2025-26'];
export const STATUSES = ['Active', 'Inactive', 'TransferredOut', 'Graduated'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GUARDIAN_RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Sibling', 'Other'];
// Father/Mother are collected as their own dedicated sections (see
// StudentForm.jsx's Father/Mother Details) — this third, optional "Guardian
// Details" block is for anyone else, so those two are excluded from its
// relationship dropdown.
export const OTHER_GUARDIAN_RELATIONSHIPS = GUARDIAN_RELATIONSHIPS.filter((rel) => rel !== 'Father' && rel !== 'Mother');
export const EMERGENCY_CONTACT_RELATIONSHIPS = ['Father', 'Mother', 'Grandparent', 'Uncle/Aunt', 'Family Friend', 'Neighbor', 'Sibling', 'Other'];
export const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'];
export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Jewish', 'Other'];
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
    religion: row.religion,
    caste: row.caste,
    aadhaarNumber: decryptField(row.aadhaarNumber),
    aadhaarDocumentName: row.aadhaarDocumentName,
    aadhaarDocumentUrl: row.aadhaarDocumentUrl || null,
    whatsappNumber: row.whatsappNumber,
    status: row.status,
    previousSchool: row.previousSchool || undefined,
    guardian: decryptPerson(row.guardian) || undefined,
    secondaryGuardian: decryptPerson(row.secondaryGuardian) || undefined,
    otherGuardian: decryptPerson(row.otherGuardian) || undefined,
    emergencyContacts: row.emergencyContacts || undefined,
    address: row.address || undefined,
    feeDetails: row.feeDetails || undefined,
    documents: row.documents || undefined,
    discountType: row.discountType,
    discountValue: row.discountValue,
    discountReason: row.discountReason,
    lastFeeReminderAt: row.lastFeeReminderAt ? row.lastFeeReminderAt.toISOString() : null,
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

// Three COUNT queries — never loads the roster. A Teacher's stats cards
// reflect only their own class scope, same as the Students table itself (see
// getStudentsPage's scopePairs) — never the whole school's numbers; an empty
// scope means "no assignments at all", i.e. zero students, not "unscoped".
export async function getStudentStats(schoolId, scopePairs = null) {
  const scope = scopePairs
    ? {
        OR: scopePairs.length
          ? scopePairs.map((p) => ({ academicSession: p.academicSession, class: p.class, section: p.section }))
          : [{ id: 'never-matches' }],
      }
    : {};
  const base = { schoolId, ...scope };
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [total, active, newAdmissions] = await Promise.all([
    prisma.student.count({ where: base }),
    prisma.student.count({ where: { ...base, status: 'Active' } }),
    prisma.student.count({ where: { ...base, admissionDate: { startsWith: thisMonth } } }),
  ]);

  return { total, active, newAdmissions, inactive: total - active };
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);

  return { students: rows.map(decorateStudent), total };
}

// What the mobile app shows on a student's profile (to a Class Teacher, and to the student's own
// parent): placement, basics, the people to contact and the address. Never Aadhaar numbers,
// documents, fees or previous-school details.
export function toAppProfile(student) {
  const guardians = [student.guardian, student.secondaryGuardian, student.otherGuardian]
    .filter((g) => g?.fullName)
    .map((g) => ({ relationship: g.relationship, fullName: g.fullName, phone: g.phone, email: g.email, occupation: g.occupation }));
  return {
    id: student.id,
    admissionId: student.admissionId,
    firstName: student.firstName,
    lastName: student.lastName,
    initials: student.initials,
    photoUrl: student.photoUrl,
    class: student.class,
    section: student.section,
    academicSession: student.academicSession,
    admissionDate: student.admissionDate,
    dob: student.dob,
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    nationality: student.nationality,
    religion: student.religion,
    whatsappNumber: student.whatsappNumber,
    status: student.status,
    guardians,
    emergencyContacts: student.emergencyContacts || null,
    address: student.address || null,
  };
}

export async function getStudentById(id, schoolId) {
  const row = await prisma.student.findFirst({ where: { id, schoolId } });
  return row ? decorateStudent(row) : null;
}

// The student's class teacher (the section's) and the class's subject list,
// for the Academic tab. Looked up by the student's current class/section
// names + session — the same way the rest of this file resolves them.
export async function getStudentClassInfo(student, schoolId) {
  if (!student.class) return { classTeacher: null, subjects: [] };
  const section = student.section
    ? await prisma.section.findFirst({
        where: { schoolId, academicSession: student.academicSession, name: student.section, class: { name: student.class } },
        select: { classTeacher: { select: { firstName: true, lastName: true } }, class: { select: { subjects: true } } },
      })
    : null;
  if (section) {
    const t = section.classTeacher;
    return { classTeacher: t ? `${t.firstName} ${t.lastName}`.trim() : null, subjects: section.class.subjects };
  }
  const cls = await prisma.class.findFirst({
    where: { schoolId, academicSession: student.academicSession, name: student.class },
    select: { subjects: true },
  });
  return { classTeacher: null, subjects: cls?.subjects || [] };
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
    aadhaarNumber: encryptField(guardian.aadhaarNumber),
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
    religion: data.religion || '',
    caste: data.caste || '',
    aadhaarNumber: encryptField(data.aadhaarNumber),
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
    secondaryGuardian: buildGuardianRecord(data.secondaryGuardian),
    // Unlike Father/Mother (always collected), this third "Guardian Details"
    // block is optional — only persisted when actually filled in.
    otherGuardian:
      data.otherGuardian?.fullName || data.otherGuardian?.aadhaarDocument
        ? buildGuardianRecord(data.otherGuardian)
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

// Fee generation for a newly-added student (see lib/fees.js's
// generateFeesForNewStudent) is deliberately NOT triggered from inside this
// function — this file's pure constants (ACADEMIC_SESSIONS, GENDERS, ...)
// are imported by Client Components (e.g. StudentsToolbar.jsx), and even a
// dynamic `import('./fees')` here gets traced into the client bundle's
// module graph by the bundler, pulling in lib/fees.js's own
// resolveSchoolId -> next/headers chain and breaking the client build. The
// two callers of addStudent (app/api/students/route.js and .../bulk-import/
// route.js) are both server-only API routes, so they call
// generateFeesForNewStudent themselves right after this returns instead.
// Admission keeps ensureClassAndSection's auto-create convention (the
// "intentional administrative class/section creation flow" the audit asked
// to preserve separately from promotion's stricter rules) — it runs BEFORE
// the transaction below since a Class/Section upsert existing is harmless
// and idempotent either way. Student creation + its initial
// StudentEnrollment row (the student's very first, day-1 enrollment — the
// gap where a newly admitted student had no enrollment history at all until
// their first promotion) are what's actually transactional: both commit or
// neither does. Uses a plain upsert (not applyEnrollment's reject-on-
// conflict) because a brand-new student's id can never already have a
// conflicting enrollment row.
// `ensuredPairs` (optional Set, used by bulk import) remembers which class+section the Class/Section
// upsert already ran for, so a 1000-row file does it once per class+section, not once per student.
export async function addStudent(data, schoolId, ensuredPairs = null) {
  const pairKey = `${data.academicSession}|${data.class}|${data.section || ''}`;
  if (VALID_CLASS_NAMES.has(data.class) && !ensuredPairs?.has(pairKey)) {
    await ensureClassAndSection(schoolId, data.class, data.section, data.academicSession);
    ensuredPairs?.add(pairKey);
  }
  try {
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: { schoolId, ...buildStudentFields(data) },
      });

      const session = await tx.academicSession.findUnique({
        where: { schoolId_name: { schoolId, name: data.academicSession } },
      });
      const cls = session
        ? await tx.class.findUnique({
            where: { schoolId_academicSession_name: { schoolId, academicSession: data.academicSession, name: data.class } },
          })
        : null;
      if (session && cls) {
        let sectionId = null;
        if (data.section) {
          const section = await tx.section.findUnique({
            where: { classId_academicSession_name: { classId: cls.id, academicSession: data.academicSession, name: data.section } },
          });
          sectionId = section?.id || null;
        }
        await tx.studentEnrollment.upsert({
          where: { studentId_academicSessionId: { studentId: created.id, academicSessionId: session.id } },
          update: {},
          create: { studentId: created.id, schoolId, academicSessionId: session.id, classId: cls.id, sectionId, status: 'Promoted' },
        });
      }

      return created;
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
  return todayInSchoolTz();
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
  // Only the admission numbers that appear in this file, never the whole roster.
  const existing = await prisma.student.findMany({
    where: { schoolId, admissionId: { in: rows.map((r) => r.admissionNumber).filter(Boolean) } },
    select: { admissionId: true },
  });
  const existingIds = new Set(existing.map((s) => s.admissionId));
  const seenInBatch = new Set();
  const ensuredPairs = new Set();
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
      const created = await addStudent(mapBulkRowToStudentData(row), schoolId, ensuredPairs);
      seenInBatch.add(row.admissionNumber);
      imported.push(created);
    } catch (err) {
      skipped.push({ row, reason: err.message });
    }
  }

  return { imported, skipped };
}

// A lifecycle status that means "this student has left their current
// enrollment" — moving to one of these from Active flips the CURRENT
// session's StudentEnrollment.status to match (see updateStudent below),
// instead of leaving it stuck on whatever Promoted/Repeat it already said.
const LEAVING_STATUSES = new Set(['TransferredOut', 'Inactive', 'Graduated']);

// The ordinary "Edit Student" form (PUT /api/students/[id]) is the one other
// place in the app that can touch class/section/academicSession/status —
// and, before this fix, did so with a bare prisma.student.update(), fully
// bypassing StudentEnrollment and the audit log the promotion screen is
// built on. Everything that ISN'T one of those four guarded fields (name,
// DOB, guardian info, documents, ...) still updates in the one plain
// `tx.student.update()` below, same as always.
//
// If class/section/academicSession actually changed, this is a manual
// enrollment move — it goes through the exact same validation (session and
// class/section must already exist — resolveClassAndSection, no auto-
// create), conflict rule (applyEnrollment — rejects a pre-existing,
// different enrollment for the target session) and audit log
// (StudentPromotionLog, action "Edited") as promoteStudents/
// retainStudentsInSession, just for one student instead of a batch.
//
// If `status` changed to/from a LEAVING_STATUSES value, the CURRENT
// session's own StudentEnrollment.status is updated to match (never a new
// row, never touching an earlier session's already-recorded history) and
// logged the same way, action = the new status.
//
// Both checks run inside one transaction with the profile-field update —
// either everything about this edit commits, or none of it does.
export async function updateStudent(id, data, schoolId, actor) {
  const existing = await getStudentById(id, schoolId);
  if (!existing) return null;

  const classChanged =
    data.class !== existing.class || data.section !== existing.section || data.academicSession !== existing.academicSession;
  const newStatus = data.status || 'Active';
  const statusChanged = newStatus !== existing.status;

  if (classChanged && !VALID_CLASS_NAMES.has(data.class)) {
    throw new Error(`"${data.class}" is not a valid class.`);
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      if (classChanged) {
        const toSessionId = await resolveSessionId(schoolId, data.academicSession, tx);
        const { classId, sectionId } = await resolveClassAndSection(schoolId, data.class, data.section, data.academicSession, tx);
        await applyEnrollment(tx, schoolId, id, { academicSessionId: toSessionId, classId, sectionId, status: 'Promoted' });
        await tx.studentPromotionLog.create({
          data: {
            schoolId,
            studentId: id,
            action: 'Edited',
            fromSession: existing.academicSession,
            fromClass: existing.class,
            fromSection: existing.section,
            toSession: data.academicSession,
            toClass: data.class,
            toSection: data.section || '',
            ...actorFields(actor),
          },
        });
      }

      const updated = await tx.student.update({ where: { id }, data: buildStudentFields(data) });

      if (statusChanged) {
        const currentSessionId = await resolveSessionId(schoolId, updated.academicSession, tx).catch(() => null);
        if (currentSessionId) {
          if (LEAVING_STATUSES.has(newStatus)) {
            await tx.studentEnrollment.updateMany({
              where: { studentId: id, academicSessionId: currentSessionId },
              data: { status: newStatus },
            });
            await tx.studentPromotionLog.create({
              data: {
                schoolId,
                studentId: id,
                action: newStatus,
                fromSession: updated.academicSession,
                fromClass: updated.class,
                fromSection: updated.section,
                toSession: updated.academicSession,
                toClass: updated.class,
                toSection: updated.section,
                ...actorFields(actor),
              },
            });
          } else if (newStatus === 'Active' && LEAVING_STATUSES.has(existing.status)) {
            // Reactivation — the student is enrolled again, so their current
            // session's enrollment stops saying TransferredOut/Inactive/Graduated.
            await tx.studentEnrollment.updateMany({
              where: { studentId: id, academicSessionId: currentSessionId },
              data: { status: 'Promoted' },
            });
          }
        }
      }

      return updated;
    });

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

  // Deleting a student also wipes their exam marks and results (those tables
  // cascade). Whether the delete was allowed used to depend on whether fee records
  // happened to exist; now exam records always block it.
  const [markCount, resultCount] = await Promise.all([
    prisma.examMark.count({ where: { studentId: id, schoolId } }),
    prisma.examResult.count({ where: { studentId: id, schoolId } }),
  ]);
  if (markCount > 0 || resultCount > 0) {
    throw new Error(
      'This student has exam marks or results and can’t be deleted. Set their status to "Transferred Out" or "Graduated" instead to remove them from the active roster.'
    );
  }

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

// Year-end promotion screen (see PromoteStudentsExplorer.jsx) — every
// Active student currently in one exact session+class(+section), so an
// admin can review the roster before picking who actually moves up. Only
// Active students, same reasoning as every other active-roster query in
// this file — a transferred-out/graduated student has no "next class".
export async function getStudentsForPromotion(schoolId, { academicSession, className, sectionName }) {
  const where = { schoolId, academicSession, status: 'Active' };
  if (className) where.class = className;
  if (sectionName) where.section = sectionName;
  const rows = await prisma.student.findMany({
    where,
    orderBy: [{ class: 'asc' }, { section: 'asc' }, { firstName: 'asc' }],
  });
  return rows.map(decorateStudent);
}

// Bulk class/section/session change for exactly the selected (promoted)
// ids — the admin's own checkbox selection on PromoteStudentsExplorer.jsx
// already decided who actually moves up a class; see retainStudentsInSession
// below for the unselected (failed/held-back) ones, who still need to move
// into the new session, just not a new class. `toSection` empty means
// "move to this class with no section yet" (same as a student added with
// no section picked), not "clear whatever they had" by accident — the
// caller always passes a real picked value.
//
// Runs as one $transaction: validate target session/class/section already
// exist (resolveClassAndSection — strict, rejects an unknown target rather
// than auto-creating it; see that function's comment), snapshot each
// student's CURRENT class/section/session (the "from" side of the audit
// log, read fresh inside the transaction so a concurrent edit can't race
// it), update Student's live fields (still the current-state source for
// every existing roster/attendance/fee/exam query — unchanged), then create
// one StudentEnrollment row per student for the target session (applyEnrollment
// — rejects rather than silently overwrites an existing, DIFFERENT
// enrollment for that session) and append one StudentPromotionLog row per
// student. Any failure (bad session, bad class/section, a missing student
// id, a conflicting enrollment) throws and rolls the whole batch back —
// nothing partially promotes.
export async function promoteStudents(schoolId, studentIds, target, actor) {
  return prisma.$transaction((tx) => promoteInTx(tx, schoolId, studentIds, target, actor));
}

// Counts the students (of those being moved) who still owe fees for the session they
// are leaving, so the admin can be told. Fees are not blocked or moved here.
async function countStudentsWithUnpaidFees(tx, schoolId, students) {
  const owing = await tx.studentFee.findMany({
    where: { schoolId, studentId: { in: students.map((s) => s.id) }, status: { in: ['PENDING', 'PARTIAL'] } },
    select: { studentId: true, academicSession: true },
  });
  const sessionOf = new Map(students.map((s) => [s.id, s.academicSession]));
  return new Set(owing.filter((f) => f.academicSession === sessionOf.get(f.studentId)).map((f) => f.studentId)).size;
}

export async function promoteInTx(tx, schoolId, studentIds, { toSession, toClass, toSection }, actor) {
  if (!studentIds?.length) return { count: 0, unpaidFeeStudentCount: 0 };
  if (!VALID_CLASS_NAMES.has(toClass)) {
    throw new Error(`"${toClass}" is not a valid class.`);
  }

  {
    const toSessionId = await resolveSessionId(schoolId, toSession, tx);
    const { classId: toClassId, sectionId: toSectionId } = await resolveClassAndSection(
      schoolId, toClass, toSection, toSession, tx
    );

    const students = await tx.student.findMany({ where: { id: { in: studentIds }, schoolId } });
    if (students.length !== studentIds.length) {
      throw new Error('One or more selected students could not be found.');
    }

    // Only Active students move up, and only to a class above the one they are in.
    const notActive = students.filter((s) => s.status !== 'Active');
    if (notActive.length) {
      throw new Error(`${notActive.length} selected student(s) are not Active (${notActive.slice(0, 3).map((s) => `${s.firstName} ${s.lastName}`).join(', ')}) and cannot be promoted.`);
    }
    const notAbove = students.filter((s) => CLASS_ORDER.has(s.class) && CLASS_ORDER.get(toClass) <= CLASS_ORDER.get(s.class));
    if (notAbove.length) {
      throw new Error(`${toClass} is not above the current class of ${notAbove.slice(0, 3).map((s) => `${s.firstName} ${s.lastName}`).join(', ')}. Use retain to keep a student in their class.`);
    }
    const unpaidFeeStudentCount = await countStudentsWithUnpaidFees(tx, schoolId, students);

    await tx.student.updateMany({
      where: { id: { in: studentIds }, schoolId },
      data: { academicSession: toSession, class: toClass, section: toSection || '' },
    });

    await applyEnrollments(
      tx,
      schoolId,
      students.map((s) => ({ studentId: s.id, classId: toClassId, sectionId: toSectionId })),
      { academicSessionId: toSessionId, status: 'Promoted' }
    );
    await tx.studentPromotionLog.createMany({
      data: students.map((s) => ({
        schoolId,
        studentId: s.id,
        action: 'Promoted',
        fromSession: s.academicSession,
        fromClass: s.class,
        fromSection: s.section,
        toSession,
        toClass,
        toSection: toSection || '',
        ...actorFields(actor),
      })),
    });

    return { count: students.length, unpaidFeeStudentCount };
  }
}

// A failed/held-back student still needs to exist in the new academic
// session (the old one eventually gets archived — see
// lib/academicSessions.js's setActiveSession) or they'd vanish from every
// roster/attendance/fee screen once the school moves on, even though
// they're still enrolled. Moves `academicSession` only — class/section are
// deliberately left out of `data` (not set to '') so each student keeps
// their own current class/section exactly as-is, repeating the same grade.
// Looks up (never auto-creates — resolveClassAndSection, same as
// promoteStudents) the Class/Section for every distinct class+section
// actually present among these students, so the repeated class must already
// exist for the new session (set up under Classes & Sections) before a
// retain can go through.
//
// Same transaction/validation/audit-log shape as promoteStudents — see its
// comment for why. Each student keeps THEIR OWN class/section (not a shared
// target), so the StudentEnrollment classId/sectionId is looked up per
// distinct (class, section) pair actually present among these students
// rather than once for the whole batch.
//
// A student whose current `class` isn't even a recognized grade name (dirty
// legacy data) used to be silently skipped here — Student.academicSession
// still moved for them like everyone else, but no StudentEnrollment row was
// ever written, so the two tables permanently disagreed about which session
// that student was really in, with nothing to reconcile it later. Now the
// whole batch is rejected up front instead — same "no partial/inconsistent
// write" rule the rest of this rebuild applies everywhere else. The admin
// has to fix that student's class (via Edit Student, which now validates
// it) before they can be retained into a new session at all.
export async function retainStudentsInSession(schoolId, studentIds, toSession, actor) {
  return prisma.$transaction((tx) => retainInTx(tx, schoolId, studentIds, toSession, actor));
}

export async function retainInTx(tx, schoolId, studentIds, toSession, actor) {
  if (!studentIds?.length) return { count: 0, unpaidFeeStudentCount: 0 };

  {
    const toSessionId = await resolveSessionId(schoolId, toSession, tx);

    const students = await tx.student.findMany({ where: { id: { in: studentIds }, schoolId } });
    if (students.length !== studentIds.length) {
      throw new Error('One or more selected students could not be found.');
    }
    const notActive = students.filter((s) => s.status !== 'Active');
    if (notActive.length) {
      throw new Error(`${notActive.length} selected student(s) are not Active and cannot be retained.`);
    }
    const unpaidFeeStudentCount = await countStudentsWithUnpaidFees(tx, schoolId, students);

    const invalidClassNames = [...new Set(students.filter((s) => !VALID_CLASS_NAMES.has(s.class)).map((s) => s.class))];
    if (invalidClassNames.length) {
      throw new Error(
        `Some selected students have an unrecognized class (${invalidClassNames.join(', ')}). Fix their class under Edit Student before retaining them.`
      );
    }

    const idsByPair = {};
    for (const s of students) {
      const pairKey = `${s.class}|${s.section}`;
      if (pairKey in idsByPair) continue;
      idsByPair[pairKey] = await resolveClassAndSection(schoolId, s.class, s.section, toSession, tx);
    }

    await tx.student.updateMany({
      where: { id: { in: studentIds }, schoolId },
      data: { academicSession: toSession },
    });

    await applyEnrollments(
      tx,
      schoolId,
      students.map((s) => ({ studentId: s.id, ...idsByPair[`${s.class}|${s.section}`] })),
      { academicSessionId: toSessionId, status: 'Repeat' }
    );
    await tx.studentPromotionLog.createMany({
      data: students.map((s) => ({
        schoolId,
        studentId: s.id,
        action: 'Repeat',
        fromSession: s.academicSession,
        fromClass: s.class,
        fromSection: s.section,
        toSession,
        toClass: s.class,
        toSection: s.section,
        ...actorFields(actor),
      })),
    });

    return { count: students.length, unpaidFeeStudentCount };
  }
}

// Read path for #6 ("StudentEnrollment must not remain write-only") and the
// server half of the promotion preview's conflict check — which of
// `studentIds` already have an EXISTING StudentEnrollment row for
// `toSession`, and what it currently says, so the UI can warn before
// confirm instead of discovering the rejection only after submitting (see
// applyEnrollment above, and PromoteStudentsExplorer.jsx's openPreview).
export async function getPromotionConflicts(schoolId, studentIds, toSession) {
  if (!studentIds?.length) return [];
  const session = await prisma.academicSession.findUnique({ where: { schoolId_name: { schoolId, name: toSession } } });
  if (!session) return [];

  const rows = await prisma.studentEnrollment.findMany({
    where: { schoolId, studentId: { in: studentIds }, academicSessionId: session.id },
    include: { class: { select: { name: true } }, section: { select: { name: true } } },
  });

  return rows.map((r) => ({
    studentId: r.studentId,
    existingClass: r.class.name,
    existingSection: r.section?.name || '',
    status: r.status,
  }));
}

// Real, DB-backed historical timeline for one student — every
// StudentEnrollment row they've ever had, oldest first, plus the
// StudentPromotionLog entries that produced them. Not yet wired into a UI
// screen (no "Academic History" tab exists in ProfileTabs.jsx today — adding
// one is a product decision, not an audit fix), but makes StudentEnrollment
// genuinely readable rather than write-only, and is what any future history
// view should call rather than re-deriving this from scratch.
export async function getStudentEnrollmentHistory(schoolId, studentId) {
  const [enrollments, logs] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { schoolId, studentId },
      include: {
        academicSession: { select: { name: true, startDate: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: { academicSession: { startDate: 'asc' } },
    }),
    prisma.studentPromotionLog.findMany({ where: { schoolId, studentId }, orderBy: { createdAt: 'asc' } }),
  ]);

  return {
    enrollments: enrollments.map((e) => ({
      session: e.academicSession.name,
      class: e.class.name,
      section: e.section?.name || '',
      status: e.status,
    })),
    log: logs,
  };
}

// Parent portal login (issuing access, resetting passwords, credential
// validation) lives in lib/parentAccounts.js now — see ParentAccount in
// prisma/schema.prisma for why this moved off Student.
