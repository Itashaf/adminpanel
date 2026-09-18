import prisma from './db';
import { verifyPassword } from './auth/password';

// Real credential check against Postgres now — previously a hardcoded
// SUPER_ADMIN_TEST_CREDENTIALS constant checked in-process. The seeded test
// account (superadmin@edumanage.io / SuperAdmin@123, see prisma/seed.js)
// keeps the same email/password the login page's "Test credentials" box
// already advertises, so nothing about the demo UX changes.
export async function validateSuperAdminCredentials(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!superAdmin || !(await verifyPassword(password, superAdmin.passwordHash))) {
    return { error: 'Invalid email or password.' };
  }

  return { superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email } };
}
