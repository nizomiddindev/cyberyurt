import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
}

export function Input({ id, label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 ${
          error ? "border-neutral-900" : "border-neutral-300"
        }`}
        {...props}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm font-medium text-neutral-900"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
