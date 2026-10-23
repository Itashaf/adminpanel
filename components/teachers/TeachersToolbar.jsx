'use client';

import { useState } from 'react';
import { FiSearch, FiFilter, FiRotateCcw, FiCheckSquare, FiLayers } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { TEACHER_STATUSES } from '@/lib/teacherConstants';

export default function TeachersToolbar({ filters, onFilterChange, onReset, classOptions }) {
  // Phone only: the two dropdowns + Reset sit behind a filter toggle next to the
  // search box; from sm up they're always shown inline (`sm:contents`).
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = [filters.status, filters.class].filter(Boolean).length;
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
            placeholder="Search by teacher name, employee ID, phone or email"
            className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filters"
          aria-expanded={showFilters}
          className={`sm:hidden relative flex items-center justify-center w-11 h-11 rounded-full border transition cursor-pointer shrink-0 ${
            showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-600'
          }`}
        >
          <FiFilter className="w-4 h-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>

        <div className={`${showFilters ? 'flex' : 'hidden'} sm:contents flex-col gap-3 w-full`}>
        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Status"
            icon={<FiCheckSquare className="w-4 h-4" />}
            value={filters.status}
            onChange={handleDropdownChange('status')}
            options={TEACHER_STATUSES.map((status) => ({ value: status, label: status }))}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <Dropdown
            placeholder="Assigned Class"
            icon={<FiLayers className="w-4 h-4" />}
            value={filters.class}
            onChange={handleDropdownChange('class')}
            options={classOptions}
          />
        </div>
        <button
          type="button"
          className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
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
    </div>
  );
}
