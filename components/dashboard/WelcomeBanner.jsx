'use client';

import { useState } from 'react';
import { FiX, FiCheckSquare, FiCreditCard, FiUserPlus, FiCalendar } from 'react-icons/fi';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function greetingFor(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Four at-a-glance figures rendered as glass tiles on the gradient hero.
// `value` is pre-formatted by the caller; `null` means "no backing data
// source exists yet" (see lib/dashboard.js's snapshot comment) rather than
// a real zero, so it renders as a plain dash instead of a fabricated stat.
function SnapshotTile({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3.5 min-w-0">
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 text-white shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-blue-100/80 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold text-white leading-tight truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function WelcomeBanner({ name, snapshot }) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = greetingFor(now.getHours());

  const tiles = snapshot
    ? [
        {
          icon: <FiCheckSquare className="w-4 h-4" />,
          label: "Today's Attendance",
          value: snapshot.attendancePercent != null ? `${snapshot.attendancePercent}%` : null,
        },
        {
          icon: <FiCreditCard className="w-4 h-4" />,
          label: 'Fee Collection Today',
          value: snapshot.feeCollectedToday != null ? formatCurrency(snapshot.feeCollectedToday) : null,
        },
        {
          icon: <FiUserPlus className="w-4 h-4" />,
          label: 'Pending Admissions',
          value: snapshot.pendingAdmissions,
        },
        {
          icon: <FiCalendar className="w-4 h-4" />,
          label: 'Teacher Leaves Today',
          value: snapshot.teacherLeavesToday,
        },
      ]
    : [];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-lg shadow-indigo-950/10">
      {/* Ambient glow accents — purely decorative, clipped by the card's own overflow-hidden */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl" />

      <div className="relative px-5 sm:px-7 py-6 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {greeting}, {name} 👋
            </h1>
            <p className="text-sm text-blue-100/90 mt-1">
              {today} · Here&apos;s what&apos;s happening at your school today.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer shrink-0"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {tiles.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {tiles.map((tile) => (
              <SnapshotTile key={tile.label} {...tile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
