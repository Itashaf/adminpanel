'use client';

import { FiSearch, FiFlag, FiUsers, FiLayers, FiRotateCcw } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { NOTICE_PRIORITIES } from '@/lib/noticeConstants';

export default function NoticesFiltersBar({ filters, onFilterChange, onReset, classOptions }) {
  const handleChange = (key) => (value) => onFilterChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            autoComplete="off"
            placeholder="Search by title or message..."
            className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Audience"
            icon={<FiUsers className="w-4 h-4" />}
            value={filters.audience}
            onChange={handleChange('audience')}
            options={[
              { value: 'Whole School', label: 'Whole School' },
              { value: 'Class', label: 'Class' },
            ]}
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Class"
            icon={<FiLayers className="w-4 h-4" />}
            value={filters.className}
            onChange={handleChange('className')}
            options={classOptions}
            searchable
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Priority"
            icon={<FiFlag className="w-4 h-4" />}
            value={filters.priority}
            onChange={handleChange('priority')}
            options={[{ value: '', label: 'All Priority' }, ...NOTICE_PRIORITIES.map((p) => ({ value: p, label: p }))]}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition cursor-pointer shrink-0"
        >
          <FiRotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
