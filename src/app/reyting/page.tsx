import { Suspense } from "react";
import {
  Badge,
  Card,
  LeaderboardTable,
  PageContainer,
  PageTitle,
  Stack,
  Tabs,
} from "@/components/ui";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  getLeaderboardOverall,
  getLeaderboardWeekly,
} from "@/lib/gamification/queries";
import { getMessages } from "@/locales";

async function LeaderboardContent() {
  const messages = getMessages();
  const t = messages.leaderboard;
  const viewer = await getCurrentViewer();

  // "Sinfim" (class) tab removed for the pilot: no classes yet (see DECISIONS.md).
  const [overall, weekly] = await Promise.all([
    getLeaderboardOverall(50),
    getLeaderboardWeekly(50),
  ]);

  const tableLabels = {
    currentUsername: viewer.isGuest ? undefined : viewer.username,
    rankLabel: t.colRank,
    userLabel: t.colUser,
    levelLabel: t.colLevel,
    xpLabel: t.colXp,
    solvesLabel: t.colSolves,
    emptyLabel: t.empty,
  };

  return (
    <Tabs
      defaultTabId="umumiy"
      items={[
        {
          id: "umumiy",
          label: t.tabOverall,
          content: <LeaderboardTable entries={overall} {...tableLabels} />,
        },
        {
          id: "haftalik",
          label: t.tabWeekly,
          content: <LeaderboardTable entries={weekly} {...tableLabels} />,
        },
      ]}
    />
  );
}

export default function LeaderboardPage() {
  const messages = getMessages();

  return (
    <PageContainer>
      <Stack gap="md">
        <PageTitle>{messages.leaderboard.title}</PageTitle>
        <Suspense
          fallback={
            <Card>
              <Badge>{messages.auth.loading}</Badge>
            </Card>
          }
        >
          <LeaderboardContent />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
