// One-off RBAC bootstrap (Option B, task list items 4-5): seeds the
// Role/Permission/RolePermission catalog, then backfills a User row for
// every existing SuperAdmin/SchoolAdmin/Teacher(login-enabled)/ParentAccount
// row and links it back via userId. Safe to re-run — every step is
// upsert/skip-if-already-migrated, same "safe to re-run" convention as
// prisma/seed.js. Run with: node prisma/migrate-rbac.js
const { PrismaClient } = require('@prisma/client');
const { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require('./rbacPermissions');

const ROLE_NAMES = {
  SuperAdmin: 'Super Admin',
  Principal: 'Principal',
  Admin: 'Admin',
  Teacher: 'Teacher',
  Accountant: 'Accountant',
  Parent: 'Parent',
};

async function seedRolesAndPermissions(prisma) {
  const roleIdByKey = {};
  for (const key of Object.keys(ROLE_NAMES)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: {},
      create: { key, name: ROLE_NAMES[key] },
    });
    roleIdByKey[key] = role.id;
  }

  const permissionIdByKey = {};
  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, label: p.label },
      create: p,
    });
    permissionIdByKey[p.key] = permission.id;
  }

  for (const [roleKey, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roleId = roleIdByKey[roleKey];
    await prisma.rolePermission.createMany({
      data: permissionKeys.map((key) => ({ roleId, permissionId: permissionIdByKey[key] })),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded ${Object.keys(ROLE_NAMES).length} roles, ${PERMISSIONS.length} permissions.`);
  return roleIdByKey;
}

// Not prisma.user.upsert() with a compound `schoolId_email` where — Prisma
// rejects null in a compound unique filter (schoolId is null for every
// SuperAdmin), so this does the same find-then-create/reuse by hand instead.
async function migrateSuperAdmins(prisma, roleIdByKey) {
  const rows = await prisma.superAdmin.findMany({ where: { userId: null } });
  for (const row of rows) {
    let user = await prisma.user.findFirst({ where: { schoolId: null, email: row.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          schoolId: null,
          roleId: roleIdByKey.SuperAdmin,
          name: row.name,
          email: row.email,
          passwordHash: row.passwordHash,
          status: 'Active',
        },
      });
    }
    await prisma.superAdmin.update({ where: { id: row.id }, data: { userId: user.id } });
  }
  console.log(`Migrated ${rows.length} SuperAdmin row(s).`);
}

async function migrateSchoolAdmins(prisma, roleIdByKey) {
  const rows = await prisma.schoolAdmin.findMany({ where: { userId: null } });
  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: row.schoolId, email: row.email } },
      update: {},
      create: {
        schoolId: row.schoolId,
        roleId: roleIdByKey.Admin,
        name: row.name,
        email: row.email,
        passwordHash: row.passwordHash,
        photoUrl: row.photoUrl,
        status: row.status === 'Active' ? 'Active' : 'Inactive',
        lastPasswordResetAt: row.lastPasswordResetAt,
      },
    });
    await prisma.schoolAdmin.update({ where: { id: row.id }, data: { userId: user.id } });
  }
  console.log(`Migrated ${rows.length} SchoolAdmin row(s) as Admin.`);
}

// Only a Teacher who can actually sign in today (loginEnabled +
// loginPasswordHash set) gets a User row — one who's never had login access
// turned on has nothing to migrate; it isn't a real account yet.
async function migrateTeachers(prisma, roleIdByKey) {
  const rows = await prisma.teacher.findMany({
    where: { userId: null, loginEnabled: true, loginPasswordHash: { not: null } },
  });
  let migrated = 0;
  for (const row of rows) {
    if (!row.loginEmail) continue;
    const user = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: row.schoolId, email: row.loginEmail } },
      update: {},
      create: {
        schoolId: row.schoolId,
        roleId: roleIdByKey.Teacher,
        name: `${row.firstName} ${row.lastName}`.trim(),
        email: row.loginEmail,
        phone: row.phone || '',
        passwordHash: row.loginPasswordHash,
        photoUrl: row.photoUrl,
        status: row.loginAccountStatus === 'Active' ? 'Active' : 'Inactive',
        passwordSetToken: row.passwordSetToken,
        passwordSetTokenExpiresAt: row.passwordSetTokenExpiresAt,
      },
    });
    await prisma.teacher.update({ where: { id: row.id }, data: { userId: user.id } });
    migrated += 1;
  }
  console.log(`Migrated ${migrated} login-enabled Teacher row(s).`);
}

async function migrateParents(prisma, roleIdByKey) {
  const rows = await prisma.parentAccount.findMany({ where: { userId: null } });
  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { schoolId_email: { schoolId: row.schoolId, email: row.email } },
      update: {},
      create: {
        schoolId: row.schoolId,
        roleId: roleIdByKey.Parent,
        name: row.name,
        email: row.email,
        passwordHash: row.passwordHash,
        photoUrl: row.photoUrl,
        status: 'Active',
      },
    });
    await prisma.parentAccount.update({ where: { id: row.id }, data: { userId: user.id } });
  }
  console.log(`Migrated ${rows.length} ParentAccount row(s).`);
}

async function main() {
  const prisma = new PrismaClient();
  const roleIdByKey = await seedRolesAndPermissions(prisma);
  await migrateSuperAdmins(prisma, roleIdByKey);
  await migrateSchoolAdmins(prisma, roleIdByKey);
  await migrateTeachers(prisma, roleIdByKey);
  await migrateParents(prisma, roleIdByKey);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
