import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge, Card, PageContainer } from "@/components/ui";
import { ChallengeRunner } from "@/components/ctf/ChallengeRunner";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  getAllServerChallenges,
  getServerChallengeBySlug,
  toPublicChallengeDetail,
} from "@/lib/ctf/loader";
import { getUserCtfState } from "@/lib/ctf/progress";
import { getMessages } from "@/locales";

export function generateStaticParams() {
  return getAllServerChallenges().map((c) => ({ slug: c.slug }));
}

async function ChallengeView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = getServerChallengeBySlug(slug);
  if (!challenge) {
    notFound();
  }

  const viewer = await getCurrentViewer();
  const ctfState = await getUserCtfState(viewer.userId);
  const unlockedHints = new Set(ctfState.unlockedHints[challenge.slug] ?? []);
  const solved = Object.prototype.hasOwnProperty.call(
    ctfState.solves,
    challenge.slug,
  );
  const pointsAwarded = solved ? ctfState.solves[challenge.slug] : null;

  const publicChallenge = toPublicChallengeDetail(challenge, unlockedHints, {
    solved,
    pointsAwarded,
  });

  return (
    <ChallengeRunner
      challenge={publicChallenge}
      username={viewer.username}
      userId={viewer.userId}
      isGuest={viewer.isGuest}
    />
  );
}

export default function ChallengeDetailPage(
  props: PageProps<"/mashq/[slug]">,
) {
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
        <ChallengeView params={props.params} />
      </Suspense>
    </PageContainer>
  );
}
