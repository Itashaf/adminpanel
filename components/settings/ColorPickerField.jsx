export default function ColorPickerField({ label, value, onChange, error, defaultColor = '#4338CA' }) {
  const swatchColor = /^#([0-9A-Fa-f]{6})$/.test(value) ? value : defaultColor;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={`flex items-center gap-2 py-2 pl-2 pr-4 rounded-full border bg-white ${
          error ? 'border-red-400' : 'border-gray-200'
        }`}
      >
        <span className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 shrink-0">
          <input
            type="color"
            value={swatchColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-1 -left-1 w-10 h-10 cursor-pointer"
          />
        </span>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultColor}
          autoComplete="off"
          className="flex-1 min-w-0 text-sm text-gray-900 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
