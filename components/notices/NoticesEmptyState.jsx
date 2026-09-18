import { FiBell, FiPlus } from 'react-icons/fi';

export default function NoticesEmptyState({ onPostNotice }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 mb-5">
        <FiBell className="w-8 h-8" />
      </span>
      <h3 className="text-lg font-bold text-gray-900">No notices yet</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
        {onPostNotice ? 'Post your first announcement to keep the school or a class informed.' : 'Nothing has been posted yet.'}
      </p>
      {onPostNotice && (
        <button
          type="button"
          onClick={onPostNotice}
          className="inline-flex items-center justify-center gap-2 mt-6 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Post Notice
        </button>
      )}
    </div>
  );
}
