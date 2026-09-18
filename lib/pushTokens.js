import prisma from './db';

// A device re-registers its Expo push token on every app open (see
// app/api/notifications/register-token/route.js) — `token` is unique per
// device+install, so this upserts by token rather than accumulating
// duplicate rows for the same device across logins/owner changes.
export async function registerPushToken({ schoolId, ownerRole, ownerId, token, platform }) {
  return prisma.pushToken.upsert({
    where: { token },
    update: { schoolId, ownerRole, ownerId, platform },
    create: { schoolId, ownerRole, ownerId, token, platform },
  });
}

// Token strings for a list of owner ids of one role (e.g. Teacher ids for a
// notice's recipient teachers, or Student ids for their parents' Parent-role
// tokens) — see lib/notices.js's createNotice, which resolves recipients per
// role and looks up each role's tokens separately.
export async function getPushTokensForOwners(ownerRole, ownerIds) {
  if (!ownerIds.length) return [];
  const rows = await prisma.pushToken.findMany({
    where: { ownerRole, ownerId: { in: ownerIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}

// Called when Expo reports a token as DeviceNotRegistered (app uninstalled,
// say) — see lib/expoPush.js. deleteMany (not delete) so this stays
// idempotent if the same stale token shows up in more than one batch.
export async function deletePushToken(token) {
  await prisma.pushToken.deleteMany({ where: { token } });
}
