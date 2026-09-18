// The Add Student / Bulk Import buttons live in StudentsExplorer instead of
// here — Bulk Import's success handler needs to push newly imported
// students straight into StudentsExplorer's local list (see SKILL.md's
// optimistic-update rule), and that state only exists there, not in this
// plain server-rendered title block.
export default function StudentsHeader({ canManage = true }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Students</h1>
      <p className="text-sm text-gray-500 mt-1">
        {canManage ? 'Manage and organize all students enrolled in your school.' : 'Students in your assigned classes.'}
      </p>
    </div>
  );
}
