'use client';

import { FiLayers, FiGrid, FiBook, FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useSubjects } from '@/lib/hooks/useSubjects';

export default function HomeworkFiltersBar({
  classOptions,
  selectedClass,
  onClassChange,
  selectedSection,
  onSectionChange,
  selectedSubject,
  onSubjectChange,
  search,
  onSearchChange,
}) {
  const classSections = useClassSections();
  const subjectDropdownOptions = useSubjects().map((s) => ({ value: s, label: s }));
  const sectionOptions = selectedClass
    ? [{ value: '', label: 'All Sections' }, ...getSectionOptions(classSections, selectedClass)]
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
        <Dropdown
          placeholder="All Classes"
          icon={<FiLayers className="w-4 h-4" />}
          options={classOptions}
          value={selectedClass}
          onChange={(value) => {
            onClassChange(value);
            onSectionChange('');
          }}
          searchable
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
        <Dropdown
          placeholder={selectedClass ? 'All Sections' : 'Select a class first'}
          icon={<FiGrid className="w-4 h-4" />}
          options={sectionOptions}
          value={selectedSection}
          onChange={onSectionChange}
          disabled={!selectedClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Subject</label>
        <Dropdown
          placeholder="All Subjects"
          icon={<FiBook className="w-4 h-4" />}
          options={subjectDropdownOptions}
          value={selectedSubject}
          onChange={onSubjectChange}
          searchable
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5 sm:invisible">Search</label>
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search homework..."
            autoComplete="off"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
