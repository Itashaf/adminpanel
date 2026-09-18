import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  { type = 'text', placeholder, icon, endAdornment, error, onWheel, ...rest },
  ref
) {
  // A number input's native up/down spinner and its scroll-to-change-value
  // behavior are both surprising in a form context (an accidental scroll
  // while the field happens to be focused silently changes the value) — off
  // by default for every "number" field in the app, not just this one.
  const isNumber = type === 'number';
  // Unique per instance (not a shared literal id) — this component renders
  // many times on one page (every field in every form), and duplicate
  // `id`s would be invalid HTML.
  const datalistId = `no-suggestions-${useId()}`;

  return (
    <div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          autoComplete="off"
          // `autoComplete="off"` alone doesn't stop Chrome/Edge from showing
          // their own saved-value/address suggestions on fields they
          // heuristically recognize (email, name, address, ...) — pointing
          // the input at an empty <datalist> is the reliable cross-browser
          // way to suppress that native dropdown, since the browser defers
          // to the (empty) datalist's suggestion UI instead.
          list={datalistId}
          onWheel={isNumber ? (onWheel ?? ((e) => e.target.blur())) : onWheel}
          className={`w-full py-2.5 border rounded-full focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-200 focus:ring-indigo-500'
          } ${icon ? 'pl-10' : 'pl-4'} ${endAdornment ? 'pr-10' : 'pr-4'} ${
            isNumber ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
          }`}
          {...rest}
        />
        <datalist id={datalistId}></datalist>
        {endAdornment && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {endAdornment}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

export default Input;
