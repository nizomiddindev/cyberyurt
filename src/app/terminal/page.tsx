import { Suspense } from "react";
import { Badge, Card, PageContainer, PageTitle, Stack } from "@/components/ui";
import { TerminalLoader } from "@/components/terminal/TerminalLoader";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getMessages } from "@/locales";

async function TerminalWorkspace() {
  const viewer = await getCurrentViewer();
  return (
    <TerminalLoader
      username={viewer.username}
      userId={viewer.userId}
      isGuest={viewer.isGuest}
    />
  );
}

export default function TerminalPage() {
  const messages = getMessages();

  return (
    <PageContainer>
      <Stack gap="md">
        <PageTitle>{messages.terminal.title}</PageTitle>
        <Suspense
          fallback={
            <Card>
              <Badge>{messages.terminal.loading}</Badge>
            </Card>
          }
        >
          <TerminalWorkspace />
        </Suspense>
      </Stack>
    </PageContainer>
  );
}
