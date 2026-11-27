export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
