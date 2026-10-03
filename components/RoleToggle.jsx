// `icons` is optional — {OptionName: <Icon />} — used by the login screen's
// bigger, bordered variant of this toggle. Omitting it keeps the plain
// text-only pill style every other caller already relies on.
export default function RoleToggle({ role, onChange, options = ['Admin', 'Teacher'], icons }) {
  if (icons) {
    return (
      // Mobile: one row, icon-above-label tiles, compact enough that all 5
      // options fit side by side on a narrow phone. sm: and up revert to
      // the original icon-beside-label single-row pill exactly as before.
      <div className="flex gap-1 sm:gap-3">
        {options.map((option) => {
          const isActive = role === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 rounded-2xl sm:rounded-lg text-[9px] sm:text-xs font-medium border transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white border-transparent shadow-md shadow-indigo-200'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {icons[option]}
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex bg-indigo-50 rounded-lg p-1">
      {options.map((option) => {
        const isActive = role === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
