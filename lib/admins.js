import prisma from './db';
import { hashPassword, verifyPassword } from './auth/password';
import { getAllSchools, getSchoolDirectoryEntry } from './schools';
import { defaultPermissions } from './adminConstants';

function generateTempPassword() {
  return `Temp${Math.random().toString(36).slice(2, 8)}!`;
}

// Reshapes a Prisma row back into the exact plain-object shape every existing
// consumer (API routes, superadmin pages) already expects — `password` was
// never returned to callers even in the old in-memory version, so callers
// never see `passwordHash` either; `createdAt`/`lastPasswordResetAt` stay
// `'YYYY-MM-DD'` strings (or `''`), matching the old seed data's format.
async function decorateAdmin(row) {
  const school = await getSchoolDirectoryEntry(row.schoolId);
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.name,
    email: row.email,
    status: row.status,
    permissions: row.permissions,
    photoUrl: row.photoUrl || null,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    lastPasswordResetAt: row.lastPasswordResetAt ? row.lastPasswordResetAt.toISOString().slice(0, 10) : '',
    schoolName: school?.name || 'Unknown School',
  };
}

export async function getAllAdmins() {
  const rows = await prisma.schoolAdmin.findMany({ orderBy: { createdAt: 'desc' } });
  return Promise.all(rows.map(decorateAdmin));
}

export async function getAdminBySchoolId(schoolId) {
  const row = await prisma.schoolAdmin.findUnique({ where: { schoolId } });
  return row ? decorateAdmin(row) : null;
}

export async function getAdminById(id) {
  const row = await prisma.schoolAdmin.findUnique({ where: { id } });
  return row ? decorateAdmin(row) : null;
}

export async function createSchoolAdmin(schoolId, data) {
  const existing = await prisma.schoolAdmin.findUnique({ where: { schoolId } });
  if (existing) {
    throw new Error('This school already has an admin account.');
  }
  const school = await getSchoolDirectoryEntry(schoolId);
  if (!school) throw new Error('School not found.');

  const passwordHash = await hashPassword(data.password);
  const row = await prisma.schoolAdmin.create({
    data: {
      schoolId,
      name: data.name,
      email: data.email.trim().toLowerCase(),
      passwordHash,
      status: 'Active',
      permissions: defaultPermissions(),
    },
  });
  return decorateAdmin(row);
}

export async function updateAdminPermissions(id, permissions) {
  const existing = await prisma.schoolAdmin.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.schoolAdmin.update({
    where: { id },
    data: { permissions: { ...existing.permissions, ...permissions } },
  });
  return decorateAdmin(row);
}

export async function updateAdminStatus(id, status) {
  try {
    const row = await prisma.schoolAdmin.update({ where: { id }, data: { status } });
    return decorateAdmin(row);
  } catch {
    return null;
  }
}

// Self-service profile edit (the admin panel's own "Profile" page, reached
// from the Topbar avatar) — deliberately just name + photo, same reasoning
// as lib/teachers.js's updateTeacherSelfProfile: email/password changes have
// their own dedicated, more careful flows elsewhere.
export async function updateAdminSelfProfile(id, { name, photoUrl }) {
  const existing = await prisma.schoolAdmin.findUnique({ where: { id } });
  if (!existing) throw new Error('Admin not found.');

  const data = {};
  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name is required.');
    data.name = trimmed;
  }
  if (photoUrl !== undefined) data.photoUrl = photoUrl;

  const row = await prisma.schoolAdmin.update({ where: { id }, data });

  // A replaced photo leaves its old R2 object orphaned otherwise — never
  // allowed to fail the save itself over an R2 hiccup.
  if (existing.photoUrl && existing.photoUrl !== row.photoUrl) {
    const { deleteObject, keyFromPublicUrl } = await import('./storage');
    deleteObject(keyFromPublicUrl(existing.photoUrl));
  }

  return decorateAdmin(row);
}

export async function resetAdminPassword(id) {
  const existing = await prisma.schoolAdmin.findUnique({ where: { id } });
  if (!existing) return null;

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const row = await prisma.schoolAdmin.update({
    where: { id },
    data: { passwordHash, lastPasswordResetAt: new Date() },
  });
  return { ...(await decorateAdmin(row)), tempPassword };
}

// Validates a school admin sign-in against the account a super admin created
// for them — the one login in the app backed by real, assignable credentials
// rather than a stub that accepts anything (now stored in Postgres).
export async function validateAdminCredentials(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const row = await prisma.schoolAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return { error: 'Invalid email or password.' };
  }
  if (row.status !== 'Active') {
    return { error: 'This admin account has been deactivated. Contact the platform administrator.' };
  }

  return { admin: await decorateAdmin(row) };
}

export async function getAdminDirectorySummary() {
  const [admins, schools] = await Promise.all([getAllAdmins(), getAllSchools()]);
  return { totalAdmins: admins.length, schoolsWithoutAdmin: schools.length - admins.length };
}
