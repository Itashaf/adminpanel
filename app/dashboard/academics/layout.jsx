// No blanket blockIfTeacher here — this layout covers Subjects (Admin-only,
// blocked at app/dashboard/academics/subjects/page.jsx itself), Timetable
// and Calendar, and a Teacher now has real, page-scoped access to the
// latter two (view for Timetable, edit only their own class; read-only
// view for Calendar). Blocking here would 307 a Teacher away from both
// before either page's own logic ever runs.
export default function AcademicsLayout({ children }) {
  return children;
}
