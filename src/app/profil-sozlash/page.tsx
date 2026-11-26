import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge, Card, PageContainer } from "@/components/ui";
import { ProfileSetupForm } from "@/components/auth/ProfileSetupForm";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getMessages } from "@/locales";

async function ProfileSetupGate() {
  const viewer = await getCurrentViewer();

  if (viewer.isGuest || !viewer.userId) {
    redirect("/kirish");
  }

  if (!viewer.needsProfileSetup) {
    redirect("/");
  }

  return <ProfileSetupForm userId={viewer.userId} />;
}

export default function ProfileSetupPage() {
  const messages = getMessages();

  return (
    <PageContainer narrow>
      <Suspense
        fallback={
          <Card>
            <Badge>{messages.auth.loading}</Badge>
          </Card>
        }
      >
        <ProfileSetupGate />
      </Suspense>
    </PageContainer>
  );
}
