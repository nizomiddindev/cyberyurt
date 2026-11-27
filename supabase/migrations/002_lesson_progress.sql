-- Milestone 3: Lesson task progress with strict Row-Level Security (RLS)
-- Run this SQL in the Supabase Dashboard -> SQL Editor.

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  task_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id, task_id),
  constraint lesson_progress_lesson_id_format check (
    lesson_id ~ '^[a-z0-9-]+$'
  ),
  constraint lesson_progress_task_id_format check (
    task_id ~ '^[a-z0-9-]+$'
  )
);

alter table public.lesson_progress enable row level security;

drop policy if exists "Users can read own lesson progress" on public.lesson_progress;
create policy "Users can read own lesson progress"
  on public.lesson_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lesson progress" on public.lesson_progress;
create policy "Users can insert own lesson progress"
  on public.lesson_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);
