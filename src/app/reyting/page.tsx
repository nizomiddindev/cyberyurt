import { Suspense } from "react";
import {
  Badge,
  Card,
  LeaderboardTable,
  LinkButton,
  Notice,
  PageContainer,
  PageTitle,
  Stack,
  Tabs,
} from "@/components/ui";
import { getCurrentViewer } from "@/lib/auth/viewer";
import {
  getLeaderboardClass,
  getLeaderboardOverall,
  getLeaderboardWeekly,
} from "@/lib/gamification/queries";
import { getMessages } from "@/locales";

async function LeaderboardContent() {
  const messages = getMessages();
  const t = messages.leaderboard;
  const viewer = await getCurrentViewer();

  const [overall, weekly, classmates] = await Promise.all([
    getLeaderboardOverall(50),
    getLeaderboardWeekly(50),
    viewer.isGuest ? Promise.resolve([]) : getLeaderboardClass(50),
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

  const classPanel = viewer.isGuest ? (
    <Stack gap="sm">
      <Notice>{t.classLoginRequired}</Notice>
      <Stack direction="row" gap="sm">
        <LinkButton href="/kirish" variant="primary">
          {messages.nav.login}
        </LinkButton>
      </Stack>
    </Stack>
  ) : !viewer.hasClass ? (
    <Notice>{t.classNotAssigned}</Notice>
  ) : (
    <LeaderboardTable entries={classmates} {...tableLabels} />
  );

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
        {
          id: "sinfim",
          label: t.tabClass,
          content: classPanel,
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
