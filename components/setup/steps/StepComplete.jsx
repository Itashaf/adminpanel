import { FiCheck } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import Button from '@/components/Button';

export default function StepComplete({ data, onGoToDashboard, onViewInDirectory }) {
  return (
    <div className="text-center py-4">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-5">
        <FiCheck className="w-8 h-8" />
      </span>

      <h2 className="text-2xl font-bold text-gray-900">Your school is ready</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
        Your school workspace has been successfully configured.
      </p>

      <div className="mt-6 bg-gray-50 rounded-2xl p-5 flex items-center justify-center gap-3">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white shadow-sm overflow-hidden shrink-0">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="School logo" className="w-full h-full object-contain p-1.5" />
          ) : (
            <FaGraduationCap className="w-5 h-5 text-violet-700" />
          )}
        </span>
        <div className="text-left">
          <p className="font-bold text-gray-900">{data.displayName || data.name}</p>
          <p className="text-xs text-gray-500">{data.sessionName}</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Button label="Go to Dashboard" onClick={onGoToDashboard} fullWidth />
        {onViewInDirectory && (
          <button
            type="button"
            onClick={onViewInDirectory}
            className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
          >
            View in Schools Directory
          </button>
        )}
      </div>
    </div>
  );
}
