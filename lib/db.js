import { PrismaClient } from '@prisma/client';

// Next.js dev's hot-reload re-evaluates this module on every edit; caching
// the client on `globalThis` (same pattern as the rest of this codebase's
// in-memory stores) avoids exhausting Postgres connections across reloads.
const prisma = globalThis.__PRISMA__ ?? (globalThis.__PRISMA__ = new PrismaClient());

export default prisma;
