'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEdit2, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import { COLOR_STYLES, appliesToLabel } from '@/lib/calendarEventConstants';
import { deleteCalendarEvent } from '@/lib/api';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusFor(event) {
  const today = new Date().toISOString().slice(0, 10);
  const end = event.endDate || event.startDate;
  if (today < event.startDate) return { label: 'Upcoming', variant: 'blue' };
  if (today <= end) return { label: 'Today', variant: 'violet' };
  return { label: 'Completed', variant: 'gray' };
}

const COLUMNS = [
  { key: 'startDate', label: 'Date', sortable: true },
  { key: 'title', label: 'Event Name', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'appliesTo', label: 'Applies To', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
];

function SortIcon({ active, direction }) {
  if (!active) return null;
  return direction === 'asc' ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />;
}

function EventRowActions({ event, onEdit }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCalendarEvent(event.id);
      setShowConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit Event', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => onEdit(event) },
    { label: 'Delete Event', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <>
      <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete event?"
        description={`"${event.title}" will be permanently removed from the calendar.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}

export default function EventsTable({ events, onEdit, sortKey, sortDir, onSortChange }) {
  const handleSort = (key) => {
    if (sortKey === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {events.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-16">No events match your filters.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="py-4 pl-6 pr-4 first:pl-6">
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1 cursor-pointer hover:text-gray-700 transition"
                        >
                          {col.label}
                          <SortIcon active={sortKey === col.key} direction={sortDir} />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => {
                  const status = statusFor(event);
                  return (
                    <tr key={event.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-4 pl-6 pr-4 text-gray-500 whitespace-nowrap">{formatDate(event.startDate)}</td>
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-gray-900 truncate max-w-xs">{event.title}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge label={event.category} variant={COLOR_STYLES[event.color]?.badge || 'gray'} />
                      </td>
                      <td className="py-4 pr-4 text-gray-600 whitespace-nowrap">{appliesToLabel(event)}</td>
                      <td className="py-4 pr-4">
                        <Badge label={status.label} variant={status.variant} />
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center justify-end">
                          <EventRowActions event={event} onEdit={onEdit} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {events.map((event) => {
              const status = statusFor(event);
              return (
                <div key={event.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${COLOR_STYLES[event.color]?.dot || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.startDate)} • {appliesToLabel(event)}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <Badge label={event.category} variant={COLOR_STYLES[event.color]?.badge || 'gray'} />
                          <Badge label={status.label} variant={status.variant} />
                        </div>
                      </div>
                    </div>
                    <EventRowActions event={event} onEdit={onEdit} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
