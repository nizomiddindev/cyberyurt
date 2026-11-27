import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getUserLessonProgress(
  userId: string | null,
): Promise<Record<string, string[]>> {
  if (!userId) return {};

  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, task_id")
    .eq("user_id", userId);

  if (error || !data) {
    return {};
  }

  const byLesson: Record<string, string[]> = {};
  for (const row of data) {
    const lessonId = String(row.lesson_id);
    const taskId = String(row.task_id);
    if (!byLesson[lessonId]) {
      byLesson[lessonId] = [];
    }
    byLesson[lessonId].push(taskId);
  }
  return byLesson;
}
