import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getAllTeachers, getTeacherById, assignClassToTeacher, removeAssignmentFromTeacher } from './teachers';
import { getAllStudents } from './students';
import { CLASS_STATUSES, SECTION_STATUSES, CLASS_LEVELS, classNameForLevel, wingForLevel, SUBJECT_OPTIONS } from './classConstants';
import { assertValidSubjects } from './subjects';

// Client-safe constants/helpers (CLASS_STATUSES, SECTION_STATUSES,
// CLASS_LEVELS, classNameForLevel, wingForLevel, SUBJECT_OPTIONS) live in
// lib/classConstants.js, not here — this file pulls in Prisma +
// resolveSchoolId's next/headers dependency, so it must never be reachable
// from a Client Component. ClassFormModal.jsx/SectionFormModal.jsx/
// SubjectsModal.jsx/HomeworkFormModal.jsx import those from
// lib/classConstants.js directly. Re-exported here too, for server-side
// convenience (so `import { SUBJECT_OPTIONS } from './classes'` still works
// from other server-only files).
export { CLASS_STATUSES, SECTION_STATUSES, CLASS_LEVELS, classNameForLevel, wingForLevel, SUBJECT_OPTIONS };

// Playway/Nursery/LKG/UKG, then Class 1-12 — same order as every class
// picker in the app — rather than whatever order Prisma happens to return
// Class rows in (creation order), which is all a newly `addClass`-created
// class (see below) would otherwise sort by.
const CLASS_ORDER = new Map(CLASS_LEVELS.map((level, index) => [classNameForLevel(level), index]));
function byClassOrder(a, b) {
  return (CLASS_ORDER.get(a.name) ?? Infinity) - (CLASS_ORDER.get(b.name) ?? Infinity);
}

export async function getActiveTeacherOptions() {
  const teachers = await getAllTeachers(await resolveSchoolId());
  return teachers
    .filter((teacher) => teacher.status === 'Active')
    .map((teacher) => ({ value: teacher.id, label: `${teacher.firstName} ${teacher.lastName}` }));
}

// Real, per-school "how many sections does this class actually have" map —
// `{ className: ['A', 'B', ...] }` — replaces the old hardcoded
// lib/students.js CLASS_SECTIONS constant. Section count is now entirely the
// admin's own choice per class (0, 1, or many, via the Classes & Sections
// module's "Add Section"), not a fixed list keyed by class name. A class
// name with no real Class row yet (or one with zero sections) simply has no
// key here — every consumer already treats a missing key as `[]`. The
// nameless hidden section lib/classes.js's assignClassTeacher creates for a
// section-less class (see ClassTeacherCard.jsx) is deliberately excluded
// (`.filter(Boolean)`) — it must never appear as a real, pickable section.
export async function getClassSectionsMap() {
  const schoolId = await resolveSchoolId();
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: { where: { status: 'Active' }, select: { name: true } } },
  });

  const unordered = {};
  for (const cls of classes) {
    const names = cls.sections.map((s) => s.name).filter(Boolean);
    const existing = unordered[cls.name] || [];
    unordered[cls.name] = Array.from(new Set([...existing, ...names])).sort();
  }

  // Insertion order here is Playway/Nursery/LKG/UKG, then Class 1-12 (see
  // lib/classConstants.js's CLASS_LEVELS) rather than whatever order Prisma
  // happened to return Class rows in (creation order) — every consumer that
  // does `Object.keys(classSections)` to build a dropdown/checkbox list
  // relies on this map's own key order for that.
  const map = {};
  for (const level of CLASS_LEVELS) {
    const name = classNameForLevel(level);
    if (name in unordered) map[name] = unordered[name];
  }
  for (const name of Object.keys(unordered)) {
    if (!(name in map)) map[name] = unordered[name];
  }
  return map;
}

// Real enrollment counts, derived live from the Student table — Section.boys
// / Section.girls are stale leftover seed-data columns (see
// lib/classSeedData.js) that nothing ever updates when a student is
// added/imported/removed, so counting from Student directly is the only way
// these numbers reflect reality (e.g. a bulk import into Nursery showing up
// under Classes & Sections immediately, no separate "recount" step needed).
function countGender(students) {
  return {
    studentCount: students.length,
    boys: students.filter((s) => s.gender === 'Male').length,
    girls: students.filter((s) => s.gender === 'Female').length,
  };
}

async function countStudentsForClassSection(schoolId, className, sectionName, academicSession) {
  const rows = await prisma.student.findMany({
    where: { schoolId, class: className, section: sectionName, academicSession },
    select: { gender: true },
  });
  return countGender(rows);
}

// Reshapes a Prisma Section row (optionally with its `classTeacher` relation
// already `include`d) back into the flat shape every existing consumer
// (SectionCard, AssignSectionTeacherModal, etc.) already expects. `counts`
// (studentCount/boys/girls) is computed by the caller from real Student rows.
function decorateSection(row, counts = { studentCount: 0, boys: 0, girls: 0 }) {
  const capacity = row.capacity || 0;
  const { studentCount, boys, girls } = counts;
  const capacityPercent = capacity > 0 ? Math.min(100, Math.round((studentCount / capacity) * 100)) : 0;

  let capacityState = 'normal';
  if (capacity > 0 && studentCount > capacity) capacityState = 'over';
  else if (capacity > 0 && studentCount === capacity) capacityState = 'reached';

  return {
    id: row.id,
    classId: row.classId,
    name: row.name,
    academicSession: row.academicSession,
    classTeacherId: row.classTeacherId || '',
    classTeacherName: row.classTeacher ? `${row.classTeacher.firstName} ${row.classTeacher.lastName}` : '',
    room: row.room,
    capacity,
    boys,
    girls,
    status: row.status,
    studentCount,
    capacityPercent,
    capacityState,
  };
}

// `students` is the full, already-fetched roster (see getAllStudents) —
// passed in rather than queried per class so a page listing many classes
// only ever fetches the Student table once.
function decorateClass(row, students) {
  const classStudents = students.filter((s) => s.class === row.name && s.academicSession === row.academicSession);
  const sections = row.sections.map((section) =>
    decorateSection(section, countGender(classStudents.filter((s) => s.section === section.name)))
  );
  const totalCounts = countGender(classStudents);
  const teacherIds = new Set(sections.filter((section) => section.classTeacherId).map((section) => section.classTeacherId));

  return {
    id: row.id,
    name: row.name,
    level: row.level,
    academicSession: row.academicSession,
    status: row.status,
    subjects: row.subjects || [],
    wing: wingForLevel(row.level),
    sections,
    sectionCount: sections.length,
    totalStudents: totalCounts.studentCount,
    totalBoys: totalCounts.boys,
    totalGirls: totalCounts.girls,
    classTeacherCount: teacherIds.size,
    createdAt: row.createdAt.toISOString(),
  };
}

const CLASS_WITH_SECTIONS_INCLUDE = { sections: { include: { classTeacher: true } } };

export async function getClassesForSession(academicSession) {
  const schoolId = await resolveSchoolId();
  const [rows, students] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, academicSession }, include: CLASS_WITH_SECTIONS_INCLUDE }),
    getAllStudents(schoolId),
  ]);
  return rows.map((row) => decorateClass(row, students)).sort(byClassOrder);
}

export async function getClassById(id) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.class.findFirst({ where: { id, schoolId }, include: CLASS_WITH_SECTIONS_INCLUDE });
  if (!row) return null;
  const students = await getAllStudents(schoolId);
  return decorateClass(row, students);
}

export async function getSectionDetail(classId, sectionId) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  const section = await prisma.section.findFirst({
    where: { id: sectionId, classId },
    include: { classTeacher: true },
  });
  if (!cls || !section) return null;

  const students = await getAllStudents(schoolId);
  const sectionStudents = students.filter(
    (student) =>
      student.class === cls.name && student.section === section.name && student.academicSession === cls.academicSession
  );
  const studentPreview = sectionStudents.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    initials: student.initials,
    admissionId: student.admissionId,
    parentContact: student.guardian?.phone || '—',
    status: student.status,
  }));

  return {
    class: { id: cls.id, name: cls.name, academicSession: cls.academicSession },
    section: decorateSection(section, countGender(sectionStudents)),
    studentPreview,
  };
}

export async function addClass(data) {
  const schoolId = await resolveSchoolId();
  const name = classNameForLevel(data.level);
  await assertValidSubjects(schoolId, data.subjects);
  try {
    const row = await prisma.class.create({
      data: {
        schoolId,
        name,
        level: data.level,
        academicSession: data.academicSession,
        status: data.status || 'Active',
        subjects: data.subjects || [],
      },
      include: CLASS_WITH_SECTIONS_INCLUDE,
    });
    // Brand new class — it can't have any students yet (Student.class is a
    // plain string, never backfilled from an existing roster on create).
    return decorateClass(row, []);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`${name} already exists for this academic session.`);
    }
    throw err;
  }
}

export async function updateClass(id, data) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!existing) return null;

  const name = classNameForLevel(data.level);
  await assertValidSubjects(schoolId, data.subjects);
  try {
    const row = await prisma.class.update({
      where: { id },
      data: { name, level: data.level, status: data.status || 'Active', subjects: data.subjects || [] },
      include: CLASS_WITH_SECTIONS_INCLUDE,
    });
    const students = await getAllStudents(schoolId);
    return decorateClass(row, students);
  } catch (err) {
    if (err.code === 'P2025') return null;
    if (err.code === 'P2002') {
      throw new Error(`${name} already exists for this academic session.`);
    }
    throw err;
  }
}

export async function updateClassStatus(id, status) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  try {
    const row = await prisma.class.update({ where: { id }, data: { status }, include: CLASS_WITH_SECTIONS_INCLUDE });
    const students = await getAllStudents(schoolId);
    return decorateClass(row, students);
  } catch {
    return null;
  }
}

// Permanently removes a class and all of its sections (Section.classId has
// onDelete: Cascade — see prisma/schema.prisma). Students are never FK'd to
// Class (Student.class is a plain string, same convention as
// Student.academicSession), so deleting a class never touches student rows —
// they just keep whatever `class` string they already had, same as if a
// class were renamed elsewhere in this app.
export async function deleteClass(id) {
  const existing = await prisma.class.findFirst({ where: { id, schoolId: await resolveSchoolId() } });
  if (!existing) return null;
  await prisma.class.delete({ where: { id } });
  return decorateClass({ ...existing, sections: [] }, []);
}

export async function addSection(classId, data) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) throw new Error('Class not found.');

  try {
    const row = await prisma.section.create({
      data: {
        schoolId: cls.schoolId,
        classId,
        name: data.name,
        academicSession: cls.academicSession,
        classTeacherId: data.classTeacherId || null,
        room: data.room || '',
        capacity: Number(data.capacity) || 0,
        status: data.status || 'Active',
      },
      include: { classTeacher: true },
    });
    // A newly created section can already have matching students if it's
    // re-creating one that previously existed with the same name — counts
    // straight from the Student table, not assumed to be 0.
    const counts = await countStudentsForClassSection(schoolId, cls.name, row.name, cls.academicSession);
    return decorateSection(row, counts);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`Section ${data.name} already exists in ${cls.name} for this academic session.`);
    }
    throw err;
  }
}

export async function updateSection(classId, sectionId, data) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) return null;
  const existing = await prisma.section.findFirst({ where: { id: sectionId, classId } });
  if (!existing) return null;

  const newClassTeacherId = data.classTeacherId || null;

  try {
    const row = await prisma.section.update({
      where: { id: sectionId },
      data: {
        name: data.name,
        classTeacherId: newClassTeacherId,
        room: data.room || '',
        capacity: Number(data.capacity) || 0,
        status: data.status || 'Active',
      },
      include: { classTeacher: true },
    });

    // This form can also change classTeacherId directly (not just via
    // "Assign Class Teacher") — keep Teacher.assignments in sync here too,
    // same as assignSectionTeacher.
    if (existing.classTeacherId && existing.classTeacherId !== newClassTeacherId) {
      await syncAssignmentRemoved(existing.classTeacherId, schoolId, cls.name, existing.name, existing.academicSession);
    }
    if (newClassTeacherId && newClassTeacherId !== existing.classTeacherId) {
      await syncAssignmentAdded(newClassTeacherId, schoolId, cls.name, row.name, existing.academicSession);
    }

    const counts = await countStudentsForClassSection(schoolId, cls.name, row.name, cls.academicSession);
    return decorateSection(row, counts);
  } catch (err) {
    if (err.code === 'P2025') return null;
    if (err.code === 'P2002') {
      throw new Error(`Section ${data.name} already exists in ${cls.name} for this academic session.`);
    }
    throw err;
  }
}

export async function updateSectionStatus(classId, sectionId, status) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) return null;
  try {
    const row = await prisma.section.update({ where: { id: sectionId }, data: { status }, include: { classTeacher: true } });
    const counts = await countStudentsForClassSection(schoolId, cls.name, row.name, cls.academicSession);
    return decorateSection(row, counts);
  } catch {
    return null;
  }
}

// Keeps Teacher.assignments (a completely separate list — see
// lib/teachers.js's assignClassToTeacher/removeAssignmentFromTeacher) in
// sync with the class-teacher badge set here, so a teacher assigned as a
// class's homeroom teacher shows up on their own profile and in
// `assignedClasses` after their login without also having to be assigned
// again through the Teachers module. Best-effort: any failure here (e.g. a
// duplicate assignment that already exists) must never fail the class-
// teacher assignment itself, which already succeeded by the time these run.
async function syncAssignmentAdded(teacherId, schoolId, className, sectionName, academicSession) {
  try {
    await assignClassToTeacher(teacherId, { academicSession, class: className, section: sectionName }, schoolId);
  } catch {
    // Already assigned — that just means the sync is already in place.
  }
}

async function syncAssignmentRemoved(teacherId, schoolId, className, sectionName, academicSession) {
  const teacher = await getTeacherById(teacherId, schoolId);
  if (!teacher) return;
  const match = teacher.assignments.find(
    (a) => a.academicSession === academicSession && a.class === className && a.section === sectionName
  );
  if (match) await removeAssignmentFromTeacher(teacherId, match.id, schoolId);
}

// A teacher can be the class teacher of only one section per academic
// session — without this, the same teacher could end up "the" class teacher
// for two different sections at once, which doesn't make sense for a
// single-person role like this. Excludes this section itself (a no-op
// re-save) and any section the teacher is being *removed* from
// (`classTeacherId` falsy skips the check entirely). This stays an
// application-level check even with a real `classTeacherId` foreign key now
// (see prisma/schema.prisma's Section model) — Postgres/Prisma has no
// native partial-unique-index support for "unique only when non-null".
export async function assignSectionTeacher(classId, sectionId, classTeacherId) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) return null;
  const section = await prisma.section.findFirst({ where: { id: sectionId, classId } });
  if (!section) return null;

  const previousTeacherId = section.classTeacherId;

  if (classTeacherId) {
    const alreadyAssigned = await prisma.section.findFirst({
      where: {
        id: { not: sectionId },
        academicSession: section.academicSession,
        classTeacherId,
        status: 'Active',
      },
      include: { class: true, classTeacher: true },
    });
    if (alreadyAssigned) {
      const teacherName = alreadyAssigned.classTeacher
        ? `${alreadyAssigned.classTeacher.firstName} ${alreadyAssigned.classTeacher.lastName}`
        : 'This teacher';
      throw new Error(
        `${teacherName} is already the class teacher of ${alreadyAssigned.class?.name || 'another class'} - Section ${alreadyAssigned.name}.`
      );
    }
  }

  const row = await prisma.section.update({
    where: { id: sectionId },
    data: { classTeacherId: classTeacherId || null },
    include: { classTeacher: true },
  });

  if (previousTeacherId && previousTeacherId !== classTeacherId) {
    await syncAssignmentRemoved(previousTeacherId, schoolId, cls.name, section.name, section.academicSession);
  }
  if (classTeacherId && classTeacherId !== previousTeacherId) {
    await syncAssignmentAdded(classTeacherId, schoolId, cls.name, section.name, section.academicSession);
  }

  const counts = await countStudentsForClassSection(schoolId, cls.name, row.name, cls.academicSession);
  return decorateSection(row, counts);
}

// A class with zero admin-created sections (e.g. Nursery/Playway) still has
// exactly one class teacher, it just can't live on a Section the admin never
// creates. Transparently uses
// (or creates, on first assignment) a single hidden Section row with an
// empty `name` to hold that `classTeacherId` — the same field/uniqueness
// rule assignSectionTeacher already enforces, just never surfaced as a
// "Section" in the UI for these classes (see ClassTeacherCard.jsx).
export async function assignClassTeacher(classId, classTeacherId) {
  const schoolId = await resolveSchoolId();
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
  if (!cls) return null;

  let section = await prisma.section.findFirst({ where: { classId, academicSession: cls.academicSession } });
  if (!section) {
    section = await prisma.section.create({
      data: {
        schoolId,
        classId,
        name: '',
        academicSession: cls.academicSession,
        room: '',
        capacity: 0,
        status: 'Active',
      },
    });
  }

  return assignSectionTeacher(classId, section.id, classTeacherId);
}
