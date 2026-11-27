import { Suspense } from "react";
import { Badge, Card, PageContainer, PageTitle, Stack } from "@/components/ui";
import { ChallengeList } from "@/components/ctf/ChallengeList";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getAllServerChallenges } from "@/lib/ctf/loader";
import { getUserCtfState } from "@/lib/ctf/progress";
import type { PublicChallengeSummary } from "@/lib/ctf/types";
import { getMessages } from "@/locales";

async function PracticeCatalog() {
  const viewer = await getCurrentViewer();
  const serverChallenges = getAllServerChallenges();
  const ctfState = await getUserCtfState(viewer.userId);

  const summaries: PublicChallengeSummary[] = serverChallenges.map((c) => ({
    slug: c.slug,
    title: c.title,
    category: c.category,
    difficulty: c.difficulty,
    points: c.points,
    solved: Object.prototype.hasOwnProperty.call(ctfState.solves, c.slug),
  }));

  return <ChallengeList challenges={summaries} />;
}

export default function PracticePage() {
  const messages = getMessages();

  return (
    <PageContainer>
      <Stack gap="md">
        <PageTitle>{messages.ctf.title}</PageTitle>
        <Suspense
          fallback={
            <Card>
              <Badge>{messages.auth.loading}</Badge>
            </Card>
          }
        >
          <PracticeCatalog />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
