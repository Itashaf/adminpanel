import { FiBell } from 'react-icons/fi';

export default function NoticesEmptyState({ onPostNotice }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 mb-5">
        <FiBell className="w-8 h-8" />
      </span>
      <h3 className="text-lg font-bold text-gray-900">No notices yet</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
        {onPostNotice ? 'Post your first announcement to keep the school or a class informed.' : 'Nothing has been posted yet.'}
      </p>
    </div>
  );
}
