'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare, FiUser, FiSave, FiSearch, FiUsers } from 'react-icons/fi';
import DatePicker from '@/components/DatePicker';
import Dropdown from '@/components/Dropdown';
import Pagination from '@/components/Pagination';
import Toast from '@/components/Toast';
import { STATUS_META, STATUS_ORDER } from '@/components/attendance/statusStyles';
import { getStaffAttendance, saveStaffAttendance } from '@/lib/api';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Decorative-only sparkline (no historical series exists to chart honestly)
// — same convention as components/dashboard/StatCard.jsx's own, just with
// its own accent colors since that component's ACCENTS map only has
// blue/violet.
function Sparkline({ colorClass }) {
  const heights = [30, 45, 35, 55, 40, 65, 50, 75, 60, 85];
  return (
    <div className="hidden sm:flex items-end gap-1 h-8 shrink-0">
      {heights.map((h, i) => (
        <span key={i} className={`w-1 rounded-full ${colorClass}`} style={{ height: `${h}%`, opacity: 0.25 + (i / heights.length) * 0.55 }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, pct, icon, iconBg, barColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>{icon}</span>
        <Sparkline colorClass={barColor} />
      </div>
      <p className="text-sm font-medium text-gray-500 mt-3">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {pct !== undefined && <p className="text-xs text-gray-400 mt-1">{pct}% of staff</p>}
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function RemarkCell({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (isEditing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onSave(draft);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') {
            setDraft(value);
            setIsEditing(false);
          }
        }}
        placeholder="Add remark..."
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-sm text-gray-500 hover:text-indigo-600 cursor-pointer truncate max-w-[140px] text-left"
    >
      {value || '-'}
    </button>
  );
}

function TeacherTableRow({ teacher, serialNumber, status, remark, onStatusChange, onRemarkChange }) {
  const statusMeta = STATUS_META[status] || STATUS_META.Present;

  return (
    <tr className="hover:bg-gray-50/60 transition">
      <td className="py-3 pl-6 pr-4 text-gray-400">{serialNumber}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
            {teacher.photoUrl ? (
              <img src={teacher.photoUrl} alt={teacher.name} className="w-full h-full object-cover" />
            ) : (
              <FiUser className="w-3.5 h-3.5" />
            )}
          </span>
          <p className="text-sm font-medium text-gray-900 truncate">{teacher.name}</p>
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-500">{teacher.employeeId}</td>
      <td className="py-3 pr-4 text-sm text-gray-500">{teacher.subject}</td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusMeta.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </td>
      <td className="py-3 pr-4">
        <RemarkCell value={remark} onSave={(v) => onRemarkChange(teacher.teacherId, v)} />
      </td>
      <td className="py-3 pr-6">
        <div className="flex items-center justify-end gap-1.5">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const isActive = status === s;
            return (
              <button
                key={s}
                type="button"
                title={meta.label}
                onClick={() => onStatusChange(teacher.teacherId, s)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  isActive ? meta.active : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {meta.shortLabel}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

export default function StaffAttendanceBoard({ initialDate, initialData }) {
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState(initialData);
  const [records, setRecords] = useState(() =>
    Object.fromEntries(initialData.roster.map((t) => [t.teacherId, { status: t.status, remark: t.remark || '' }]))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  const isFirstRun = useRef(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getStaffAttendance(date)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setRecords(Object.fromEntries(result.roster.map((t) => [t.teacherId, { status: t.status, remark: t.remark || '' }])));
        setPage(1);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const subjectOptions = useMemo(() => {
    const subjects = [...new Set(data.roster.map((t) => t.subject).filter(Boolean))];
    return [{ value: '', label: 'All Subjects' }, ...subjects.map((s) => ({ value: s, label: s }))];
  }, [data.roster]);

  const statusOptions = [{ value: '', label: 'All Status' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))];

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.roster.filter((t) => {
      const status = records[t.teacherId]?.status;
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.employeeId.toLowerCase().includes(query) ||
        t.subject?.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || status === statusFilter;
      const matchesSubject = !subjectFilter || t.subject === subjectFilter;
      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [data.roster, records, search, statusFilter, subjectFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));
  const pagedRoster = filteredRoster.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusChange = (teacherId, status) => {
    setRecords((prev) => ({ ...prev, [teacherId]: { ...prev[teacherId], status } }));
  };

  const handleRemarkChange = (teacherId, remark) => {
    setRecords((prev) => ({ ...prev, [teacherId]: { ...prev[teacherId], remark } }));
  };

  const handleMarkAllPresent = () => {
    setRecords((prev) => Object.fromEntries(Object.entries(prev).map(([id, r]) => [id, { ...r, status: 'Present' }])));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const payload = data.roster.map((t) => ({
        teacherId: t.teacherId,
        status: records[t.teacherId]?.status || 'Present',
        remark: records[t.teacherId]?.remark || '',
      }));
      const result = await saveStaffAttendance(date, payload);
      setData((prev) => ({ ...prev, isMarked: true, markedBy: result.markedBy, markedAt: result.markedAt }));
      setToastMessage('Staff attendance saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const total = data.roster.length;
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = Object.values(records).filter((r) => r.status === s).length;
    return acc;
  }, {});
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Mark daily attendance for every teacher. Keep track and manage staff presence.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-44">
            <DatePicker value={date} onChange={setDate} />
          </div>
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer whitespace-nowrap"
          >
            <FiCheckSquare className="w-4 h-4" />
            Mark All Present
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Present"
          value={counts.Present || 0}
          pct={pct(counts.Present || 0)}
          icon={<FiUsers className="w-5 h-5" />}
          iconBg="bg-green-100 text-green-600"
          barColor="bg-green-400"
        />
        <StatCard
          label="Absent"
          value={counts.Absent || 0}
          pct={pct(counts.Absent || 0)}
          icon={<FiUser className="w-5 h-5" />}
          iconBg="bg-red-100 text-red-600"
          barColor="bg-red-400"
        />
        <StatCard
          label="On Leave"
          value={counts.Leave || 0}
          pct={pct(counts.Leave || 0)}
          icon={<FiUser className="w-5 h-5" />}
          iconBg="bg-blue-100 text-blue-600"
          barColor="bg-blue-400"
        />
        <StatCard
          label="Total Staff"
          value={total}
          icon={<FiUsers className="w-5 h-5" />}
          iconBg="bg-violet-100 text-violet-600"
          barColor="bg-violet-400"
        />
      </div>

      {data.isMarked && (
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-4 py-2 w-fit">
          <FiCheckSquare className="w-3.5 h-3.5" />
          Marked by {data.markedBy} on {formatDateTime(data.markedAt)}
        </div>
      )}

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            autoComplete="off"
            placeholder="Search by name, employee ID or subject..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-40">
          <Dropdown
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          />
        </div>
        <div className="w-44">
          <Dropdown
            options={subjectOptions}
            value={subjectFilter}
            onChange={(v) => {
              setSubjectFilter(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading...</div>
        ) : pagedRoster.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No teachers match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pl-6 pr-4">#</th>
                  <th className="py-3 pr-4">Teacher</th>
                  <th className="py-3 pr-4">Employee ID</th>
                  <th className="py-3 pr-4">Subject / Role</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Remarks</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRoster.map((teacher, index) => (
                  <TeacherTableRow
                    key={teacher.teacherId}
                    teacher={teacher}
                    serialNumber={(page - 1) * pageSize + index + 1}
                    status={records[teacher.teacherId]?.status}
                    remark={records[teacher.teacherId]?.remark}
                    onStatusChange={handleStatusChange}
                    onRemarkChange={handleRemarkChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredRoster.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalCount={filteredRoster.length}
          pageSize={pageSize}
          itemLabel="teachers"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {data.roster.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60"
          >
            <FiSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : data.isMarked ? 'Update Attendance' : 'Save Attendance'}
          </button>
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
