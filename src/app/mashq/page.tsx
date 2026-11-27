import { Suspense } from "react";
import { Badge, Card, PageContainer, PageTitle, Stack } from "@/components/ui";
import { ChallengeList } from "@/components/ctf/ChallengeList";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getAllServerChallenges } from "@/lib/ctf/loader";
import { getUserCtfState } from "@/lib/ctf/progress";
import {
  CTF_CATEGORIES,
  type CtfCategory,
  type PublicChallengeSummary,
} from "@/lib/ctf/types";
import { getMessages } from "@/locales";

function parseCategoryParam(
  raw: string | string[] | undefined,
): CtfCategory | "all" {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (val && (CTF_CATEGORIES as readonly string[]).includes(val)) {
    return val as CtfCategory;
  }
  return "all";
}

async function PracticeCatalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [viewer, resolvedParams] = await Promise.all([
    getCurrentViewer(),
    searchParams,
  ]);
  const serverChallenges = getAllServerChallenges();
  const ctfState = await getUserCtfState(viewer.userId);
  const initialCategory = parseCategoryParam(resolvedParams.kategoriya);

  const summaries: PublicChallengeSummary[] = serverChallenges.map((c) => ({
    slug: c.slug,
    title: c.title,
    category: c.category,
    difficulty: c.difficulty,
    points: c.points,
    solved: Object.prototype.hasOwnProperty.call(ctfState.solves, c.slug),
  }));

  return (
    <ChallengeList
      challenges={summaries}
      initialCategory={initialCategory}
    />
  );
}

export default function PracticePage(props: PageProps<"/mashq">) {
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
          <PracticeCatalog searchParams={props.searchParams} />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
