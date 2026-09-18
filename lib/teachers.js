import prisma from './db';
import { hashPassword, verifyPassword } from './auth/password';
import { deleteObject, keyFromPublicUrl } from './storage';
import { ACADEMIC_SESSIONS } from './students';
import { assertValidSubjects } from './subjects';

const PASSWORD_SET_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function buildAppUrl(path) {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`;
}

// `crypto` and lib/email.js (nodemailer, which itself needs Node's real
// `net`/`tls`/`dns`) are both dynamically imported here rather than at
// module scope — this file also re-exports plain constants (ACADEMIC_SESSIONS
// etc.) that Client Components import directly (TeacherForm.jsx and
// friends), and a static top-level import of either would drag Node-only
// built-ins into that client bundle, which Turbopack can't chunk at all
// (fails the whole page with "does not support external modules (request:
// node:net)"). A dynamic import here still only ever actually runs
// server-side (every caller of these functions is a Server Action or API
// route), so this has the same effect without poisoning the client graph.
async function generatePasswordSetToken() {
  const crypto = await import('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Fire-and-forget from the caller's point of view — a mail delivery hiccup
// (no SMTP configured yet, provider down, whatever) must never fail the
// teacher-creation/login-access-toggle/reset-password action that triggered
// it, since the token is already safely stored either way; see lib/email.js
// for what actually happens when there's no real SMTP_HOST set.
async function sendPasswordSetEmail({ firstName, email }, token, { isReset = false } = {}) {
  if (!email) return;
  const link = buildAppUrl(`/set-password?token=${token}`);
  const subject = isReset ? 'Reset your SchoolApp 360 password' : 'Set up your SchoolApp 360 account';
  const text = isReset
    ? `Hi ${firstName},\n\nReset your SchoolApp 360 password here (valid for 7 days):\n${link}\n\nIf you didn't request this, you can ignore this email.`
    : `Hi ${firstName},\n\nYour school admin gave you login access to SchoolApp 360. Set your password here (valid for 7 days):\n${link}`;
  try {
    const { sendMail } = await import('./email');
    const { passwordSetupEmailHtml, LOGO_CID } = await import('./emailTemplates');
    const path = await import('path');
    const html = passwordSetupEmailHtml({ firstName, link, isReset });
    await sendMail({
      to: email,
      subject,
      html,
      text,
      // Embedded (not linked) so the logo still renders when this app is
      // only reachable at localhost — a linked <img src="https://..."> would
      // 404 for every recipient outside the developer's own machine.
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(process.cwd(), 'public/images/logo_schoolapp360.png'),
          cid: LOGO_CID,
          contentDisposition: 'inline',
        },
      ],
    });
  } catch {
    // Best-effort — see comment above.
  }
}

export { ACADEMIC_SESSIONS };

// Re-exported here too, for server-side convenience (so
// `import { GENDERS } from './teachers'` still works from other
// server-only files) — but Client Components (TeacherForm.jsx,
// TeachersToolbar.jsx) must import these from lib/teacherConstants.js
// directly, never from here; see that file for why.
export {
  EMPLOYMENT_TYPES,
  TEACHER_STATUSES,
  GENDERS,
  BLOOD_GROUPS,
  ACCOUNT_STATUSES,
  MARITAL_STATUSES,
  EMERGENCY_RELATIONSHIPS,
} from './teacherConstants';

// Reshapes a Prisma Teacher row back into the flat shape every existing
// consumer (TeacherForm, TeacherProfileHeader, lib/iam.js, etc.) already
// expects — same convention as lib/students.js's decorateStudent. The old
// in-memory `loginAccess.password` never comes back here (same as it never
// really did before — API routes never returned it either); `role` is kept
// for consumers that destructure it even though nothing reads it today.
function decorateTeacher(row) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    initials: row.initials,
    dob: row.dob,
    gender: row.gender,
    bloodGroup: row.bloodGroup,
    phone: row.phone,
    email: row.email,
    aadhaarNumber: row.aadhaarNumber,
    aadhaarDocumentName: row.aadhaarDocumentName,
    aadhaarDocumentUrl: row.aadhaarDocumentUrl || null,
    maritalStatus: row.maritalStatus,
    nationality: row.nationality,
    panNumber: row.panNumber,
    isFresher: row.isFresher,
    education: row.education || undefined,
    bankDetails: row.bankDetails || undefined,
    emergencyContact: row.emergencyContact || undefined,
    documents: row.documents || undefined,
    joiningDate: row.joiningDate,
    relievingDate: row.relievingDate,
    qualification: row.qualification,
    specialization: row.specialization,
    experience: row.experience,
    employmentType: row.employmentType,
    status: row.status,
    designation: row.designation,
    loginAccess: {
      enabled: row.loginEnabled,
      email: row.loginEmail,
      role: 'Teacher',
      accountStatus: row.loginAccountStatus,
      // Never the hash itself — just whether one exists yet, so the UI can
      // tell "still needs their first invite" apart from "already set a
      // password, this would be a reset" (see TeacherProfileHeader.jsx).
      hasPassword: Boolean(row.loginPasswordHash),
    },
    address: row.address || undefined,
    assignments: row.assignments || [],
    classTeacherOf: row.classTeacherOf ? row.classTeacherOf.map((s) => ({ className: s.class.name, sectionName: s.name })) : [],
    photoUrl: row.photoUrl || null,
  };
}

// Was lib/schoolScope.js's in-memory `globalThis.__TEACHERS_BY_SCHOOL__` Map
// — now a real `schoolId` column (see prisma/schema.prisma's Teacher model).
// `schoolId` is REQUIRED (no default) — same reasoning as
// lib/students.js's getSchoolStudents(): a missing schoolId used to
// silently fall back to lib/school.js's shared `ACTIVE_SCHOOL` singleton,
// a real cross-tenant leak risk on a deployment shared by every school.
// Every call site already passes its own resolved schoolId (see
// lib/iam.js's getCurrentUserInfo(), which passes a signed-in mobile
// Teacher's own session.schoolId here).
async function getSchoolTeachers(schoolId) {
  const rows = await prisma.teacher.findMany({ where: { schoolId } });
  return rows.map(decorateTeacher);
}

export async function getTeacherStats(schoolId) {
  const teachers = await getSchoolTeachers(schoolId);
  const active = teachers.filter((t) => t.status === 'Active').length;
  const inactive = teachers.filter((t) => t.status !== 'Active').length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = teachers.filter((t) => t.joiningDate?.startsWith(thisMonth)).length;

  return {
    total: teachers.length,
    active,
    newThisMonth,
    inactive,
  };
}

export async function getAllTeachers(schoolId) {
  return getSchoolTeachers(schoolId);
}

export async function getTeacherById(id, schoolId) {
  const row = await prisma.teacher.findFirst({
    where: { id, schoolId },
    include: { classTeacherOf: { select: { name: true, class: { select: { name: true } } } } },
  });
  return row ? decorateTeacher(row) : null;
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function buildTeacherFields(data) {
  return {
    employeeId: data.employeeId,
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    initials: getInitials(data.firstName, data.lastName),
    photoUrl: data.photoUrl || null,
    dob: data.dob,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    phone: data.phone,
    email: data.email,
    aadhaarNumber: data.aadhaarNumber,
    aadhaarDocumentName: data.aadhaarDocument,
    aadhaarDocumentUrl: data.aadhaarDocumentUrl || null,
    maritalStatus: data.maritalStatus,
    nationality: data.nationality,
    panNumber: data.panNumber,
    joiningDate: data.joiningDate,
    relievingDate: data.relievingDate,
    qualification: data.qualification,
    specialization: data.specialization,
    experience: data.experience,
    employmentType: data.employmentType,
    status: data.status || 'Active',
    isFresher: Boolean(data.isFresher),
    designation: data.specialization ? `${data.specialization} Teacher` : 'Teacher',
    education: {
      tenthPercentage: data.tenthPercentage,
      twelfthPercentage: data.twelfthPercentage,
      graduationDegree: data.graduationDegree,
      graduationUniversity: data.graduationUniversity,
    },
    bankDetails: {
      accountHolderName: data.bankAccountHolderName,
      bankName: data.bankName,
      accountNumber: data.bankAccountNumber,
      ifsc: data.bankIFSC,
    },
    // 10th/12th/Graduation/Work Experience certificates — already uploaded
    // (see TeacherForm.jsx) by the time this runs, so these are always real
    // R2 URLs or undefined, never a File.
    documents: {
      tenthCertificateUrl: data.tenthCertificateUrl || null,
      twelfthCertificateUrl: data.twelfthCertificateUrl || null,
      graduationCertificateUrl: data.graduationCertificateUrl || null,
      workExperienceCertificateUrl: data.workExperienceCertificateUrl || null,
    },
    emergencyContact: {
      name: data.emergencyContactName,
      phone: data.emergencyContactPhone,
      relationship: data.emergencyContactRelationship,
    },
    address: {
      line1: data.addressLine1,
      line2: data.addressLine2,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
    },
  };
}

// loginPasswordHash is intentionally left untouched here — same as the old
// in-memory version, TeacherForm has no password field of its own, so a
// brand-new teacher (or an edited one) keeps whatever hash addTeacher/
// resetTeacherPassword last set, until an admin issues one via "Reset
// Password".
function buildLoginAccessFields(data) {
  return data.loginAccessEnabled
    ? {
        loginEnabled: true,
        loginEmail: data.loginEmail || data.email,
        loginAccountStatus: data.accountStatus || 'Active',
      }
    : { loginEnabled: false, loginEmail: '', loginAccountStatus: 'Suspended' };
}

// When login access is enabled at creation, a teacher needs a real way to
// actually get in from day one — rather than an admin-visible temp
// password (what the old in-memory version, and this file until now, did:
// generate a plaintext password an admin would have to relay out-of-band),
// this generates a one-time set-password token and emails the teacher a
// link to set their own password — matching the "System Access" card's own
// promise ("the teacher sets their own password through SchoolApp 360's
// secure sign-in flow", see TeacherForm.jsx) instead of contradicting it.
// `loginPasswordHash` stays null until they actually use that link.
export async function addTeacher(data, schoolId) {
  const token = data.loginAccessEnabled ? await generatePasswordSetToken() : null;
  try {
    const row = await prisma.teacher.create({
      data: {
        schoolId,
        ...buildTeacherFields(data),
        ...buildLoginAccessFields(data),
        loginPasswordHash: null,
        passwordSetToken: token,
        passwordSetTokenExpiresAt: token ? new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS) : null,
        assignments: [],
      },
    });
    if (token) {
      await sendPasswordSetEmail({ firstName: row.firstName, email: row.loginEmail }, token);
    }
    return decorateTeacher(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`Employee ID "${data.employeeId}" is already in use.`);
    }
    throw err;
  }
}

export async function updateTeacher(id, data, schoolId) {
  const existingRow = await prisma.teacher.findFirst({ where: { id, schoolId } });
  if (!existingRow) return null;

  try {
    const row = await prisma.teacher.update({
      where: { id },
      data: { ...buildTeacherFields(data), ...buildLoginAccessFields(data) },
    });

    // A replaced photo leaves its old R2 object orphaned otherwise — same
    // cleanup lib/students.js's updateStudent does. Never allowed to fail
    // the edit itself over an R2 hiccup.
    if (existingRow.photoUrl && existingRow.photoUrl !== row.photoUrl) {
      const { deleteObject, keyFromPublicUrl } = await import('./storage');
      deleteObject(keyFromPublicUrl(existingRow.photoUrl));
    }

    // Login access just got turned on for a teacher who's never had a
    // password or a still-live invite — same "must actually be able to
    // sign in" fix as addTeacher, for the edit-form path (this is what was
    // silently doing nothing before: the toggle flipped `loginEnabled` on
    // but no password ever got created).
    const stillLiveToken = existingRow.passwordSetToken && existingRow.passwordSetTokenExpiresAt > new Date();
    if (data.loginAccessEnabled && !existingRow.loginPasswordHash && !stillLiveToken) {
      const token = await generatePasswordSetToken();
      await prisma.teacher.update({
        where: { id },
        data: { passwordSetToken: token, passwordSetTokenExpiresAt: new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS) },
      });
      await sendPasswordSetEmail({ firstName: row.firstName, email: row.loginEmail }, token);
    }

    return decorateTeacher(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`Employee ID "${data.employeeId}" is already in use.`);
    }
    throw err;
  }
}

export async function updateTeacherStatus(id, status, schoolId) {
  const existing = await getTeacherById(id, schoolId);
  if (!existing) return null;
  try {
    const row = await prisma.teacher.update({ where: { id }, data: { status } });
    return decorateTeacher(row);
  } catch {
    return null;
  }
}

// Validates a teacher sign-in against their own record's loginAccess — same
// real-credentials pattern as validateAdminCredentials in lib/admins.js.
export async function validateTeacherCredentials(email, password) {
  // No session exists yet at login time, so there's no schoolId to scope
  // this lookup by — schoolId is derived FROM the row we find here and
  // carried in the session token from this point on (see
  // app/api/auth/teacher/login/route.js and getActiveSchoolId()).
  const normalizedEmail = email?.trim().toLowerCase();
  const row = await prisma.teacher.findFirst({
    where: { loginEmail: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (!row || !row.loginPasswordHash || !(await verifyPassword(password, row.loginPasswordHash))) {
    return { error: 'Invalid email or password.' };
  }
  if (!row.loginEnabled) {
    return { error: 'Login access has not been enabled for this account. Contact your school admin.' };
  }
  if (row.loginAccountStatus !== 'Active') {
    return { error: 'Your account has been suspended. Contact your school admin.' };
  }

  return { teacher: decorateTeacher(row), schoolId: row.schoolId };
}

// Backs the public "Forgot Password" page — deliberately never reveals
// whether `email` actually belongs to a teacher account (the caller always
// shows the same "check your email" message either way); this only sends
// something when there's a real, login-enabled match.
export async function requestTeacherPasswordReset(email) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;
  const row = await prisma.teacher.findFirst({
    where: { loginEmail: { equals: normalizedEmail, mode: 'insensitive' }, loginEnabled: true },
  });
  if (!row) return;

  const token = await generatePasswordSetToken();
  await prisma.teacher.update({
    where: { id: row.id },
    data: { passwordSetToken: token, passwordSetTokenExpiresAt: new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS) },
  });
  await sendPasswordSetEmail({ firstName: row.firstName, email: row.loginEmail }, token, { isReset: true });
}

// Emails a reset link instead of generating a plaintext password the admin
// would see on screen (the old behavior — directly contradicted the
// "System Access" card's own promise). `loginPasswordHash` is left alone
// until the teacher actually uses the link.
export async function resetTeacherPassword(id, schoolId) {
  const existing = await getTeacherById(id, schoolId);
  if (!existing || !existing.loginAccess?.enabled) return null;

  const token = await generatePasswordSetToken();
  const row = await prisma.teacher.update({
    where: { id },
    data: { passwordSetToken: token, passwordSetTokenExpiresAt: new Date(Date.now() + PASSWORD_SET_TOKEN_TTL_MS) },
  });
  await sendPasswordSetEmail({ firstName: row.firstName, email: row.loginEmail }, token, { isReset: true });
  return { teacher: decorateTeacher(row) };
}

// Looks a teacher up by an unexpired set-password token — used by the
// /set-password page to validate the link before showing the form (and to
// know which teacher it's actually setting a password for).
export async function getTeacherByPasswordToken(token) {
  if (!token) return null;
  const row = await prisma.teacher.findFirst({
    where: { passwordSetToken: token, passwordSetTokenExpiresAt: { gt: new Date() } },
  });
  return row ? { id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.loginEmail } : null;
}

// The other end of the invite/reset link — consumes the token (single use:
// cleared immediately after) and sets the real password hash. This is the
// only teacher-self-service way `loginPasswordHash` ever gets set, other
// than an admin's "Reset Login Password" issuing a fresh link (which lands
// here too).
export async function setTeacherPasswordViaToken(token, newPassword) {
  const row = await prisma.teacher.findFirst({
    where: { passwordSetToken: token, passwordSetTokenExpiresAt: { gt: new Date() } },
  });
  if (!row) return { error: 'This link is invalid or has expired. Ask your school admin to send a new one.' };

  const loginPasswordHash = await hashPassword(newPassword);
  await prisma.teacher.update({
    where: { id: row.id },
    data: { loginPasswordHash, passwordSetToken: null, passwordSetTokenExpiresAt: null },
  });
  return { success: true };
}

export async function assignClassToTeacher(id, { academicSession, class: className, section, subject }, schoolId) {
  const existing = await getTeacherById(id, schoolId);
  if (!existing) return null;
  await assertValidSubjects(schoolId, subject);

  // Same class+section can be assigned more than once with different
  // subjects (e.g. one teacher covers both Hindi and Sanskrit for the same
  // section) — only an exact class+section+subject repeat is a duplicate.
  const isDuplicate = existing.assignments.some(
    (a) => a.academicSession === academicSession && a.class === className && a.section === section && (a.subject || '') === (subject || '')
  );
  if (isDuplicate) {
    throw new Error('This teacher is already assigned to this class, section, and subject.');
  }

  const assignment = { id: `${Date.now()}`, academicSession, class: className, section, subject: subject || '', status: 'Active' };
  const assignments = [...existing.assignments, assignment];
  const row = await prisma.teacher.update({ where: { id }, data: { assignments } });
  return decorateTeacher(row);
}

export async function removeAssignmentFromTeacher(id, assignmentId, schoolId) {
  const existing = await getTeacherById(id, schoolId);
  if (!existing) return null;

  const assignments = existing.assignments.filter((a) => a.id !== assignmentId);
  const row = await prisma.teacher.update({ where: { id }, data: { assignments } });
  return decorateTeacher(row);
}

// Self-service profile edit (mobile Edit Profile screen) — deliberately just
// name + photo. Phone stays out of this: no OTP/verification flow exists yet
// to confirm a changed number actually belongs to this teacher (see
// ParentAccount's matching updateParentSelfProfile — same reasoning).
export async function updateTeacherSelfProfile(id, schoolId, { name, photoUrl }) {
  const existing = await prisma.teacher.findFirst({ where: { id, schoolId } });
  if (!existing) throw new Error('Teacher not found.');

  // Photo-only saves (from the avatar picker) never send `name` — only
  // validate/touch it when the caller actually means to change it.
  const data = {};
  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name is required.');
    const [firstName, ...rest] = trimmed.split(/\s+/);
    const lastName = rest.join(' ') || existing.lastName;
    data.firstName = firstName;
    data.lastName = lastName;
    data.initials = getInitials(firstName, lastName);
  }
  if (photoUrl !== undefined) data.photoUrl = photoUrl;

  const row = await prisma.teacher.update({ where: { id }, data });

  // Best-effort — replacing/removing a photo shouldn't fail the save over an
  // R2 hiccup, same reasoning as deleteObject's own try/catch.
  if (photoUrl !== undefined && existing.photoUrl && existing.photoUrl !== photoUrl) {
    deleteObject(keyFromPublicUrl(existing.photoUrl));
  }

  return decorateTeacher(row);
}

// Current-password-verifying change (distinct from the admin
// reset-password/token-link flow above, which never checks a current
// password — this is the in-app "I know my password, let me change it" path).
export async function changeTeacherSelfPassword(id, schoolId, currentPassword, newPassword) {
  const existing = await prisma.teacher.findFirst({ where: { id, schoolId } });
  if (!existing) throw new Error('Teacher not found.');
  if (!existing.loginPasswordHash) throw new Error('No password set for this account yet.');

  const valid = await verifyPassword(currentPassword, existing.loginPasswordHash);
  if (!valid) throw new Error('Current password is incorrect.');
  if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.');

  const loginPasswordHash = await hashPassword(newPassword);
  await prisma.teacher.update({ where: { id }, data: { loginPasswordHash } });
}
