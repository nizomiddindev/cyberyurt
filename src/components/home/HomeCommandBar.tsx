"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CommandBar } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { resolveCommandBarNavigation } from "@/lib/home/command-bar";
import { getMessages } from "@/locales";

export function HomeCommandBar({ username }: { username: string }) {
  const router = useRouter();
  const messages = getMessages();
  const t = messages.home;

  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = resolveCommandBarNavigation(input);
    if (!action) return;

    if (action.kind === "navigate") {
      setFeedback(null);
      setInput("");
      router.push(action.href);
      return;
    }

    if (action.kind === "list") {
      setFeedback(action.items.join("  "));
      return;
    }

    setFeedback(`${t.commandUnknown}: ${action.target}`);
  }

  return (
    <CommandBar
      prompt={`${username}@${siteConfig.terminalHost}:~$`}
      value={input}
      placeholder={t.commandPlaceholder}
      ariaLabel={t.commandAriaLabel}
      submitLabel={t.commandRun}
      feedback={feedback}
      onChange={setInput}
      onSubmit={handleSubmit}
    />
  );
}
