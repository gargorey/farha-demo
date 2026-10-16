import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from './cn';

export const inputClass = (invalid?: boolean, className?: string) =>
  cn(
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-300 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-plum-500/30 focus:border-plum-500',
    'disabled:bg-sand-100 disabled:text-ink-500',
    invalid ? 'border-coral-500 bg-coral-100/30' : 'border-ink-100 hover:border-ink-300',
    className,
  );

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optionalLabel?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, with accessible wiring. */
export function Field({ label, error, hint, required, optionalLabel, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-700">
        {label}
        {required && <span className="text-coral-600 ms-0.5" aria-hidden="true">*</span>}
        {!required && optionalLabel && <span className="ms-1.5 text-xs font-normal text-ink-500">({optionalLabel})</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="flex items-center gap-1 text-xs font-medium text-coral-600">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className, ...rest }, ref) {
    return <input ref={ref} className={inputClass(invalid ?? rest['aria-invalid'] === true, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={inputClass(invalid ?? rest['aria-invalid'] === true, cn('appearance-none bg-no-repeat pe-9 select-chevron', className))} {...rest}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...rest }, ref) {
    return <textarea ref={ref} className={inputClass(invalid ?? rest['aria-invalid'] === true, cn('min-h-24 resize-y', className))} {...rest} />;
  },
);
