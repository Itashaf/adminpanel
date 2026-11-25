import crypto from 'crypto';
import path from 'path';
import prisma from './db';
import { hashPassword } from './auth/password';

// Super Admin tools for any login on the platform: set a password directly, or email a reset link.
// A login can live in several tables (User plus its Teacher / ParentAccount / SchoolAdmin / SuperAdmin
// row), and each sign-in form checks its own table, so every place that holds the password is written.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const WITH_LINKS = {
  teacherProfile: { select: { id: true } },
  parentProfile: { select: { id: true } },
  schoolAdminOf: { select: { id: true } },
  superAdminOf: { select: { id: true } },
};

// 32 random bytes as hex, same shape as the teacher invite tokens. Anything else (an object such as
// { not: '' } from a JSON body would act as a filter matching every token) is rejected before a query.
export function isPasswordToken(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

async function writePassword(tx, user, passwordHash) {
  const now = new Date();
  await tx.user.update({
    where: { id: user.id },
    data: { passwordHash, lastPasswordResetAt: now, passwordSetToken: null, passwordSetTokenExpiresAt: null },
  });
  if (user.schoolAdminOf) {
    await tx.schoolAdmin.update({ where: { id: user.schoolAdminOf.id }, data: { passwordHash, lastPasswordResetAt: now } });
  }
  if (user.teacherProfile) {
    await tx.teacher.update({
      where: { id: user.teacherProfile.id },
      data: { loginPasswordHash: passwordHash, passwordSetToken: null, passwordSetTokenExpiresAt: null },
    });
  }
  if (user.parentProfile) {
    await tx.parentAccount.update({ where: { id: user.parentProfile.id }, data: { passwordHash } });
  }
  if (user.superAdminOf) {
    await tx.superAdmin.update({ where: { id: user.superAdminOf.id }, data: { passwordHash } });
  }
}

function checkNewPassword(plain) {
  if (typeof plain !== 'string' || plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (plain.length > 72) throw new Error('Password must be at most 72 characters.');
}

// Sets the password right away. Returns null when the user does not exist.
export async function setUserPassword(userId, plain) {
  checkNewPassword(plain);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: WITH_LINKS });
  if (!user) return null;
  const passwordHash = await hashPassword(plain);
  await prisma.$transaction((tx) => writePassword(tx, user, passwordHash));
  return { id: user.id };
}

// Emails a single-use link to /set-password. Returns null when the user does not exist.
export async function sendUserResetLink(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordSetToken: token, passwordSetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/set-password?token=${token}`;
  const firstName = user.name.split(' ')[0];
  const { sendMail } = await import('./email');
  const { passwordSetupEmailHtml, LOGO_CID } = await import('./emailTemplates');
  await sendMail({
    to: user.email,
    subject: 'Reset your SchoolApp 360 password',
    html: passwordSetupEmailHtml({ firstName, link, isReset: true }),
    text: `Hi ${firstName},\n\nReset your SchoolApp 360 password here (valid for 7 days):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(process.cwd(), 'public/images/logo_schoolapp360.png'),
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
  return { email: user.email };
}

// For the /set-password page: who a still-valid link belongs to.
export async function getUserByPasswordToken(token) {
  if (!isPasswordToken(token)) return null;
  const user = await prisma.user.findFirst({
    where: { passwordSetToken: token, passwordSetTokenExpiresAt: { gt: new Date() } },
    include: { role: { select: { key: true } } },
  });
  return user ? { id: user.id, name: user.name, roleKey: user.role.key } : null;
}

// The other end of the link: single use, clears the token and writes the password everywhere.
export async function setUserPasswordViaToken(token, plain) {
  const invalidLink = { error: 'This link is invalid or has expired. Ask your administrator to send a new one.' };
  if (!isPasswordToken(token)) return invalidLink;
  if (typeof plain !== 'string' || plain.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (plain.length > 72) return { error: 'Password must be at most 72 characters.' };

  const user = await prisma.user.findFirst({
    where: { passwordSetToken: token, passwordSetTokenExpiresAt: { gt: new Date() } },
    include: WITH_LINKS,
  });
  if (!user) return invalidLink;

  const passwordHash = await hashPassword(plain);
  try {
    await prisma.$transaction(async (tx) => {
      // Conditional on the token still being there, so two submits of the same link cannot both win.
      const { count } = await tx.user.updateMany({
        where: { id: user.id, passwordSetToken: token },
        data: { passwordSetToken: null, passwordSetTokenExpiresAt: null },
      });
      if (count !== 1) throw new Error('used');
      await writePassword(tx, user, passwordHash);
    });
  } catch (err) {
    if (err.message === 'used') return invalidLink;
    throw err;
  }
  return { success: true };
}
