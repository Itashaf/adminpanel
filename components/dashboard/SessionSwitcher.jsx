'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import Toast from '@/components/Toast';
import SetActiveDialog from '@/components/sessions/SetActiveDialog';

// The Topbar's academic-session pill, now a real switcher — previously just
// displayed `activeSession.name` as static text. Picking a different session
// reuses SetActiveDialog (the same confirm-before-switching flow the
// Academic Sessions management page already uses for this exact action, see
// components/sessions/SessionCard.jsx) rather than switching instantly on
// selection, since "which session is active" affects the whole school
// system, not just this one dropdown.
export default function SessionSwitcher({ sessions, activeSession, canSwitch = true }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeSession) return null;

  // A Teacher can see which session is active but never switch it — that's
  // a school-wide admin action, same "won't be able to manage anything"
  // restriction applied everywhere else in the app for this role.
  if (!canSwitch) {
    return (
      <span className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1.5 shrink-0">
        <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
        {activeSession.name}
      </span>
    );
  }

  return (
    <div className="relative hidden lg:block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-1.5 shrink-0 cursor-pointer transition"
      >
        <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
        {activeSession.name}
        <FiChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && sessions.length > 0 && (
        <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-2">
            {sessions.map((session) => {
              const isSelected = session.id === activeSession.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (!isSelected) setPendingSession(session);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left cursor-pointer transition ${
                    isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {session.name}
                  {isSelected && <span className="text-xs text-gray-400 shrink-0">Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <SetActiveDialog
        isOpen={Boolean(pendingSession)}
        onClose={() => setPendingSession(null)}
        session={pendingSession}
        currentActiveSession={activeSession}
        onSuccess={(message) => {
          setPendingSession(null);
          setToastMessage(message);
          router.refresh();
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
