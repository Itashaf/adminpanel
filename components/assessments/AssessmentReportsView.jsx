'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiAward, FiTrendingUp, FiAlertTriangle, FiDownload, FiPrinter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { getSectionOptions } from '@/lib/hooks/useClassSections';
import { getClassAssessmentSummary } from '@/lib/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }));
const PAGE_SIZE = 20;

function yearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1].map((y) => ({ value: String(y), label: String(y) }));
}

const BAR_COLOR = {
  Excellent: 'bg-green-500',
  Good: 'bg-blue-500',
  Average: 'bg-amber-500',
  'Needs Improvement': 'bg-red-500',
};

function StatCard({ label, value, icon, iconBg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none print:rounded-lg">
      <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg} print:hidden`}>{icon}</span>
      <p className="text-sm font-medium text-gray-500 mt-3 print:mt-0">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function BarRow({ label, value, max, colorClass }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs text-gray-600 truncate">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function DistributionChart({ title, counts, colorMap = {} }) {
  const entries = Object.entries(counts);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none print:rounded-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {entries.every(([, v]) => v === 0) ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={max} colorClass={colorMap[label] || 'bg-indigo-500'} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssessmentReportsView({
  summary,
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
  const router = useRouter();
  const [className, setClassName] = useState(defaultClass);
  const [sectionName, setSectionName] = useState(defaultSection);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState(summary);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
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
        const result = await getClassAssessmentSummary({ className, sectionName, academicSession, month, year, page, pageSize: PAGE_SIZE });
        if (!cancelled) setData(result);
      } catch {
        // Filters just keep showing the previous report.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [className, sectionName, month, year, academicSession, page]);

  const handleClassChange = (value) => {
    setClassName(value);
    const nextSections = isTeacher
      ? [...new Set(teacherScope.filter((a) => a.class === value).map((a) => a.section))]
      : classSections[value] || [];
    setSectionName(nextSections[0] || '');
    setPage(1);
  };

  const handleSectionChange = (value) => {
    setSectionName(value);
    setPage(1);
  };

  const handleMonthChange = (value) => {
    setMonth(Number(value));
    setPage(1);
  };

  const handleYearChange = (value) => {
    setYear(Number(value));
    setPage(1);
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams({ class: className, section: sectionName, session: academicSession, month, year });
    window.location.href = `/api/assessments/summary/export?${params.toString()}`;
  };

  const { totals } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <button type="button" onClick={() => router.push('/dashboard/assessments')} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
            ← Back to Assessments
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Class Assessment Summary</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition"
          >
            <FiDownload className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 cursor-pointer transition"
          >
            <FiPrinter className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-gray-900">Class Assessment Summary</h1>
        <p className="text-sm text-gray-500">
          {className} - {sectionName} • {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 print:hidden">
        <div className="w-36">
          <Dropdown options={classOptions} value={className} onChange={handleClassChange} placeholder="Class" />
        </div>
        <div className="w-40">
          <Dropdown options={sectionOptions} value={sectionName} onChange={handleSectionChange} placeholder="Section" />
        </div>
        <div className="w-40">
          <Dropdown options={MONTH_OPTIONS} value={String(month)} onChange={handleMonthChange} />
        </div>
        <div className="w-28">
          <Dropdown options={yearOptions()} value={String(year)} onChange={handleYearChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading...</div>
      ) : !className || !sectionName ? (
        <div className="text-center py-16 text-sm text-gray-500">Select a class and section to view the report.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Students" value={totals.total} icon={<FiUsers className="w-5 h-5" />} iconBg="bg-indigo-100 text-indigo-600" />
            <StatCard label="Excellent" value={totals.excellent} icon={<FiAward className="w-5 h-5" />} iconBg="bg-green-100 text-green-600" />
            <StatCard label="Good" value={totals.good} icon={<FiTrendingUp className="w-5 h-5" />} iconBg="bg-blue-100 text-blue-600" />
            <StatCard label="Average" value={totals.average} icon={<FiTrendingUp className="w-5 h-5" />} iconBg="bg-amber-100 text-amber-600" />
            <StatCard
              label="Needs Attention"
              value={totals.needsAttention}
              icon={<FiAlertTriangle className="w-5 h-5" />}
              iconBg="bg-red-100 text-red-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DistributionChart title="Behaviour Distribution" counts={data.behaviourCounts} colorMap={BAR_COLOR} />
            <DistributionChart title="Academic Performance" counts={data.academicCounts} colorMap={BAR_COLOR} />
            <DistributionChart title="Activity Participation" counts={data.activityCounts} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:border print:shadow-none print:rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pl-6 pr-4">#</th>
                  <th className="py-3 pr-4">Student Name</th>
                  <th className="py-3 pr-4">Admission No</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Overall Performance</th>
                  <th className="py-3 pr-6">Parent Contacted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.perStudent.map((s, i) => (
                  <tr key={s.admissionId}>
                    <td className="py-2.5 pl-6 pr-4 text-gray-400">{(data.page - 1) * data.pageSize + i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.admissionId}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.status}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.overallPerformance || '—'}</td>
                    <td className="py-2.5 pr-6 text-gray-500">{s.parentContacted || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100 print:hidden">
                <p className="text-xs text-gray-500">
                  Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.page <= 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-600 min-w-[70px] text-center">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={data.page >= data.totalPages}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
