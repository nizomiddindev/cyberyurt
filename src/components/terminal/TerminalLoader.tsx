"use client";

import dynamic from "next/dynamic";
import { Badge, Card } from "@/components/ui";
import { getMessages } from "@/locales";
import type { TerminalProps } from "@/components/terminal/Terminal";

function TerminalLoadingFallback() {
  const messages = getMessages();
  return (
    <Card>
      <Badge>{messages.terminal.loading}</Badge>
    </Card>
  );
}

const DynamicTerminal = dynamic(
  () =>
    import("@/components/terminal/Terminal").then((mod) => ({
      default: mod.Terminal,
    })),
  {
    ssr: false,
    loading: () => <TerminalLoadingFallback />,
  },
);

export function TerminalLoader(props: TerminalProps) {
  return <DynamicTerminal {...props} />;
}
