import type { Lesson } from "@/lib/lessons/types";

export interface ContinueTarget {
  lessonId: string;
  title: string;
  completedTasks: number;
  totalTasks: number;
  href: string;
}

export function getContinueTarget(
  lessons: Lesson[],
  progressMap: Record<string, string[]>,
): ContinueTarget | null {
  if (lessons.length === 0) return null;

  const stats = lessons.map((lesson) => ({
    lesson,
    completedTasks: progressMap[lesson.id]?.length ?? 0,
    totalTasks: lesson.tasks.length,
  }));

  // 1. Prefer a lesson already started but not yet finished
  const inProgress = stats.find(
    (item) => item.completedTasks > 0 && item.completedTasks < item.totalTasks,
  );
  // 2. Otherwise pick the first unfinished lesson
  const nextUnfinished = stats.find(
    (item) => item.completedTasks < item.totalTasks,
  );
  // 3. Fallback to first lesson when all are done
  const chosen = inProgress ?? nextUnfinished ?? stats[0];

  return {
    lessonId: chosen.lesson.id,
    title: chosen.lesson.title,
    completedTasks: chosen.completedTasks,
    totalTasks: chosen.totalTasks,
    href: `/darslar/${chosen.lesson.id}`,
  };
}
