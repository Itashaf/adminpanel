// Shared "nothing here yet" block — icon, heading, description, no card
// wrapper of its own (the caller's container supplies that, or the page's
// own white space). `flex-1` centers it in exactly whatever space the
// caller's flex column has left after its own header/filters — NOT a fixed
// vh guess, which either leaves a gap (viewport taller than the page
// needs) or forces a scrollbar (viewport shorter than the guess). The
// caller must be a `flex flex-col` with a real height (`h-full`) for this
// to have anything to grow into.
export default function EmptyState({ icon: Icon, title, description, className = '' }) {
  return (
    <div className={`flex-1 min-h-0 flex flex-col items-center justify-center text-center ${className}`}>
      {Icon && (
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 mb-4">
          <Icon className="w-7 h-7" />
        </span>
      )}
      {title && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
      {description && <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</p>}
    </div>
  );
}
