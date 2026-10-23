import prisma from './db';
import { verifyPassword } from './auth/password';

// Real credential check against Postgres — the Super Admin account lives in
// the database (created by prisma/seed.js, whose password comes from the
// SUPER_ADMIN_SEED_PASSWORD environment variable). No password is kept in
// source code.
export async function validateSuperAdminCredentials(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!superAdmin || !(await verifyPassword(password, superAdmin.passwordHash))) {
    return { error: 'Invalid email or password.' };
  }

  return { superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email } };
}
