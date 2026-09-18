import { FiCheck } from 'react-icons/fi';

const STEPS = ['School Information', 'Contact & Address', 'Branding', 'Academic Session'];

export default function WizardProgress({ currentStep }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-semibold shrink-0 transition ${
                  isComplete || isCurrent
                    ? 'bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? <FiCheck className="w-4 h-4" /> : stepNumber}
              </span>
              <span
                className={`hidden sm:block text-[11px] font-medium text-center max-w-[80px] leading-tight ${
                  isCurrent ? 'text-indigo-700' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {stepNumber < STEPS.length && (
              <span className={`flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full ${isComplete ? 'bg-gradient-to-r from-violet-700 to-blue-600' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
