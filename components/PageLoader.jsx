import { FiLoader } from 'react-icons/fi';

// One reusable full-page loading state — used as the `loading.jsx` fallback
// for routes that don't have a bespoke skeleton (see app/dashboard/classes,
// homework, notices, sessions for the custom-skeleton alternative; use
// that pattern instead of this one when a page's layout is stable enough
// to be worth mimicking exactly). Also reusable inline wherever a client
// component needs the same look for a client-side fetch (e.g.
// StudentsExplorer.jsx refetching a page — pass `fullScreen={false}` and
// position it with a wrapping `relative`/`absolute` container there).
export default function PageLoader({ label = 'Loading...', fullScreen = true }) {
  return (
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm'
          : 'flex flex-col items-center justify-center gap-3 py-20'
      }
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 shadow-sm">
        <FiLoader className="w-6 h-6 text-white animate-spin" />
      </span>
      {label && <p className="text-sm font-medium text-gray-500">{label}</p>}
    </div>
  );
}
