import { Suspense } from "react";
import {
  Badge,
  Card,
  LinkButton,
  PageContainer,
  PageTitle,
  Stack,
} from "@/components/ui";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { siteConfig } from "@/config/site";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getMessages } from "@/locales";

async function HomeStatus() {
  const messages = getMessages();
  const viewer = await getCurrentViewer();

  return (
    <Card
      title={
        viewer.isGuest ? messages.home.guestLabel : messages.home.accountLabel
      }
    >
      <Stack gap="md">
        <Stack direction="row" gap="sm">
          <Badge>{viewer.username}</Badge>
          <Badge>{messages.roles[viewer.role]}</Badge>
        </Stack>

        <Stack direction="row" gap="sm">
          {viewer.isGuest ? (
            <>
              <LinkButton href="/kirish" variant="primary">
                {messages.nav.login}
              </LinkButton>
              <LinkButton href="/royxat" variant="secondary">
                {messages.nav.register}
              </LinkButton>
            </>
          ) : viewer.needsProfileSetup ? (
            <>
              <LinkButton href="/profil-sozlash" variant="primary">
                {messages.home.completeProfile}
              </LinkButton>
              <LogoutButton />
            </>
          ) : (
            <LogoutButton />
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function HomePage() {
  const messages = getMessages();

  return (
    <PageContainer narrow>
      <Stack gap="md">
        <PageTitle>{siteConfig.siteName}</PageTitle>
        <Suspense
          fallback={
            <Card>
              <Badge>{messages.auth.loading}</Badge>
            </Card>
          }
        >
          <HomeStatus />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
