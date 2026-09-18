'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLayers, FiGrid, FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Input from '@/components/Input';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

export default function ReportsFiltersBar({ classOptions, initialFilters }) {
  const router = useRouter();
  // No longer user-changeable here — the school-wide active academic session
  // (switched via the Topbar dropdown) is the single source of truth; this
  // report always reflects whichever session is currently active.
  const session = initialFilters.session;
  const [classFilter, setClassFilter] = useState(initialFilters.class);
  const [sectionFilter, setSectionFilter] = useState(initialFilters.section);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const classSections = useClassSections();

  const sectionOptions = useMemo(() => {
    if (classFilter === 'All Classes') return [{ value: 'All Sections', label: 'All Sections' }];
    return [{ value: 'All Sections', label: 'All Sections' }, ...getSectionOptions(classSections, classFilter)];
  }, [classFilter, classSections]);

  const handleApply = () => {
    const params = new URLSearchParams({ session, class: classFilter, section: sectionFilter, from, to });
    if (search.trim()) params.set('search', search.trim());
    router.push(`/dashboard/attendance/reports?${params.toString()}`);
  };

  const handleReset = () => {
    setClassFilter('All Classes');
    setSectionFilter('All Sections');
    setSearch('');
    setFrom(initialFilters.from);
    setTo(initialFilters.to);
    router.push('/dashboard/attendance/reports');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
          <Dropdown
            icon={<FiLayers className="w-4 h-4" />}
            options={classOptions}
            value={classFilter}
            onChange={(value) => {
              setClassFilter(value);
              setSectionFilter('All Sections');
            }}
            searchable
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
          <Dropdown icon={<FiGrid className="w-4 h-4" />} options={sectionOptions} value={sectionFilter} onChange={setSectionFilter} />
        </div>

        <div className="flex-1 min-w-[170px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
          <Input
            placeholder="Search student..."
            icon={<FiSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">From Date</label>
          <DatePicker value={from} onChange={setFrom} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">To Date</label>
          <DatePicker value={to} onChange={setTo} />
        </div>

        <div className="flex items-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer whitespace-nowrap"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer whitespace-nowrap py-2.5"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
