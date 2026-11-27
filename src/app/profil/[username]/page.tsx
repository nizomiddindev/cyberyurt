import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Badge,
  BadgeList,
  Card,
  LinkButton,
  PageContainer,
  PageTitle,
  ProgressBar,
  Stack,
  StatGrid,
} from "@/components/ui";
import { CTF_CATEGORIES } from "@/lib/ctf/types";
import { getPublicProfileData } from "@/lib/gamification/queries";
import { getLevelProgress } from "@/lib/gamification/xp";
import { getMessages } from "@/locales";

async function PublicProfileView({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfileData(username);
  if (!profile) {
    notFound();
  }

  const messages = getMessages();
  const t = messages.profile;
  const levelProgress = getLevelProgress(profile.xp);
  const badgeLabels = profile.badges.map((id) => t.badges[id]);

  const categoryItems = CTF_CATEGORIES.map((category) => ({
    label: category,
    value: profile.categoryStats[category] ?? 0,
  }));

  return (
    <Stack gap="lg">
      <Stack direction="row" gap="sm">
        <LinkButton href="/reyting" variant="secondary">
          {messages.nav.leaderboard}
        </LinkButton>
      </Stack>

      <Stack direction="row" gap="sm">
        <PageTitle>{profile.username}</PageTitle>
        <Badge>
          {t.levelLabel} {profile.level}
        </Badge>
        <Badge>{profile.xp} XP</Badge>
      </Stack>

      <Card title={t.levelProgressTitle}>
        <Stack gap="sm">
          <Badge>
            {levelProgress.xpIntoLevel} / {levelProgress.xpForNextLevel} XP
          </Badge>
          <ProgressBar
            value={levelProgress.xpIntoLevel}
            max={levelProgress.xpForNextLevel}
            label={t.levelProgressTitle}
          />
        </Stack>
      </Card>

      <StatGrid
        items={[
          { label: t.levelLabel, value: profile.level },
          { label: t.xpLabel, value: profile.xp },
          { label: t.solvesLabel, value: profile.solvesCount },
          { label: t.badgesCountLabel, value: profile.badges.length },
        ]}
      />

      <Card title={t.badgesTitle}>
        <BadgeList labels={badgeLabels} emptyLabel={t.noBadges} />
      </Card>

      <Card title={t.statsTitle}>
        <StatGrid items={categoryItems} />
      </Card>
    </Stack>
  );
}

export default function PublicProfilePage(
  props: PageProps<"/profil/[username]">,
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
        <PublicProfileView params={props.params} />
      </Suspense>
    </PageContainer>
  );
}
