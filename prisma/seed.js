// Seeds demo School Admin/Teacher/Parent accounts the app's login pages
// still advertise in their "Test credentials" boxes, plus the one real
// Super Admin account (its password is never hardcoded here — see
// SUPER_ADMIN_SEED_PASSWORD below). Run via `npm run db:seed`. Safe to
// re-run (upserts by email), so re-seeding after a `prisma migrate reset`
// doesn't need any extra steps — note that upsert's `update: {}` for
// SuperAdmin means re-running this does NOT rotate an already-existing
// account's password; rotate that directly against the database instead.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = [
  'manageStudents',
  'manageTeachers',
  'manageClasses',
  'manageAcademicSessions',
  'manageSchoolSettings',
];

function allPermissions() {
  return ADMIN_PERMISSIONS.reduce((acc, key) => ({ ...acc, [key]: true }), {});
}

// Fixed ids (rather than letting Prisma's @default(cuid()) generate one)
// so they keep matching the schoolAdmins' hardcoded `schoolId` values below
// — this was the same in-memory id scheme lib/schools.js used before Schools
// moved to Postgres, preserved here purely for seed continuity.
const schools = [
  {
    id: 'school-1',
    name: 'ABC Public School',
    code: 'ABC-001',
    principalName: 'Dr. Radhika Sharma',
    email: 'info@abcpublicschool.edu',
    phone: '+91 98765 43210',
    displayName: 'ABC Public School',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    status: 'Active',
    currentSessionName: '2026-27',
    studentCount: 1248,
    teacherCount: 68,
  },
  {
    id: 'school-2',
    name: 'Greenwood High School',
    code: 'GHS-014',
    principalName: 'Mr. Arvind Rao',
    email: 'admin@greenwoodhigh.edu',
    phone: '+91 90000 11122',
    displayName: 'Greenwood High School',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    status: 'Active',
    currentSessionName: '2026-27',
    studentCount: 842,
    teacherCount: 51,
  },
  {
    id: 'school-3',
    name: "St. Mary's Convent School",
    code: 'SMC-007',
    principalName: 'Sr. Teresa Fernandes',
    email: 'office@stmarysconvent.edu',
    phone: '+91 98200 55678',
    displayName: "St. Mary's Convent School",
    city: 'Panaji',
    state: 'Goa',
    country: 'India',
    status: 'Inactive',
    currentSessionName: '2025-26',
    studentCount: 310,
    teacherCount: 24,
  },
];

async function main() {
  // Real production credential — not a placeholder demo value. Set via
  // SUPER_ADMIN_SEED_PASSWORD so this file never has to hold it in plain
  // text; falls back to a random one-time password only for a fresh local
  // seed run that doesn't set the env var (printed to the console so it's
  // recoverable, never silently lost).
  const superAdminPassword = process.env.SUPER_ADMIN_SEED_PASSWORD || crypto.randomBytes(12).toString('base64url');
  if (!process.env.SUPER_ADMIN_SEED_PASSWORD) {
    console.log(`No SUPER_ADMIN_SEED_PASSWORD set — generated one-time Super Admin password: ${superAdminPassword}`);
  }
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@edumanage.io' },
    update: {},
    create: {
      email: 'superadmin@edumanage.io',
      passwordHash: superAdminPasswordHash,
      name: 'Platform Super Admin',
    },
  });

  for (const school of schools) {
    await prisma.school.upsert({
      where: { id: school.id },
      update: {},
      create: school,
    });
  }

  const schoolAdmins = [
    { schoolId: 'school-1', name: 'Dr. Radhika Sharma', email: 'info@abcpublicschool.edu', password: 'Welcome@123' },
    { schoolId: 'school-2', name: 'Mr. Arvind Rao', email: 'admin@greenwoodhigh.edu', password: 'Welcome@123' },
  ];

  for (const admin of schoolAdmins) {
    const passwordHash = await bcrypt.hash(admin.password, 10);
    await prisma.schoolAdmin.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        schoolId: admin.schoolId,
        name: admin.name,
        email: admin.email,
        passwordHash,
        status: 'Active',
        permissions: allPermissions(),
      },
    });
  }

  // lib/studentSeedData.js is an ES module (import/export) so it can be
  // shared cleanly with Next's bundler elsewhere — loaded here via dynamic
  // import() since this script itself runs as plain CommonJS under `node`.
  const { SEED_STUDENT_ROSTER } = await import('../lib/studentSeedData.js');
  for (const student of SEED_STUDENT_ROSTER) {
    await prisma.student.upsert({
      where: { schoolId_admissionId: { schoolId: 'school-1', admissionId: student.admissionId } },
      update: {},
      create: { schoolId: 'school-1', ...student },
    });
  }

  // One demo student gets Parent Portal access out of the box, matching the
  // "Test parent credentials" box on the login page (components/LoginForm.jsx)
  // — every other student has no portalPasswordHash until a school admin
  // issues one (lib/students.js's setParentPortalPassword).
  const parentPortalPasswordHash = await bcrypt.hash('Parent@123', 10);
  await prisma.student.updateMany({
    where: { schoolId: 'school-1', admissionId: 'ADM-2026-1048' }, // Reyansh Joshi
    data: { portalPasswordHash: parentPortalPasswordHash },
  });

  // Same dynamic-import trick as lib/studentSeedData.js above — this one
  // holds each seed teacher's demo loginAccess.password in plaintext, which
  // gets hashed below rather than ever written to Teacher.loginPasswordHash
  // as-is.
  const { SEED_TEACHERS } = await import('../lib/teacherSeedData.js');
  for (const teacher of SEED_TEACHERS) {
    const { loginAccess, assignments, ...fields } = teacher;
    const loginPasswordHash = loginAccess.password ? await bcrypt.hash(loginAccess.password, 10) : null;
    await prisma.teacher.upsert({
      where: { schoolId_employeeId: { schoolId: 'school-1', employeeId: teacher.employeeId } },
      update: {},
      create: {
        schoolId: 'school-1',
        ...fields,
        loginEnabled: loginAccess.enabled,
        loginEmail: loginAccess.email,
        loginPasswordHash,
        loginAccountStatus: loginAccess.accountStatus,
        assignments,
      },
    });
  }

  // Classes/Sections reference each other (and their class teacher) by the
  // seed-only `classKey`/`classTeacherEmployeeId` in lib/classSeedData.js,
  // not real ids — those only exist once Prisma assigns cuids here, and a
  // teacher's own real id is only known after the teacher upsert above runs.
  const { SEED_CLASSES, SEED_SECTIONS } = await import('../lib/classSeedData.js');
  const classIdByKey = new Map();
  for (const { classKey, ...fields } of SEED_CLASSES) {
    const row = await prisma.class.upsert({
      where: { schoolId_academicSession_name: { schoolId: 'school-1', academicSession: fields.academicSession, name: fields.name } },
      update: {},
      create: { schoolId: 'school-1', ...fields },
    });
    classIdByKey.set(classKey, row.id);
  }

  const teacherIdByEmployeeId = new Map(
    (await prisma.teacher.findMany({ where: { schoolId: 'school-1' }, select: { id: true, employeeId: true } })).map((t) => [
      t.employeeId,
      t.id,
    ])
  );
  for (const { sectionKey, classKey, classTeacherEmployeeId, ...fields } of SEED_SECTIONS) {
    const classId = classIdByKey.get(classKey);
    if (!classId) continue;
    await prisma.section.upsert({
      where: { classId_academicSession_name: { classId, academicSession: fields.academicSession, name: fields.name } },
      update: {},
      create: {
        schoolId: 'school-1',
        classId,
        classTeacherId: classTeacherEmployeeId ? teacherIdByEmployeeId.get(classTeacherEmployeeId) || null : null,
        ...fields,
      },
    });
  }

  console.log(
    `Seed complete: 1 super admin, 3 schools, 2 school admins, ${SEED_STUDENT_ROSTER.length} students, ${SEED_TEACHERS.length} teachers, ${SEED_CLASSES.length} classes, ${SEED_SECTIONS.length} sections.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
