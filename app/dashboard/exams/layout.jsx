// Exam creation/verification/results-publishing stays Admin-only (each of
// those pages guards itself individually with blockIfTeacher — see
// app/dashboard/exams/page.jsx, list/page.jsx, [id]/verify/page.jsx,
// [id]/results/page.jsx). This layout itself no longer blocks every
// Teacher: app/dashboard/exams/[id]/page.jsx is now shared — a Class
// Teacher can open it (for one of their own classes' exams only, enforced
// there) to add their class's subjects to the date sheet, the same action
// an admin takes on that same page.
export default function ExamsLayout({ children }) {
  return children;
}
