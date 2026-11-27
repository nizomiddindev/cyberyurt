import Link from "next/link";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
      <p className="rounded-md border border-neutral-300 bg-white px-4 py-6 text-center text-sm text-neutral-600">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 bg-neutral-50 text-xs font-semibold text-neutral-700">
            <th className="px-3 py-3">{rankLabel}</th>
            <th className="px-3 py-3">{userLabel}</th>
            <th className="px-3 py-3">{levelLabel}</th>
            <th className="px-3 py-3">{xpLabel}</th>
            <th className="px-3 py-3">{solvesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isSelf =
              currentUsername && entry.username === currentUsername;
            return (
              <tr
                key={`${entry.rank}-${entry.username}`}
                className={`border-b border-neutral-200 last:border-b-0 ${
                  isSelf ? "bg-neutral-100 font-semibold" : "bg-white"
                }`}
              >
                <td className="px-3 py-2 font-mono text-neutral-700">
                  #{entry.rank}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/profil/${encodeURIComponent(entry.username)}`}
                    className="inline-flex min-h-11 items-center font-medium text-neutral-900 underline-offset-4 hover:underline"
                  >
                    {entry.username}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Badge>{entry.level}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-neutral-900">
                  {entry.xp}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-700">
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
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-neutral-300 bg-white p-3"
        >
          <dt className="text-xs font-medium text-neutral-600">{item.label}</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-neutral-900">
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
    return <p className="text-sm text-neutral-600">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900"
        >
          <Award size={16} aria-hidden="true" />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
