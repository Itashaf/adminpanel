import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { requirePermission, getRoleByKey, assertCanAssignRole } from '@/lib/rbac';

// Teacher/Parent have rich legacy profiles (Teacher's HR fields, class/
// subject assignments; ParentAccount's linked children) with their own
// dedicated creation flows (POST /api/teachers, the Student "Portal Access"
// action) that this route does not duplicate — a bare User row with no
// Teacher/ParentAccount row would have a role but none of the scoping data
// classTeacherOf/linked-children actually depends on. Those dedicated flows
// still need to start linking a User row themselves (follow-up, same shape
// as task 17's password sync) before Teacher/Parent can be created through
// one single path — not done yet.
const DIRECT_CREATE_ROLES = ['Principal', 'Admin', 'Accountant'];

function generateTempPassword() {
  return `SchoolApp360${Math.random().toString(36).slice(2, 8)}!`;
}

export async function GET() {
  const { user, error } = await requirePermission('users.view');
  if (error) return error;

  const where = user.roleKey === 'SuperAdmin' ? {} : { schoolId: user.schoolId };
  const rows = await prisma.user.findMany({
    where,
    include: { role: { select: { key: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      roleKey: r.role.key,
      roleName: r.role.name,
      schoolId: r.schoolId,
      photoUrl: r.photoUrl,
      lastLoginAt: r.lastLoginAt,
    }))
  );
}

export async function POST(request) {
  const { user, error } = await requirePermission('users.create');
  if (error) return error;

  const { name, email, phone, roleKey, schoolId: bodySchoolId } = await request.json();
  if (!name || !email || !roleKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!DIRECT_CREATE_ROLES.includes(roleKey)) {
    return NextResponse.json(
      { error: `Cannot create a ${roleKey} user here — use the dedicated Teacher/Student portal-access flow instead.` },
      { status: 400 }
    );
  }

  // Server-enforced hierarchy — the frontend hides options above the
  // caller's authority, but this is the actual boundary (spec: "Do not
  // trust role/permission values coming from the frontend").
  try {
    assertCanAssignRole(user.roleKey, roleKey);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // Only a Super Admin (no school of their own) may target another
  // school's id — every other caller's new user always lands in *their
  // own* school, regardless of what the request body says. Never trust a
  // client-supplied schoolId from a school-scoped caller (spec: "Modify
  // schoolId to access another school").
  const schoolId = user.roleKey === 'SuperAdmin' ? bodySchoolId : user.schoolId;
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
  }

  const role = await getRoleByKey(roleKey);
  if (!role) return NextResponse.json({ error: 'Unknown role' }, { status: 400 });

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  try {
    const created = await prisma.user.create({
      data: { schoolId, roleId: role.id, name, email: email.trim().toLowerCase(), phone: phone || '', passwordHash },
    });
    return NextResponse.json({ id: created.id, name: created.name, email: created.email, roleKey, tempPassword });
  } catch (err) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists in this school.' }, { status: 400 });
    }
    throw err;
  }
}
