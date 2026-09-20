export async function getAttendanceRoster({ session, date, className, sectionName }) {
  const params = new URLSearchParams({ session, date, class: className, section: sectionName });
  const res = await fetch(`/api/attendance/roster?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load students. Please try again.');
  }
  return res.json();
}

export async function setAttendanceLock(id, unlocked) {
  const res = await fetch(`/api/attendance/${id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlocked }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update the lock');
  }
  return res.json();
}

export async function saveAttendance(data) {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save attendance');
  }
  return res.json();
}

export async function getStudentAttendance(studentId, month) {
  const res = await fetch(`/api/attendance/student/${studentId}?month=${month}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load attendance. Please try again.');
  }
  return res.json();
}

export async function getParentNotifications() {
  const res = await fetch('/api/parent/notifications');
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load notifications.');
  }
  return res.json();
}

export async function markParentNotificationRead(id) {
  const res = await fetch(`/api/parent/notifications/${id}/read`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to update notification.');
  }
  return res.json();
}

export async function markAllParentNotificationsRead() {
  const res = await fetch('/api/parent/notifications/read-all', { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to update notifications.');
  }
  return res.json();
}

// Shared by every photo-upload flow in the app (Student, Teacher — both the
// admin-driven and the self-service one — and Admin's own profile photo):
// compress to WebP in the browser (see lib/imageCompression.js — the file
// never passes through this Next.js server either way, so this is the only
// place compression can happen), presign against the given endpoint, then
// PUT the compressed bytes straight to R2.
async function uploadCompressedPhoto(file, presignEndpoint) {
  const { compressImageToWebp } = await import('./imageCompression');
  const compressed = await compressImageToWebp(file);

  const presignRes = await fetch(presignEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, fileSize: compressed.size }),
  });
  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to prepare photo upload');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': compressed.type },
    body: compressed,
  });
  if (!uploadRes.ok) {
    throw new Error('Failed to upload photo');
  }

  return publicUrl;
}

// Uploads a Student's photo straight to R2 (bypassing this server) — call
// before createStudent/updateStudent and pass its result's photoUrl through
// in the student payload.
export async function uploadStudentPhoto(file) {
  return uploadCompressedPhoto(file, '/api/students/photo-upload-url');
}

// Father/Mother Photo, Birth Certificate, SLC, Other Document, or Aadhaar —
// a PDF passes through uploadCompressedPhoto untouched (compression only
// ever applies to actual images), an image still gets resized/WebP'd.
export async function uploadStudentDocument(file) {
  return uploadCompressedPhoto(file, '/api/students/document-upload-url');
}

// 10th/12th/Graduation/Work Experience Certificate, or Aadhaar, for a
// Teacher record.
export async function uploadTeacherDocument(file) {
  return uploadCompressedPhoto(file, '/api/teachers/document-upload-url');
}

// The school's own branding logo (Settings → Branding) — a slightly larger
// max dimension than a profile photo, since a logo is often shown bigger
// (Topbar, print headers, report cards) and benefits from staying crisper.
export async function uploadSchoolLogo(file) {
  const { compressImageToWebp } = await import('./imageCompression');
  const compressed = await compressImageToWebp(file, { maxDimension: 1024, quality: 0.9 });

  const presignRes = await fetch('/api/school/logo-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, fileSize: compressed.size }),
  });
  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to prepare logo upload');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': compressed.type },
    body: compressed,
  });
  if (!uploadRes.ok) {
    throw new Error('Failed to upload logo');
  }

  return publicUrl;
}

// Admin adding/editing a Teacher record sets the teacher's photo this way —
// distinct from uploadTeacherSelfPhoto below, which is the teacher setting
// their own.
export async function uploadTeacherPhoto(file) {
  return uploadCompressedPhoto(file, '/api/teachers/photo-upload-url');
}

// The signed-in Teacher's own self-service photo upload (Profile page).
export async function uploadTeacherSelfPhoto(file) {
  return uploadCompressedPhoto(file, '/api/teacher/profile-photo-upload-url');
}

// The signed-in Admin's own self-service photo upload (Profile page).
export async function uploadAdminProfilePhoto(file) {
  return uploadCompressedPhoto(file, '/api/admin/profile-photo-upload-url');
}

// Self-service profile edit — name + photo only, for whichever role is
// actually signed in. Both PATCH endpoints return the same { name, photoUrl }
// shape.
export async function updateTeacherSelfProfile({ name, photoUrl }) {
  const res = await fetch('/api/teacher/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, photoUrl }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update profile');
  }
  return res.json();
}

export async function updateAdminSelfProfile({ name, photoUrl }) {
  const res = await fetch('/api/admin/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, photoUrl }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update profile');
  }
  return res.json();
}

// Real query-level pagination (see app/api/students/paged/route.js) — the
// Students table's fetch-a-page-at-a-time client, not the full-roster
// getAllStudents() the server-rendered page/mobile app still use elsewhere.
export async function getStudentsPage({ page, pageSize, search, class: classFilter, section, status }) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', pageSize);
  if (search) params.set('search', search);
  if (classFilter) params.set('class', classFilter);
  if (section) params.set('section', section);
  if (status) params.set('status', status);

  const res = await fetch(`/api/students/paged?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load students');
  }
  return res.json();
}

export async function createStudent(data) {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save student');
  }
  return res.json();
}

export async function updateStudent(id, data) {
  const res = await fetch(`/api/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update student');
  }
  return res.json();
}

export async function deleteStudent(id) {
  const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete student');
  }
  return res.json();
}

export async function bulkImportStudents(rows) {
  const res = await fetch('/api/students/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to import students');
  }
  return res.json();
}

// Real query-level pagination (see app/api/teachers/paged/route.js) — the
// Teachers table's fetch-a-page-at-a-time client.
export async function getTeachersPage({ page, pageSize, search, status, class: classFilter }) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('pageSize', pageSize);
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (classFilter) params.set('class', classFilter);

  const res = await fetch(`/api/teachers/paged?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load teachers');
  }
  return res.json();
}

export async function createTeacher(data) {
  const res = await fetch('/api/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save teacher');
  }
  return res.json();
}

export async function updateTeacher(id, data) {
  const res = await fetch(`/api/teachers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update teacher');
  }
  return res.json();
}

export async function resetTeacherPassword(id) {
  const res = await fetch(`/api/teachers/${id}/reset-password`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reset password');
  }
  return res.json();
}

export async function updateTeacherStatus(id, status) {
  const res = await fetch(`/api/teachers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update teacher status');
  }
  return res.json();
}

export async function assignClassToTeacher(id, data) {
  const res = await fetch(`/api/teachers/${id}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to assign class');
  }
  return res.json();
}

export async function removeTeacherAssignment(id, assignmentId) {
  const res = await fetch(`/api/teachers/${id}/assignments`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignmentId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to remove assignment');
  }
  return res.json();
}

export async function createClass(data) {
  const res = await fetch('/api/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create class');
  }
  return res.json();
}

export async function updateClass(id, data) {
  const res = await fetch(`/api/classes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update class');
  }
  return res.json();
}

export async function deleteClass(id) {
  const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete class');
  }
  return res.json();
}

export async function updateClassStatus(id, status) {
  const res = await fetch(`/api/classes/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update class status');
  }
  return res.json();
}

export async function createSection(classId, data) {
  const res = await fetch(`/api/classes/${classId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create section');
  }
  return res.json();
}

export async function updateSection(classId, sectionId, data) {
  const res = await fetch(`/api/classes/${classId}/sections/${sectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update section');
  }
  return res.json();
}

export async function assignSectionTeacher(classId, sectionId, classTeacherId) {
  const res = await fetch(`/api/classes/${classId}/sections/${sectionId}/teacher`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classTeacherId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to assign class teacher');
  }
  return res.json();
}

// For a section-less class (Nursery/Playway) — see ClassTeacherCard.jsx.
// The real, per-school class→sections map — see lib/hooks/useClassSections.js.
export async function getClassSectionsMap() {
  const res = await fetch('/api/classes/sections-map', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load class sections. Please try again.');
  }
  return res.json();
}

export async function assignClassTeacher(classId, classTeacherId) {
  const res = await fetch(`/api/classes/${classId}/teacher`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classTeacherId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to assign class teacher');
  }
  return res.json();
}

// The real, per-school master subject list — see lib/hooks/useSubjects.js.
export async function getSubjects() {
  const res = await fetch('/api/subjects', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load subjects. Please try again.');
  }
  return res.json();
}

export async function addSubject(data) {
  const res = await fetch('/api/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to add subject');
  }
  return res.json();
}

export async function updateSubject(id, data) {
  const res = await fetch(`/api/subjects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update subject');
  }
  return res.json();
}

export async function deleteSubject(id) {
  const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete subject');
  }
  return res.json();
}

export async function getTimeTable({ className, sectionName = '', academicSession }) {
  const params = new URLSearchParams({ className, sectionName, academicSession });
  const res = await fetch(`/api/timetable?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load time table. Please try again.');
  }
  return res.json();
}

export async function saveTimeTable({ className, sectionName = '', academicSession, schedule }) {
  const res = await fetch('/api/timetable', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ className, sectionName, academicSession, schedule }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save time table');
  }
  return res.json();
}

export async function listTimeTables(academicSession) {
  const params = new URLSearchParams({ academicSession });
  const res = await fetch(`/api/timetable/list?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load time tables. Please try again.');
  }
  return res.json();
}

export async function deleteTimeTable({ className, sectionName = '', academicSession }) {
  const params = new URLSearchParams({ className, sectionName, academicSession });
  const res = await fetch(`/api/timetable?${params.toString()}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete time table');
  }
  return res.json();
}

export async function updateSectionStatus(classId, sectionId, status) {
  const res = await fetch(`/api/classes/${classId}/sections/${sectionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update section status');
  }
  return res.json();
}

export async function createAcademicSession(data) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create academic session');
  }
  return res.json();
}

export async function updateAcademicSession(id, data) {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update academic session');
  }
  return res.json();
}

export async function setActiveAcademicSession(id) {
  const res = await fetch(`/api/sessions/${id}/activate`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to set active session');
  }
  return res.json();
}

export async function archiveAcademicSession(id) {
  const res = await fetch(`/api/sessions/${id}/archive`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to archive academic session');
  }
  return res.json();
}

export async function updateSchoolProfile(data) {
  const res = await fetch('/api/school/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update school profile');
  }
  return res.json();
}

export async function updateSchoolContact(data) {
  const res = await fetch('/api/school/contact', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update contact & address');
  }
  return res.json();
}

export async function updateSchoolBranding(data) {
  const res = await fetch('/api/school/branding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update branding');
  }
  return res.json();
}

export async function updateSchoolPreferences(data) {
  const res = await fetch('/api/school/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update system preferences');
  }
  return res.json();
}

export async function updateAttendanceSettings(data) {
  const res = await fetch('/api/school/attendance-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update attendance settings');
  }
  return res.json();
}

export async function searchSchools({ search = '', status = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ search, status, page: String(page), pageSize: String(pageSize) });
  const res = await fetch(`/api/schools?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load schools');
  }
  return res.json();
}

export async function getSchool(id) {
  const res = await fetch(`/api/schools/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load school');
  }
  return res.json();
}

export async function createSchool(data) {
  const res = await fetch('/api/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create school');
  }
  return res.json();
}

export async function updateSchoolDirectoryStatus(id, status) {
  const res = await fetch(`/api/schools/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update school status');
  }
  return res.json();
}

export async function manageSchool(id) {
  const res = await fetch(`/api/schools/${id}/manage`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to switch into this school');
  }
  return res.json();
}

export async function updateSchoolDirectory(id, data) {
  const res = await fetch(`/api/schools/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update school info');
  }
  return res.json();
}

export async function getAdmins() {
  const res = await fetch('/api/admins');
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load admins');
  }
  return res.json();
}

export async function getAdmin(id) {
  const res = await fetch(`/api/admins/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load admin');
  }
  return res.json();
}

export async function createSchoolAdmin(schoolId, data) {
  const res = await fetch(`/api/schools/${schoolId}/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create admin account');
  }
  return res.json();
}

export async function updateAdminPermissions(id, permissions) {
  const res = await fetch(`/api/admins/${id}/permissions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update permissions');
  }
  return res.json();
}

export async function updateAdminStatus(id, status) {
  const res = await fetch(`/api/admins/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update admin status');
  }
  return res.json();
}

export async function resetAdminPassword(id) {
  const res = await fetch(`/api/admins/${id}/reset-password`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reset password');
  }
  return res.json();
}

// Uploads a Notice's PDF attachment straight to R2 (bypassing this server) —
// call before createNotice/updateNotice and pass its result's attachmentUrl/
// attachmentName/attachmentSize through in the notice payload.
export async function uploadNoticeAttachment(file) {
  const presignRes = await fetch('/api/notices/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
  });
  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to prepare attachment upload');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error('Failed to upload attachment');
  }

  return { attachmentUrl: publicUrl, attachmentName: file.name, attachmentSize: file.size };
}

export async function createNotice(data) {
  const res = await fetch('/api/notices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create notice');
  }
  return res.json();
}

export async function updateNotice(id, data) {
  const res = await fetch(`/api/notices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update notice');
  }
  return res.json();
}

export async function deleteNotice(id) {
  const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete notice');
  }
  return res.json();
}

export async function createCalendarEvent(data) {
  const res = await fetch('/api/calendar-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create event');
  }
  return res.json();
}

export async function updateCalendarEvent(id, data) {
  const res = await fetch(`/api/calendar-events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update event');
  }
  return res.json();
}

export async function deleteCalendarEvent(id) {
  const res = await fetch(`/api/calendar-events/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete event');
  }
  return res.json();
}

export async function createHomework(data) {
  const res = await fetch('/api/homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to assign homework');
  }
  return res.json();
}

export async function updateHomework(id, data) {
  const res = await fetch(`/api/homework/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update homework');
  }
  return res.json();
}

export async function deleteHomework(id) {
  const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete homework');
  }
  return res.json();
}

export async function getFeeStructures({ session = '', className = '' } = {}) {
  const params = new URLSearchParams();
  if (session) params.set('session', session);
  if (className) params.set('class', className);
  const res = await fetch(`/api/fees/structures?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load fee structures. Please try again.');
  }
  return res.json();
}

export async function getFeeStructure(id) {
  const res = await fetch(`/api/fees/structures/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load fee structure. Please try again.');
  }
  return res.json();
}

export async function createFeeStructure(data) {
  const res = await fetch('/api/fees/structures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create fee structure');
  }
  return res.json();
}

export async function createFeeStructuresBulk(data) {
  const res = await fetch('/api/fees/structures/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create fee structures');
  }
  return res.json();
}

export async function updateFeeStructure(id, data) {
  const res = await fetch(`/api/fees/structures/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update fee structure');
  }
  return res.json();
}

export async function deleteFeeStructure(id) {
  const res = await fetch(`/api/fees/structures/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete fee structure');
  }
  return res.json();
}

export async function generateStudentFees(structureId, term) {
  const res = await fetch(`/api/fees/structures/${structureId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to generate student fees');
  }
  return res.json();
}

export async function getStudentFees(studentId, session = '') {
  const params = new URLSearchParams();
  if (session) params.set('session', session);
  const res = await fetch(`/api/fees/student/${studentId}?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load fees. Please try again.');
  }
  return res.json();
}

export async function collectManualPayment(studentFeeId, method, amount) {
  const res = await fetch('/api/fees/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentFeeId, method, amount }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to collect payment');
  }
  return res.json();
}

export async function applyFeeDiscount(studentFeeId, data) {
  const res = await fetch(`/api/fees/students/${studentFeeId}/discount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to apply discount');
  }
  return res.json();
}

export async function removeFeeDiscount(studentFeeId) {
  const res = await fetch(`/api/fees/students/${studentFeeId}/discount`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to remove discount');
  }
  return res.json();
}

export async function setStandingDiscount(studentId, data) {
  const res = await fetch(`/api/students/${studentId}/discount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to set standing discount');
  }
  return res.json();
}

export async function removeStandingDiscount(studentId) {
  const res = await fetch(`/api/students/${studentId}/discount`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to remove standing discount');
  }
  return res.json();
}

export async function applyStandingDiscountToPendingFees(studentId) {
  const res = await fetch(`/api/students/${studentId}/discount/apply-pending`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to apply discount to pending fees');
  }
  return res.json();
}

export async function getStudent(id) {
  const res = await fetch(`/api/students/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load student. Please try again.');
  }
  return res.json();
}

export async function getStudentFeeSummaries({
  session = '',
  className = '',
  section = '',
  status = '',
  search = '',
  sortBy = '',
  sortDir = 'desc',
  page = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (session) params.set('session', session);
  if (className) params.set('class', className);
  if (section) params.set('section', section);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (sortBy) {
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
  }
  // `no-store` — this is called right after Export/a fresh collection to get
  // the current numbers; a stale browser-cached response for the same query
  // string would silently show pre-collection amounts.
  const res = await fetch(`/api/fees/students/summary?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load student fees. Please try again.');
  }
  return res.json();
}

// Re-fetches the authoritative "Amount Collected"/"Pending Amount" totals —
// called right after a collection instead of patching those two numbers
// client-side from a delta, which drifts from the real DB total whenever the
// locally-cached "before" value it subtracts against is itself already
// stale (e.g. a fee structure created since this page loaded auto-generated
// new pending fees this page's local state doesn't know about yet).
export async function getStudentFeesStats() {
  const res = await fetch('/api/fees/students/stats', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load fee stats. Please try again.');
  }
  return res.json();
}

export async function bulkCollectFees(studentIds, method) {
  const res = await fetch('/api/fees/bulk-collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds, method }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to collect payments');
  }
  return res.json();
}

export async function getPaymentLedger(studentId) {
  const res = await fetch(`/api/fees/students/${studentId}/ledger`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load payment ledger. Please try again.');
  }
  return res.json();
}

export async function getPayments({ studentId = '', method = '', status = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (studentId) params.set('studentId', studentId);
  if (method) params.set('method', method);
  if (status) params.set('status', status);
  const res = await fetch(`/api/payments?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to load payments. Please try again.');
  }
  return res.json();
}

export async function createRazorpayOrder(studentFeeId) {
  const res = await fetch('/api/payments/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentFeeId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to start payment');
  }
  return res.json();
}

export async function verifyRazorpayPayment(data) {
  const res = await fetch('/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Payment verification failed');
  }
  return res.json();
}

export async function getStudentParentAccount(studentId) {
  const res = await fetch(`/api/students/${studentId}/portal-access`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load parent account');
  }
  return res.json();
}

export async function linkOrCreateParentAccount(studentId, data) {
  const res = await fetch(`/api/students/${studentId}/portal-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to set portal access');
  }
  return res.json();
}

export async function unlinkParentAccount(studentId) {
  const res = await fetch(`/api/students/${studentId}/portal-access`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to unlink parent account');
  }
  return res.json();
}

export async function resetParentAccountPassword(studentId) {
  const res = await fetch(`/api/students/${studentId}/portal-access/reset-password`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reset password');
  }
  return res.json();
}

// --- Exams ---

export async function getExams() {
  const res = await fetch('/api/exams', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load exams');
  }
  return res.json();
}

export async function getExamDashboardStats() {
  const res = await fetch('/api/exams/dashboard', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load exam dashboard');
  }
  return res.json();
}

export async function createExam(data) {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create exam');
  }
  return res.json();
}

export async function updateExam(id, data) {
  const res = await fetch(`/api/exams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update exam');
  }
  return res.json();
}

export async function deleteExam(id) {
  const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete exam');
  }
  return res.json();
}

export async function setExamStatus(id, status) {
  const res = await fetch(`/api/exams/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update exam status');
  }
  return res.json();
}

export async function duplicateExam(id) {
  const res = await fetch(`/api/exams/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to duplicate exam');
  }
  return res.json();
}

export async function getExamSchedules(examId) {
  const res = await fetch(`/api/exams/${examId}/schedules`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load exam schedule');
  }
  return res.json();
}

export async function addExamSchedule(examId, data) {
  const res = await fetch(`/api/exams/${examId}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to add subject schedule');
  }
  return res.json();
}

export async function updateExamSchedule(scheduleId, data) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update subject schedule');
  }
  return res.json();
}

export async function deleteExamSchedule(scheduleId) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete subject schedule');
  }
  return res.json();
}

export async function getExamProgress(examId) {
  const res = await fetch(`/api/exams/${examId}/progress`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load marks entry progress');
  }
  return res.json();
}

export async function getMarksSheet(scheduleId) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}/marks`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load marks sheet');
  }
  return res.json();
}

export async function saveExamMarks(scheduleId, rows, submit = false) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}/marks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, submit }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to save marks');
  }
  return res.json();
}

// Print Marksheet — exam-independent, just a class+section roster with
// whatever subject columns the admin/class-teacher chooses to add for
// hand-writing on paper. See app/api/print-marksheet/route.js.
export async function getPrintableClassSections() {
  const res = await fetch('/api/print-marksheet/classes', { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load classes');
  }
  return res.json();
}

export async function getPrintableRoster({ className, sectionName }) {
  const params = new URLSearchParams({ className, sectionName });
  const res = await fetch(`/api/print-marksheet?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load the class roster');
  }
  return res.json();
}

export async function getMarksForVerification(examId, { className, sectionName = '', subject }) {
  const params = new URLSearchParams({ className, sectionName, subject });
  const res = await fetch(`/api/exams/${examId}/verification?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load marks for verification');
  }
  return res.json();
}

export async function verifyExamMarks(scheduleId, action, reason = '', studentId = null) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason, studentId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update marks verification status');
  }
  return res.json();
}

export async function getExamResults(examId) {
  const res = await fetch(`/api/exams/${examId}/results`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load exam results');
  }
  return res.json();
}

// Admin-only: one student's full result with subject-wise marks, for the
// printable report card (see ExamResultsClient.jsx). Only ever returns
// something once that result is Published — same constraint the Parent
// portal's own view has.
export async function getStudentExamResult(examId, studentId) {
  const res = await fetch(`/api/exams/${examId}/results?studentId=${studentId}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load this student\'s result');
  }
  return res.json();
}

export async function getExamAuditLog(examId) {
  const res = await fetch(`/api/exams/${examId}/audit-log`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load exam audit log');
  }
  return res.json();
}

export async function getScheduleEnrollments(scheduleId) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}/enrollments`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load enrolled students');
  }
  return res.json();
}

export async function setScheduleEnrollments(scheduleId, studentIds) {
  const res = await fetch(`/api/exams/schedules/${scheduleId}/enrollments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update enrolled students');
  }
  return res.json();
}

export async function getEffectiveExamResult(examId, studentId) {
  const res = await fetch(`/api/exams/${examId}/results/effective?studentId=${studentId}`, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load effective result');
  }
  return res.json();
}

export async function generateExamResults(examId) {
  const res = await fetch(`/api/exams/${examId}/results`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to generate exam results');
  }
  return res.json();
}

export async function publishExamResults(examId) {
  const res = await fetch(`/api/exams/${examId}/results/publish`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to publish exam results');
  }
  return res.json();
}

export async function unpublishExamResults(examId) {
  const res = await fetch(`/api/exams/${examId}/results/publish`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to unpublish exam results');
  }
  return res.json();
}

// GET /api/leaves is role-branched server-side: a Teacher gets their own
// requests, an Admin gets every request in the school (optionally filtered).
export async function getLeaves(statusFilter = '') {
  const params = statusFilter ? `?status=${statusFilter}` : '';
  const res = await fetch(`/api/leaves${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to load leave requests');
  }
  return res.json();
}

export async function applyForLeaveRequest(data) {
  const res = await fetch('/api/leaves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to submit leave request');
  }
  return res.json();
}

export async function reviewLeave(id, status, reviewNote = '') {
  const res = await fetch(`/api/leaves/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewNote }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update the leave request');
  }
  return res.json();
}
