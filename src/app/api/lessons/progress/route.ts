import { NextResponse } from "next/server";
import { getLessonById } from "@/lib/lessons/loader";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { lessonId?: unknown; taskId?: unknown };
  try {
    body = (await request.json()) as { lessonId?: unknown; taskId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";

  const lesson = getLessonById(lessonId);
  if (!lesson || !lesson.tasks.some((task) => task.id === taskId)) {
    return NextResponse.json({ error: "Unknown lesson or task" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ saved: false, guest: true });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ saved: false, guest: true });
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      task_id: taskId,
    },
    { onConflict: "user_id,lesson_id,task_id", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
