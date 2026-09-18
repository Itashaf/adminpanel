'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiDownload } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import DropdownMenu from '@/components/DropdownMenu';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
];

function percentClassName(percent) {
  if (percent >= 90) return 'bg-green-50 text-green-700';
  if (percent >= 85) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function exportCsv(rows) {
  const header = ['Admission No', 'Student Name', 'Class', 'Section', 'Total Days', 'Present', 'Absent', 'Leave', 'Attendance %'];
  const lines = rows.map((r) =>
    [r.admissionId, r.name, r.className, r.section, r.total, r.Present, r.Absent, r.Leave, r.percent].join(',')
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'attendance-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function StudentAttendanceReportTable({ rows }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  const startIndex = (page - 1) * pageSize;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-5 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Student Attendance</h3>
          <p className="text-sm text-gray-500 mt-0.5">Showing attendance summary for the selected date range.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            label="Export"
            variant="secondary"
            size="sm"
            icon={<FiDownload className="w-3.5 h-3.5" />}
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
            fullWidth={false}
          />
          <div className="w-32">
            <Dropdown
              options={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-16">No attendance data for the selected filters.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-4 pl-6 pr-2 w-10">#</th>
                  <th className="py-4 pr-4">Admission No.</th>
                  <th className="py-4 pr-4">Student Name</th>
                  <th className="py-4 pr-4">Class</th>
                  <th className="py-4 pr-4">Section</th>
                  <th className="py-4 pr-4">Total Days</th>
                  <th className="py-4 pr-4">Present</th>
                  <th className="py-4 pr-4">Absent</th>
                  <th className="py-4 pr-4">Leave</th>
                  <th className="py-4 pr-4">Attendance %</th>
                  <th className="py-4 pr-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((row, index) => (
                  <tr key={row.studentId} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 pl-6 pr-2 text-gray-400">{startIndex + index + 1}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.admissionId}</td>
                    <td className="py-4 pr-4 font-medium text-gray-900">{row.name}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.className.replace('Class ', '')}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.section || '—'}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.total}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.Present}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.Absent}</td>
                    <td className="py-4 pr-4 text-gray-700">{row.Leave}</td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${percentClassName(row.percent)}`}>
                        {row.percent}%
                      </span>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          label="View"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/students/${row.studentId}?tab=attendance`)}
                          fullWidth={false}
                        />
                        <DropdownMenu
                          trigger={<span className="text-gray-400 px-1 cursor-pointer">⋮</span>}
                          items={[
                            { label: 'View Full Profile', onClick: () => router.push(`/dashboard/students/${row.studentId}`) },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {pagedRows.map((row) => (
              <div key={row.studentId} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{row.name}</p>
                    <p className="text-xs text-gray-400">
                      {row.admissionId} · {row.classSection}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${percentClassName(row.percent)}`}>
                    {row.percent}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div>
                    <p className="text-gray-400">Present</p>
                    <p className="font-semibold text-gray-700">{row.Present}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Absent</p>
                    <p className="font-semibold text-gray-700">{row.Absent}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Leave</p>
                    <p className="font-semibold text-gray-700">{row.Leave}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button
                    label="View Attendance"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/students/${row.studentId}?tab=attendance`)}
                    fullWidth
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={rows.length} pageSize={pageSize} />
          </div>
        </>
      )}
    </div>
  );
}
