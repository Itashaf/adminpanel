'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiSearch, FiUser, FiEye, FiEdit2, FiPlay } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { getSectionOptions } from '@/lib/hooks/useClassSections';
import { getClassAssessments } from '@/lib/api';
import { ASSESSMENT_STATUS_STYLES } from '@/lib/assessmentConstants';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }));

function yearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1].map((y) => ({ value: String(y), label: String(y) }));
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, icon, iconBg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>{icon}</span>
      </div>
      <p className="text-sm font-medium text-gray-500 mt-3">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AssessmentDashboard({
  initialData,
  classOptions,
  classSections,
  isTeacher,
  teacherScope,
  academicSession,
  defaultClass,
  defaultSection,
  defaultMonth,
  defaultYear,
}) {
  const [className, setClassName] = useState(defaultClass);
  const [sectionName, setSectionName] = useState(defaultSection);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const isFirstRun = useRef(true);

  const sectionOptions = isTeacher
    ? [...new Set(teacherScope.filter((a) => a.class === className).map((a) => a.section))].map((s) => ({
        value: s,
        label: `Section ${s}`,
      }))
    : getSectionOptions(classSections, className);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (!className || !sectionName) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await getClassAssessments({ className, sectionName, academicSession, month, year });
        if (!cancelled) setData(result);
      } catch {
        // Filters just keep showing the previous roster.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [className, sectionName, month, year, academicSession]);

  const handleClassChange = (value) => {
    setClassName(value);
    const nextSections = isTeacher
      ? [...new Set(teacherScope.filter((a) => a.class === value).map((a) => a.section))]
      : (classSections[value] || []);
    setSectionName(nextSections[0] || '');
  };

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.roster;
    return data.roster.filter((r) => r.name.toLowerCase().includes(query) || r.admissionId.toLowerCase().includes(query));
  }, [data.roster, search]);

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Assessments</h1>
        <p className="text-sm text-gray-500 mt-1">Complete a student&apos;s monthly assessment in a couple of minutes.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={<FiUsers className="w-5 h-5" />} iconBg="bg-indigo-100 text-indigo-600" />
        <StatCard label="Completed" value={stats.completed} icon={<FiCheckCircle className="w-5 h-5" />} iconBg="bg-green-100 text-green-600" />
        <StatCard label="Pending" value={stats.pending} icon={<FiClock className="w-5 h-5" />} iconBg="bg-amber-100 text-amber-600" />
        <StatCard
          label="Completion %"
          value={`${stats.completionPercent}%`}
          icon={<FiAlertCircle className="w-5 h-5" />}
          iconBg="bg-violet-100 text-violet-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Class progress</p>
          <p className="text-sm font-semibold text-gray-900">{stats.completionPercent}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full transition-all"
            style={{ width: `${stats.completionPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            placeholder="Search by name or admission no..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-36">
          <Dropdown options={classOptions} value={className} onChange={handleClassChange} placeholder="Class" />
        </div>
        <div className="w-40">
          <Dropdown options={sectionOptions} value={sectionName} onChange={setSectionName} placeholder="Section" />
        </div>
        <div className="w-40">
          <Dropdown options={MONTH_OPTIONS} value={String(month)} onChange={(v) => setMonth(Number(v))} />
        </div>
        <div className="w-28">
          <Dropdown options={yearOptions()} value={String(year)} onChange={(v) => setYear(Number(v))} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading...</div>
        ) : !className || !sectionName ? (
          <div className="text-center py-16 text-sm text-gray-500">Select a class and section to view assessments.</div>
        ) : filteredRoster.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pl-6 pr-4">Student Name</th>
                  <th className="py-3 pr-4">Admission No</th>
                  <th className="py-3 pr-4">Class</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Last Updated</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoster.map((r) => (
                  <tr key={r.studentId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 pl-6 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
                          {r.photoUrl ? (
                            <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiUser className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="font-medium text-gray-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{r.admissionId}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {className} - {sectionName}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ASSESSMENT_STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(r.updatedAt)}</td>
                    <td className="py-3 pr-6 text-right">
                      <Link
                        href={`/dashboard/assessments/${r.studentId}?month=${month}&year=${year}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        {r.status === 'Not Started' ? (
                          <>
                            <FiPlay className="w-3.5 h-3.5" />
                            Start
                          </>
                        ) : r.status === 'Completed' ? (
                          <>
                            <FiEye className="w-3.5 h-3.5" />
                            View
                          </>
                        ) : (
                          <>
                            <FiEdit2 className="w-3.5 h-3.5" />
                            Edit
                          </>
                        )}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
