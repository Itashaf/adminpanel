import prisma from './db';

export const SCHOOL_DIRECTORY_STATUSES = ['Active', 'Inactive'];

// Reshapes a Prisma row back into the exact plain-object shape every
// existing consumer (super-admin pages, lib/admins.js's decorateAdmin,
// lib/school.js's setActiveSchoolContext) already expects — `createdAt`
// stays a 'YYYY-MM-DD' string, matching the old in-memory seed data's
// format, so nothing downstream needed to change when this moved to
// Postgres. `studentCount`/`teacherCount` are both overridden by the caller
// with a live count (see withLiveStudentCounts) — the columns themselves
// are stale static seed data (1248/68, 842/51, 310/24, or 0 for a school
// created after) since nothing has ever written to them after creation.
function decorateSchool(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    principalName: row.principalName,
    email: row.email,
    phone: row.phone,
    displayName: row.displayName,
    logoUrl: row.logoUrl,
    city: row.city,
    state: row.state,
    country: row.country,
    status: row.status,
    currentSessionName: row.currentSessionName,
    studentCount: row.studentCount,
    teacherCount: row.teacherCount,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

// Students and Teachers both moved to real per-school Postgres tables (see
// lib/students.js/lib/teachers.js), so both counts are now a live aggregate
// instead of the static numbers stored on the School row itself (seed
// data's 1248/68 etc., or 0 for a school created after).
// Also decorates each school with `hasAdmin` — the Schools Directory's
// row-menu ("Assign Admin", only offered when a school has none yet) needs
// this without a second round-trip per row.
async function withLiveStudentCounts(schools) {
  const [studentGroups, teacherGroups, admins] = await Promise.all([
    prisma.student.groupBy({ by: ['schoolId'], _count: true, where: { schoolId: { in: schools.map((s) => s.id) } } }),
    prisma.teacher.groupBy({ by: ['schoolId'], _count: true, where: { schoolId: { in: schools.map((s) => s.id) } } }),
    prisma.schoolAdmin.findMany({ where: { schoolId: { in: schools.map((s) => s.id) } }, select: { schoolId: true } }),
  ]);
  const studentCounts = new Map(studentGroups.map((g) => [g.schoolId, g._count]));
  const teacherCounts = new Map(teacherGroups.map((g) => [g.schoolId, g._count]));
  const schoolIdsWithAdmin = new Set(admins.map((a) => a.schoolId));
  return schools.map((school) => ({
    ...school,
    studentCount: studentCounts.get(school.id) ?? 0,
    teacherCount: teacherCounts.get(school.id) ?? 0,
    hasAdmin: schoolIdsWithAdmin.has(school.id),
  }));
}

export async function getAllSchools() {
  const rows = await prisma.school.findMany({ orderBy: { createdAt: 'desc' } });
  return withLiveStudentCounts(rows.map(decorateSchool));
}

export async function getSchoolDirectoryEntry(id) {
  const row = await prisma.school.findUnique({ where: { id } });
  if (!row) return null;
  const [withCount] = await withLiveStudentCounts([decorateSchool(row)]);
  return withCount;
}

// Server-side search/filter/pagination for GET /api/schools — the Schools
// Directory page itself still reads getAllSchools() directly (server
// component, no need to round-trip through the API), but a client-side
// search box or a future paginated table needs an endpoint that doesn't
// require shipping every school to the browser up front.
export async function searchSchoolDirectory({ search = '', status = '', page = 1, pageSize = 20 } = {}) {
  const query = search.trim();
  const where = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.school.count({ where }),
  ]);

  return { schools: await withLiveStudentCounts(rows.map(decorateSchool)), total, page, pageSize };
}

function isDuplicateCodeError(err) {
  return err?.code === 'P2002';
}

function isNotFoundError(err) {
  return err?.code === 'P2025';
}

export async function addSchoolFromWizard(data) {
  try {
    const row = await prisma.school.create({
      data: {
        name: data.name,
        code: data.code,
        principalName: data.principalName || '',
        email: data.email,
        phone: data.phone,
        displayName: data.displayName || data.name,
        logoUrl: data.logoUrl || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        status: 'Active',
        currentSessionName: data.sessionName,
        studentCount: 0,
        teacherCount: 0,
      },
    });
    return decorateSchool(row);
  } catch (err) {
    if (isDuplicateCodeError(err)) {
      throw new Error(`A school with code "${data.code}" already exists.`);
    }
    throw err;
  }
}

export async function updateSchoolDirectoryStatus(id, status) {
  try {
    const row = await prisma.school.update({ where: { id }, data: { status } });
    return decorateSchool(row);
  } catch (err) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

export async function updateSchoolDirectory(id, data) {
  try {
    const row = await prisma.school.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        principalName: data.principalName || '',
        email: data.email,
        phone: data.phone,
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
      },
    });
    return decorateSchool(row);
  } catch (err) {
    if (isNotFoundError(err)) return null;
    if (isDuplicateCodeError(err)) {
      throw new Error(`A school with code "${data.code}" already exists.`);
    }
    throw err;
  }
}
