import { HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';

// A one-off, more spacious empty state (outlined icon + decorative corner
// dots, no filled icon badge) for the very first thing a user sees on Daily
// Attendance — matches a reference screenshot the user supplied. The other
// Daily Attendance empty states ("No students in this section", "Attendance
// Marking Locked") intentionally keep the plain AttendanceEmptyState look;
// this isn't a new shared variant, just this one screen's specific design.
export default function SelectClassSectionState() {
  return (
    <div className="p-16 text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <span className="absolute top-0.5 left-2 w-1.5 h-1.5 rounded-full bg-violet-200" />
        <span className="absolute top-3 right-0 w-1.5 h-1.5 rounded-full bg-violet-200" />
        <span className="absolute bottom-2 left-0 w-1.5 h-1.5 rounded-full bg-violet-200" />
        <span className="absolute bottom-0 right-3 w-1.5 h-1.5 rounded-full bg-violet-200" />
        <HiOutlineClipboardDocumentCheck className="w-14 h-14 text-violet-400" strokeWidth={1.2} />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Select a class and section</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
        Choose a class and section above to view and mark student attendance.
      </p>
    </div>
  );
}
