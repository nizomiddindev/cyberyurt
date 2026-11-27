import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
}

export function Input({ id, label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-11 w-full rounded-xl border bg-deep px-3 py-2 text-base text-ink placeholder:text-ink-subtle transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
          error ? "animate-shake border-bad" : "border-line hover:border-line-strong"
        }`}
        {...props}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="animate-rise text-sm font-medium text-bad"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
