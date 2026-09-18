'use client';

import { FiSearch, FiFilter, FiRotateCcw, FiLayers, FiGrid, FiCheckSquare } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { STATUSES } from '@/lib/students';

export default function StudentsToolbar({ filters, onFilterChange, onReset, classOptions, sectionOptions }) {
  const handleSearchChange = (e) => onFilterChange({ ...filters, search: e.target.value });
  const handleDropdownChange = (key) => (value) => onFilterChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            autoComplete="off"
            placeholder="Search by student name, admission ID, or parent phone..."
            className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Class"
            icon={<FiLayers className="w-4 h-4" />}
            value={filters.class}
            onChange={handleDropdownChange('class')}
            options={classOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Section"
            icon={<FiGrid className="w-4 h-4" />}
            value={filters.section}
            onChange={handleDropdownChange('section')}
            options={sectionOptions}
            disabled={!filters.class}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Status"
            icon={<FiCheckSquare className="w-4 h-4" />}
            value={filters.status}
            onChange={handleDropdownChange('status')}
            options={STATUSES.map((status) => ({ value: status, label: status }))}
          />
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
        >
          <FiFilter className="w-4 h-4" />
          Filter
        </button>
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
