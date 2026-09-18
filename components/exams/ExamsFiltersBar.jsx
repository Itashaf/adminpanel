'use client';

import { FiCalendar, FiLayers, FiFlag, FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { EXAM_STATUSES } from '@/lib/examConstants';

const EXAM_STATUS_OPTIONS = EXAM_STATUSES.map((s) => ({ value: s, label: s }));

export default function ExamsFiltersBar({
  sessionOptions,
  selectedSession,
  onSessionChange,
  classOptions,
  selectedClass,
  onClassChange,
  selectedStatus,
  onStatusChange,
  typeOptions,
  selectedType,
  onTypeChange,
  search,
  onSearchChange,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Session</label>
        <Dropdown
          placeholder="All Sessions"
          icon={<FiCalendar className="w-4 h-4" />}
          options={sessionOptions}
          value={selectedSession}
          onChange={onSessionChange}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
        <Dropdown
          placeholder="All Classes"
          icon={<FiLayers className="w-4 h-4" />}
          options={classOptions}
          value={selectedClass}
          onChange={onClassChange}
          searchable
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
        <Dropdown
          placeholder="All Statuses"
          icon={<FiFlag className="w-4 h-4" />}
          options={EXAM_STATUS_OPTIONS}
          value={selectedStatus}
          onChange={onStatusChange}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Exam Type</label>
        <Dropdown placeholder="All Types" options={typeOptions} value={selectedType} onChange={onTypeChange} searchable />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5 sm:invisible">Search</label>
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search exams..."
            autoComplete="off"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
