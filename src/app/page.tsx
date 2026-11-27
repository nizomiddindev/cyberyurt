import { Suspense, type ReactNode } from "react";
import {
  Cpu,
  Eye,
  Fish,
  Globe,
  KeyRound,
  Network,
  Search,
  Terminal as TerminalIcon,
} from "lucide-react";
import {
  Badge,
  Card,
  ContinueCard,
  LinkButton,
  PageContainer,
  PageTitle,
  Stack,
  Tile,
  TileGrid,
} from "@/components/ui";
import { HomeCommandBar } from "@/components/home/HomeCommandBar";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { CTF_CATEGORIES, type CtfCategory } from "@/lib/ctf/types";
import { getContinueTarget } from "@/lib/home/continue";
import { getAllLessons } from "@/lib/lessons/loader";
import { getUserLessonProgress } from "@/lib/lessons/progress";
import { getMessages } from "@/locales";

const CATEGORY_ICONS: Record<CtfCategory, ReactNode> = {
  Kriptografiya: <KeyRound size={20} />,
  Forensika: <Search size={20} />,
  Veb: <Globe size={20} />,
  Linux: <TerminalIcon size={20} />,
  OSINT: <Eye size={20} />,
  Tarmoq: <Network size={20} />,
  Reverse: <Cpu size={20} />,
  Fishing: <Fish size={20} />,
};

async function HomeContent() {
  const messages = getMessages();
  const t = messages.home;
  const viewer = await getCurrentViewer();
  const lessons = getAllLessons();
  const progressMap = await getUserLessonProgress(viewer.userId);
  const continueTarget = getContinueTarget(lessons, progressMap);

  return (
    <Stack gap="lg">
      <Stack direction="row" gap="sm">
        <PageTitle>
          {t.greeting}, {viewer.username}
        </PageTitle>
        <Badge>{messages.roles[viewer.role]}</Badge>
      </Stack>

      {viewer.isGuest ? (
        <Stack direction="row" gap="sm">
          <LinkButton href="/kirish" variant="primary">
            {messages.nav.login}
          </LinkButton>
          <LinkButton href="/royxat" variant="secondary">
            {messages.nav.register}
          </LinkButton>
        </Stack>
      ) : viewer.needsProfileSetup ? (
        <Stack direction="row" gap="sm">
          <LinkButton href="/profil-sozlash" variant="primary">
            {t.completeProfile}
          </LinkButton>
        </Stack>
      ) : null}

      <HomeCommandBar username={viewer.username} />

      {continueTarget ? (
        <ContinueCard
          sectionTitle={t.continueTitle}
          lessonTitle={continueTarget.title}
          completedTasks={continueTarget.completedTasks}
          totalTasks={continueTarget.totalTasks}
          buttonLabel={t.continueButton}
          href={continueTarget.href}
        />
      ) : null}

      <TileGrid>
        {CTF_CATEGORIES.map((category) => (
          <Tile
            key={category}
            name={category}
            icon={CATEGORY_ICONS[category]}
            href={`/mashq?kategoriya=${encodeURIComponent(category)}`}
          />
        ))}
      </TileGrid>
    </Stack>
  );
}

export default function HomePage() {
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
        <HomeContent />
      </Suspense>
    </PageContainer>
  );
}
