import { PageContainer, PageTitle, Stack } from "@/components/ui";
import { GlossaryBrowser } from "@/components/lessons/GlossaryBrowser";
import { getAllGlossaryEntries } from "@/lib/lessons/loader";
import { getMessages } from "@/locales";

export default function GlossaryPage() {
  const messages = getMessages();
  const entries = getAllGlossaryEntries();

  return (
    <PageContainer>
      <Stack gap="md">
        <PageTitle>{messages.glossary.title}</PageTitle>
        <GlossaryBrowser entries={entries} />
      </Stack>
    </PageContainer>
  );
}
