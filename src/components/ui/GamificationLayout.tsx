import Link from "next/link";
import { Award, Crown } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/gamification/queries";

export function LeaderboardTable({
  entries,
  currentUsername,
  rankLabel,
  userLabel,
  levelLabel,
  xpLabel,
  solvesLabel,
  emptyLabel,
}: {
  entries: LeaderboardEntry[];
  currentUsername?: string;
  rankLabel: string;
  userLabel: string;
  levelLabel: string;
  xpLabel: string;
  solvesLabel: string;
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-sm text-ink-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-medium text-ink-subtle">
            <th className="px-4 py-3">{rankLabel}</th>
            <th className="px-4 py-3">{userLabel}</th>
            <th className="px-4 py-3">{levelLabel}</th>
            <th className="px-4 py-3">{xpLabel}</th>
            <th className="px-4 py-3">{solvesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isSelf =
              currentUsername && entry.username === currentUsername;
            const isTop = entry.rank <= 3;
            return (
              <tr
                key={`${entry.rank}-${entry.username}`}
                style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                className={`animate-rise border-b border-line last:border-b-0 ${
                  isSelf ? "bg-accent-soft" : "hover:bg-card-hover"
                }`}
              >
                <td className="px-4 py-2 font-mono">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      isTop ? "font-semibold text-accent" : "text-ink-subtle"
                    }`}
                  >
                    {entry.rank === 1 ? <Crown size={14} aria-hidden="true" /> : null}
                    #{entry.rank}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/profil/${encodeURIComponent(entry.username)}`}
                    className={`inline-flex min-h-11 items-center font-medium underline-offset-4 hover:text-accent hover:underline ${
                      isSelf ? "text-accent" : "text-ink"
                    }`}
                  >
                    {entry.username}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-deep px-2 py-0.5 font-mono text-xs text-ink-muted">
                    {entry.level}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono font-medium text-ink">
                  {entry.xp}
                </td>
                <td className="px-4 py-2 font-mono text-ink-muted">
                  {entry.solvesCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{ animationDelay: `${index * 60}ms` }}
          className="animate-rise rounded-2xl border border-line bg-card p-4"
        >
          <dt className="text-xs font-medium text-ink-subtle">{item.label}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold text-ink">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BadgeList({
  labels,
  emptyLabel,
}: {
  labels: string[];
  emptyLabel: string;
}) {
  if (labels.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label, index) => (
        <span
          key={label}
          style={{ animationDelay: `${index * 80}ms` }}
          className="animate-pop inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-medium text-ink"
        >
          <Award size={16} aria-hidden="true" className="text-accent" />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
