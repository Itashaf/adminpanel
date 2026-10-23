import { FiLayers, FiBookOpen } from 'react-icons/fi';

const SUBJECT_TINTS = [
  'bg-blue-50 text-blue-600',
  'bg-amber-50 text-amber-600',
  'bg-emerald-50 text-emerald-600',
  'bg-rose-50 text-rose-600',
  'bg-violet-50 text-violet-600',
];

function subjectCode(name) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-gray-100 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900">{value || '—'}</span>
    </div>
  );
}

function CardTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
    </div>
  );
}

// Phone-only Academic tab (the InfoCard version takes over from sm up): the
// current class/section with its class teacher, then the class's subjects.
export default function StudentAcademicMobile({ student, classInfo }) {
  const subjects = classInfo?.subjects || [];
  return (
    <div className="sm:hidden space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <CardTitle icon={FiLayers} title="Current Class & Section" />
        <div className="grid grid-cols-2 gap-4 pb-3 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Class</p>
            <p className="font-semibold text-gray-900">{student.class || '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Section</p>
            <p className="font-semibold text-gray-900">{student.section || '—'}</p>
          </div>
        </div>
        <Row label="Academic Session" value={student.academicSession} />
        <Row label="Class Teacher" value={classInfo?.classTeacher} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <CardTitle icon={FiBookOpen} title="Subjects" />
        {subjects.length === 0 ? (
          <p className="text-sm text-gray-400 border-t border-gray-100 pt-3">No subjects assigned to this class.</p>
        ) : (
          <ul>
            {subjects.map((name, i) => (
              <li key={name} className="flex items-center gap-3 py-2.5 border-t border-gray-100 first:border-t-0">
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold shrink-0 ${SUBJECT_TINTS[i % SUBJECT_TINTS.length]}`}>
                  {subjectCode(name)}
                </span>
                <span className="text-sm text-gray-900">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
