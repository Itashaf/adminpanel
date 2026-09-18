export default function Button({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  disabled = false,
  // Lets a submit button live outside its <form> element (e.g. in a modal's
  // sticky footer, rendered separately from the scrollable form body) while
  // still submitting it — the native HTML `form` attribute, by id.
  form,
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white hover:opacity-90',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50',
  };
  const sizes = {
    md: 'px-4 py-2.5',
    sm: 'px-3 py-1.5 text-xs',
  };

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2 ${sizes[size]} rounded-lg font-medium transition cursor-pointer disabled:cursor-not-allowed ${
        disabled ? 'bg-gray-100 text-gray-400 opacity-70' : variants[variant]
      }`}
    >
      {label}
      {icon}
    </button>
  );
}
