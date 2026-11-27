import { Suspense } from "react";
import {
  Badge,
  Card,
  LessonLinkRow,
  PageContainer,
  PageTitle,
  ProgressBar,
  Stack,
} from "@/components/ui";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getLessonHierarchy } from "@/lib/lessons/loader";
import { getUserLessonProgress } from "@/lib/lessons/progress";
import { getMessages } from "@/locales";

async function LessonsCatalog() {
  const messages = getMessages();
  const t = messages.lessons;
  const viewer = await getCurrentViewer();
  const hierarchy = getLessonHierarchy();
  const progressMap = await getUserLessonProgress(viewer.userId);

  return (
    <Stack gap="lg">
      {hierarchy.map((pathGroup) => {
        const pathLessons = pathGroup.modules.flatMap((m) => m.lessons);
        const totalTasks = pathLessons.reduce(
          (sum, l) => sum + l.tasks.length,
          0,
        );
        const doneTasks = pathLessons.reduce(
          (sum, l) => sum + (progressMap[l.id]?.length ?? 0),
          0,
        );

        return (
          <Card key={pathGroup.id} title={pathGroup.title}>
            <Stack gap="md">
              <ProgressBar
                value={doneTasks}
                max={totalTasks || 1}
                label={pathGroup.title}
              />

              {pathGroup.modules.map((mod) => (
                <Stack key={mod.id} gap="sm">
                  <Badge>{mod.title}</Badge>
                  {mod.lessons.map((lesson) => {
                    const completedCount = progressMap[lesson.id]?.length ?? 0;
                    const total = lesson.tasks.length;
                    const done = total > 0 && completedCount >= total;
                    return (
                      <LessonLinkRow
                        key={lesson.id}
                        href={`/darslar/${lesson.id}`}
                        title={lesson.title}
                        done={done}
                        statusLabel={
                          done ? t.done : `${completedCount}/${total}`
                        }
                      />
                    );
                  })}
                </Stack>
              ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

export default function LessonsPage() {
  const messages = getMessages();

  return (
    <PageContainer>
      <Stack gap="md">
        <PageTitle>{messages.lessons.title}</PageTitle>
        <Suspense
          fallback={
            <Card>
              <Badge>{messages.auth.loading}</Badge>
            </Card>
          }
        >
          <LessonsCatalog />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
