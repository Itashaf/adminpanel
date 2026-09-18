import prisma from './db';
import { hashPassword, verifyPassword } from './auth/password';
import { getStudentById, decorateStudent } from './students';
import { deleteObject, keyFromPublicUrl } from './storage';

function generateTempPassword() {
  return `Parent${Math.random().toString(36).slice(2, 8)}!`;
}

function decorateParentAccount(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    photoUrl: row.photoUrl || null,
    students: (row.students || []).map((link) => decorateStudent(link.student)),
  };
}

// The whole "one login, several kids" trick: entering an email that already
// has a ParentAccount in this school just links this student to it instead
// of creating a second account (and no new password — the parent already has
// one) — so an admin sets up sibling #2/#3's access the exact same way as
// #1, no separate "search for existing parent" step needed. A brand new
// email creates a fresh account with a one-time temp password, same
// reveal-once pattern as every other password issuance in this app.
export async function linkOrCreateParentAccount(studentId, { email, name }, schoolId) {
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Enter a parent email address.');

  const existing = await prisma.parentAccount.findFirst({
    where: { schoolId, email: normalizedEmail },
    include: { students: { include: { student: true } } },
  });

  if (existing) {
    await prisma.parentStudentLink.upsert({
      where: { parentAccountId_studentId: { parentAccountId: existing.id, studentId } },
      create: { parentAccountId: existing.id, studentId },
      update: {},
    });
    const refreshed = await prisma.parentAccount.findUnique({
      where: { id: existing.id },
      include: { students: { include: { student: true } } },
    });
    return { isNewAccount: false, tempPassword: null, account: decorateParentAccount(refreshed) };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const created = await prisma.parentAccount.create({
    data: {
      schoolId,
      email: normalizedEmail,
      name: name?.trim() || `${student.firstName} ${student.lastName}'s Parent`,
      passwordHash,
      students: { create: [{ studentId }] },
    },
    include: { students: { include: { student: true } } },
  });
  return { isNewAccount: true, tempPassword, account: decorateParentAccount(created) };
}

export async function getParentAccountForStudent(studentId, schoolId) {
  const link = await prisma.parentStudentLink.findFirst({
    where: { studentId, parentAccount: { schoolId } },
    include: { parentAccount: { include: { students: { include: { student: true } } } } },
  });
  return link ? decorateParentAccount(link.parentAccount) : null;
}

export async function unlinkStudentFromParent(studentId, schoolId) {
  const link = await prisma.parentStudentLink.findFirst({
    where: { studentId, parentAccount: { schoolId } },
  });
  if (!link) return false;
  await prisma.parentStudentLink.delete({ where: { id: link.id } });
  return true;
}

// Same reveal-once-then-never-again pattern as every other password reissue
// in this app (lib/teachers.js's resetTeacherPassword, lib/admins.js's
// resetAdminPassword) — the account is looked up via any one of its linked
// students since the "Portal Access" action lives on a Student's profile,
// not a standalone Parents page (see StandingDiscountModal's sibling for
// this same "act via one child" convention).
export async function resetParentAccountPassword(studentId, schoolId) {
  const account = await getParentAccountForStudent(studentId, schoolId);
  if (!account) throw new Error('This student has no linked parent account yet.');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.parentAccount.update({ where: { id: account.id }, data: { passwordHash } });
  return { tempPassword, account };
}

// Validates a parent sign-in and returns every child linked to that one
// account — the caller (parentLoginAction / the mobile login route) picks
// the first as the initially "active" child and stores the rest for the
// switcher. No session/schoolId exists yet at this point (same reasoning as
// validateTeacherCredentials), so this looks up by email alone; the
// account's own schoolId goes into the session token from here on.
export async function validateParentCredentials(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const account = await prisma.parentAccount.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    include: { students: { include: { student: true } } },
  });

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return { error: 'Invalid email or password.' };
  }

  const decorated = decorateParentAccount(account);
  return { parentAccount: { id: decorated.id, name: decorated.name, email: decorated.email }, schoolId: account.schoolId, students: decorated.students };
}

// Confirms `studentId` is actually one of this parent's own linked children
// before "switching" the active one — the whole point of this check is that
// a parent can never be handed another family's data just by guessing/
// tampering with a studentId (see requireParent's own comment on this same
// invariant).
export async function verifyParentOwnsStudent(parentAccountId, studentId) {
  const link = await prisma.parentStudentLink.findFirst({ where: { parentAccountId, studentId } });
  return Boolean(link);
}

export async function getParentAccountById(parentAccountId, schoolId) {
  const row = await prisma.parentAccount.findFirst({
    where: { id: parentAccountId, schoolId },
    include: { students: { include: { student: true } } },
  });
  return row ? decorateParentAccount(row) : null;
}

// Self-service profile edit (mobile Edit Profile screen) — name + photo
// only. Phone isn't part of ParentAccount at all today, and email is the
// login identity, so neither is editable here — matches
// Teacher's updateTeacherSelfProfile.
export async function updateParentSelfProfile(id, schoolId, { name, photoUrl }) {
  const existing = await prisma.parentAccount.findFirst({ where: { id, schoolId } });
  if (!existing) throw new Error('Parent account not found.');

  // Photo-only saves (from the avatar picker) never send `name` — only
  // validate/touch it when the caller actually means to change it.
  const data = {};
  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name is required.');
    data.name = trimmed;
  }
  if (photoUrl !== undefined) data.photoUrl = photoUrl;

  const row = await prisma.parentAccount.update({
    where: { id },
    data,
    include: { students: { include: { student: true } } },
  });

  if (photoUrl !== undefined && existing.photoUrl && existing.photoUrl !== photoUrl) {
    deleteObject(keyFromPublicUrl(existing.photoUrl));
  }

  return decorateParentAccount(row);
}

export async function changeParentSelfPassword(id, schoolId, currentPassword, newPassword) {
  const existing = await prisma.parentAccount.findFirst({ where: { id, schoolId } });
  if (!existing) throw new Error('Parent account not found.');

  const valid = await verifyPassword(currentPassword, existing.passwordHash);
  if (!valid) throw new Error('Current password is incorrect.');
  if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.');

  const passwordHash = await hashPassword(newPassword);
  await prisma.parentAccount.update({ where: { id }, data: { passwordHash } });
}
