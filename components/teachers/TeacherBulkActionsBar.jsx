import { FiDownload, FiRepeat, FiUserX } from 'react-icons/fi';

export default function TeacherBulkActionsBar({ selectedCount, onExport, onChangeStatus, onDeactivate }) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
      <span className="text-sm font-medium text-indigo-700">{selectedCount} selected</span>

      <div className="flex flex-wrap gap-2 ml-auto">
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
        >
          <FiDownload className="w-4 h-4" />
          Export
        </button>
        <button
          type="button"
          onClick={onChangeStatus}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
        >
          <FiRepeat className="w-4 h-4" />
          Change Status
        </button>
        <button
          type="button"
          onClick={onDeactivate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 transition cursor-pointer"
        >
          <FiUserX className="w-4 h-4" />
          Deactivate
        </button>
      </div>
    </div>
  );
}
