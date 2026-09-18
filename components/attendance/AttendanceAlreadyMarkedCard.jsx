'use client';

import { useState } from 'react';
import { FiCheckCircle, FiEdit2, FiUser, FiClock, FiLock, FiUnlock } from 'react-icons/fi';
import { setAttendanceLock } from '@/lib/api';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function AttendanceAlreadyMarkedCard({ record, className, sectionName, onEdit, access, teacherAccess, isAdmin, onLockChange }) {
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const isLockedForViewer = !access.allowed;
  const isLockedForTeacher = !teacherAccess.allowed;

  const handleToggleLock = async () => {
    setIsUpdatingLock(true);
    try {
      await setAttendanceLock(record.id, !record.manuallyUnlocked);
      onLockChange?.();
    } finally {
      setIsUpdatingLock(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
        <FiCheckCircle className="w-7 h-7" />
      </span>
      <h3 className="text-xl font-bold text-gray-900">Attendance Already Marked</h3>
      <p className="text-sm text-gray-500 mt-1.5">{formatDate(record.date)}</p>
      <p className="text-sm text-gray-500">
        {className} • Section {sectionName}
      </p>

      <div className="flex items-center justify-center flex-wrap gap-4 mt-5 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <FiUser className="w-3.5 h-3.5 text-gray-400" />
          Marked by <span className="font-semibold text-gray-700">{record.markedBy}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <FiClock className="w-3.5 h-3.5 text-gray-400" />
          {formatTime(record.markedAt)}
        </span>
      </div>

      {isLockedForViewer ? (
        <div className="mt-6 max-w-sm mx-auto bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-700">
            <FiLock className="w-4 h-4" />
            Editing Locked
          </p>
          <p className="text-xs text-amber-600 mt-1">{access.reason}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 mt-6 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiEdit2 className="w-4 h-4" />
          Edit Attendance
        </button>
      )}

      {isAdmin && (isLockedForTeacher || record.manuallyUnlocked) && (
        <div className="mt-4 pt-4 border-t border-gray-100 max-w-sm mx-auto">
          <p className="text-xs text-gray-400 mb-2">
            {record.manuallyUnlocked
              ? "You've unlocked this for teacher editing."
              : "This record's edit window has closed for the teacher who marked it."}
          </p>
          <button
            type="button"
            onClick={handleToggleLock}
            disabled={isUpdatingLock}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer disabled:opacity-60"
          >
            {record.manuallyUnlocked ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
            {isUpdatingLock ? 'Updating...' : record.manuallyUnlocked ? 'Re-lock for Teacher' : 'Unlock for Teacher'}
          </button>
        </div>
      )}
    </div>
  );
}
