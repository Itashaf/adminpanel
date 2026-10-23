'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronDown } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import { switchActiveChildAction } from '@/app/actions/auth';

// Active-child card on the Parent dashboard. With more than one child linked
// to the account it doubles as the switcher (same switchActiveChildAction the
// topbar dropdown uses); with one child it is just a static card.
export default function ParentChildCard({ student, students = [], activeStudentId }) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const others = students.filter((s) => s.id !== activeStudentId);

  const handleSwitch = async (studentId) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchActiveChildAction(studentId);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const body = (
    <span className="flex items-center gap-3 text-left">
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-indigo-600 text-white text-sm font-semibold shrink-0">
        {student.initials}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-gray-900 leading-tight truncate">
          {student.firstName} {student.lastName}
        </span>
        <span className="block text-sm text-gray-500 leading-tight mt-0.5">
          {student.class}
          {student.section ? ` - ${student.section}` : ''}
          <span className="mx-2 text-gray-300">|</span>
          Admission No. {student.admissionId}
        </span>
      </span>
      {others.length > 0 && <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-3" />}
    </span>
  );

  const cardClass = 'bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3';

  if (others.length === 0) return <div className={cardClass}>{body}</div>;

  return (
    <div className={cardClass}>
      <DropdownMenu
        trigger={body}
        items={others.map((s) => ({
          label: `Switch to ${s.name}${s.class ? ` (${s.class}${s.section ? ` - ${s.section}` : ''})` : ''}`,
          onClick: () => handleSwitch(s.id),
        }))}
      />
    </div>
  );
}
