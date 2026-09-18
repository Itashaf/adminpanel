'use client';

import { FiLayers, FiGrid, FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Input from '@/components/Input';

export default function AttendanceFiltersBar({
  date,
  onDateChange,
  classOptions,
  selectedClass,
  onClassChange,
  sectionOptions,
  selectedSection,
  onSectionChange,
  search,
  onSearchChange,
  searchDisabled,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
          <DatePicker value={date} onChange={onDateChange} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
          <Dropdown
            placeholder="Select class"
            icon={<FiLayers className="w-4 h-4" />}
            options={classOptions}
            value={selectedClass}
            onChange={onClassChange}
            searchable
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
          <Dropdown
            placeholder={
              !selectedClass ? 'Select a class first' : sectionOptions.length === 0 ? 'No sections for this class' : 'Select section'
            }
            icon={<FiGrid className="w-4 h-4" />}
            options={sectionOptions}
            value={selectedSection}
            onChange={onSectionChange}
            disabled={!selectedClass || sectionOptions.length === 0}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Search Student</label>
          <Input
            placeholder="Search by name or admission ID"
            icon={<FiSearch />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={searchDisabled}
          />
        </div>
      </div>
    </div>
  );
}
