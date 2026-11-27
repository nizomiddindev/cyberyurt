import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge, Card, PageContainer } from "@/components/ui";
import { LessonRunner } from "@/components/lessons/LessonRunner";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  getAllLessons,
  getGlossaryMap,
  getLessonById,
} from "@/lib/lessons/loader";
import { getUserLessonProgress } from "@/lib/lessons/progress";
import { getMessages } from "@/locales";

export function generateStaticParams() {
  return getAllLessons().map((lesson) => ({ slug: lesson.id }));
}

async function LessonView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLessonById(slug);
  if (!lesson) {
    notFound();
  }

  const viewer = await getCurrentViewer();
  const glossary = getGlossaryMap();
  const progressMap = await getUserLessonProgress(viewer.userId);
  const allLessons = getAllLessons();

  const prerequisites = lesson.prerequisites
    .map((prereqId) => {
      const target = allLessons.find((l) => l.id === prereqId);
      if (!target) return null;
      const doneCount = progressMap[prereqId]?.length ?? 0;
      const done = target.tasks.length > 0 && doneCount >= target.tasks.length;
      return { id: target.id, title: target.title, done };
    })
    .filter((item): item is { id: string; title: string; done: boolean } =>
      Boolean(item),
    );

  return (
    <LessonRunner
      lesson={lesson}
      glossary={glossary}
      prerequisites={prerequisites}
      initialCompletedTaskIds={progressMap[lesson.id] ?? []}
      username={viewer.username}
      userId={viewer.userId}
      isGuest={viewer.isGuest}
    />
  );
}

export default function LessonDetailPage(props: PageProps<"/darslar/[slug]">) {
  const messages = getMessages();

  return (
    <PageContainer>
      <Suspense
        fallback={
          <Card>
            <Badge>{messages.auth.loading}</Badge>
          </Card>
        }
      >
        <LessonView params={props.params} />
      </Suspense>
    </PageContainer>
  );
}
