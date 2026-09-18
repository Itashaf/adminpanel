import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { SUBJECT_OPTIONS, DEFAULT_SUBJECT_CODES, DEFAULT_PRACTICAL_SUBJECTS } from './classConstants';

// Per-school master Subject list (see prisma/schema.prisma's Subject model).
// A school with zero Subject rows yet (every school created before this
// feature existed) is seeded once, lazily, from the old hardcoded
// SUBJECT_OPTIONS defaults — so nothing that already depends on a non-empty
// subject list breaks the first time this runs for a given school.
async function ensureSeeded(schoolId) {
  const count = await prisma.subject.count({ where: { schoolId } });
  if (count > 0) return;
  await prisma.subject.createMany({
    data: SUBJECT_OPTIONS.map((name) => ({
      schoolId,
      name,
      code: DEFAULT_SUBJECT_CODES[name] || name.slice(0, 3).toUpperCase(),
      type: DEFAULT_PRACTICAL_SUBJECTS.includes(name) ? 'Practical' : 'Theory',
    })),
    skipDuplicates: true,
  });
}

export async function getSubjects() {
  const schoolId = await resolveSchoolId();
  await ensureSeeded(schoolId);
  return prisma.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
}

export async function getSubjectNames() {
  const subjects = await getSubjects();
  return subjects.map((s) => s.name);
}

export async function addSubject({ name, code = '', type = 'Theory' }) {
  const schoolId = await resolveSchoolId();
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Subject name is required.');
  await ensureSeeded(schoolId);
  const existing = await prisma.subject.findUnique({ where: { schoolId_name: { schoolId, name: trimmedName } } });
  if (existing) throw new Error('This subject already exists.');
  return prisma.subject.create({
    data: { schoolId, name: trimmedName, code: (code || '').trim().slice(0, 10), type },
  });
}

export async function updateSubject(id, { name, code = '', type = 'Theory' }) {
  const schoolId = await resolveSchoolId();
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Subject name is required.');
  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  const clash = await prisma.subject.findUnique({ where: { schoolId_name: { schoolId, name: trimmedName } } });
  if (clash && clash.id !== id) throw new Error('This subject already exists.');
  return prisma.subject.update({
    where: { id },
    data: { name: trimmedName, code: (code || '').trim().slice(0, 10), type },
  });
}

// Blocks deletion while the subject name is still referenced anywhere, since
// Class.subjects/ExamSchedule.subject/Teacher.assignments store the plain
// name string rather than this row's id — an orphaned string left behind by
// a delete would silently vanish from every picker but keep showing up in
// already-saved schedules/marks/homework with no way to edit it back.
export async function deleteSubject(id) {
  const schoolId = await resolveSchoolId();
  const subject = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!subject) return null;

  const classUsing = await prisma.class.findFirst({ where: { schoolId, subjects: { has: subject.name } } });
  if (classUsing) throw new Error(`"${subject.name}" is still assigned to class ${classUsing.name} — remove it there first.`);

  const scheduleUsing = await prisma.examSchedule.findFirst({ where: { schoolId, subject: subject.name } });
  if (scheduleUsing) throw new Error(`"${subject.name}" is still used in an exam schedule — remove it there first.`);

  const teachers = await prisma.teacher.findMany({ where: { schoolId, assignments: { not: null } }, select: { assignments: true } });
  const assignedToTeacher = teachers.some((t) => (t.assignments || []).some((a) => a?.subject === subject.name));
  if (assignedToTeacher) throw new Error(`"${subject.name}" is still assigned to a teacher — remove that assignment first.`);

  await prisma.subject.delete({ where: { id } });
  return true;
}

// Real "connection" between every subject-accepting write path (Class
// subjects, ExamSchedule.subject, Homework.subject, Teacher.assignments'
// subject) and the master Subject list, short of a full foreign-key rewrite
// (those fields all store the plain name string, not this row's id — see
// deleteSubject's comment above for why that migration was skipped). Every
// place that used to accept any typed string now rejects one that isn't a
// real row here, wherever the schoolId is already known to the caller
// (accepts it explicitly rather than re-resolving, since a couple of callers
// — lib/teachers.js's assignClassToTeacher — take schoolId as a plain
// parameter rather than always going through resolveSchoolId()). Blank
// entries are always allowed through (an optional subject field, or an
// empty Class.subjects array).
export async function assertValidSubjects(schoolId, names) {
  const candidates = (Array.isArray(names) ? names : [names]).filter(Boolean);
  if (candidates.length === 0) return;
  await ensureSeeded(schoolId);
  const rows = await prisma.subject.findMany({ where: { schoolId, name: { in: candidates } }, select: { name: true } });
  const valid = new Set(rows.map((r) => r.name));
  const invalid = candidates.filter((name) => !valid.has(name));
  if (invalid.length > 0) {
    throw new Error(`Unknown subject: ${invalid.join(', ')}. Add it in Academics > Subjects first.`);
  }
}
